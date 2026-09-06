#!/usr/bin/env node
// Runs color-buddy's prebuilt palette lints (McNutt et al.) over a palette.
// The rules are the library's own; nothing here authors a rule. See readme.md.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const BUNDLE = "color-buddy-palette-lint/dist/color-buddy-palette-lint.js";

// color-buddy-palette-lint@0.0.8 publishes only `dist`, but its `exports` map
// points at `src/main.ts`, so neither the bare specifier nor a subpath
// resolves. Find the built bundle on disk instead.
function resolveBundle() {
  let dir = import.meta.dirname;
  for (;;) {
    const candidate = join(dir, "node_modules", BUNDLE);
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`cannot find ${BUNDLE}; run \`npm install\` in the repo root`);
}

const { linter, PREBUILT_LINTS } = await import(resolveBundle());

// The bundle inlines its own copy of color-buddy-palette and of colorjs.io, so
// colors built by the separately installed color-buddy-palette belong to a
// different color-space registry: two rules then throw instead of running.
// Recover the bundled Color class from a rule's own test fixtures.
const Color = PREBUILT_LINTS.flatMap((lint) => lint.expectedPassingTests ?? [])
  .flatMap((pal) => pal.colors ?? [])
  .at(0)?.constructor;
if (!Color) throw new Error("no color-buddy Color class found in PREBUILT_LINTS");

const makePalette = (hexes, background, colorSpace) => ({
  name: "palette",
  folder: "",
  type: "categorical",
  tags: [],
  evalConfig: {},
  colorSpace,
  // Not Color.colorFromHex: that memoizes on the hex alone and ignores the
  // color space on any later call for the same hex.
  background: Color.colorFromString(background, colorSpace),
  colors: hexes.map((hex) => Color.colorFromString(hex, colorSpace)),
});

// The linter reports "not applicable" and "the program threw" both as
// `kind: "invalid"`, so re-derive applicability to tell them apart.
const skipReason = (lint, palette) => {
  if (!lint.taskTypes.includes(palette.type)) {
    return `applies only to ${lint.taskTypes.join("/")} palettes`;
  }
  if (lint.requiredTags.length && !lint.requiredTags.some((t) => palette.tags.includes(t))) {
    return `requires the tag ${lint.requiredTags.join(" or ")}`;
  }
  return null;
};

const blameHexes = ({ blameData }, hexes) =>
  (blameData ?? []).map((b) => (Array.isArray(b) ? b.map((i) => hexes[i]) : hexes[b]));

/**
 * Lint a palette with color-buddy's prebuilt rules.
 * @param {string[]} hexes palette colors, as strings any CSS color parser takes
 * @param {{background?: string, colorSpace?: string}} [options]
 * @returns {{colors: string[], background: string, colorSpace: string,
 *   passed: object[], failed: object[], skipped: object[], errored: object[],
 *   counts: {total: number, passed: number, failed: number, skipped: number, errored: number}}}
 */
export function lintPalette(hexes, { background = "#ffffff", colorSpace = "lab" } = {}) {
  const palette = makePalette(hexes, background, colorSpace);
  const results = linter(palette, PREBUILT_LINTS, { computeBlame: true, computeMessage: true });

  const passed = [];
  const failed = [];
  const skipped = [];
  const errored = [];
  for (const result of results) {
    const { id, name, level, group, description } = result.lintProgram;
    const check = { id, name, level, group };
    if (result.kind === "success" && result.passes) {
      passed.push(check);
    } else if (result.kind === "success") {
      failed.push({ ...check, description, message: result.message, blame: blameHexes(result, hexes) });
    } else {
      const reason = skipReason(result.lintProgram, palette);
      if (reason) skipped.push({ ...check, reason });
      else errored.push(check);
    }
  }

  return {
    colors: [...hexes],
    background,
    colorSpace,
    passed,
    failed,
    skipped,
    errored,
    counts: {
      total: results.length,
      passed: passed.length,
      failed: failed.length,
      skipped: skipped.length,
      errored: errored.length,
    },
  };
}

function report(label, result) {
  const { counts } = result;
  const lines = [
    `${label}: ${result.colors.length} colors on ${result.background} in ${result.colorSpace}`,
    `  ${result.colors.join(" ")}`,
    `  ${counts.passed} passed, ${counts.failed} failed` +
      `, ${counts.skipped} not applicable` +
      (counts.errored ? `, ${counts.errored} errored` : "") +
      ` (${counts.total} rules)`,
  ];
  for (const check of result.failed) {
    lines.push(`  FAIL [${check.level}] ${check.name.trim()} (${check.id})`);
    // The rule messages already name the colors they blame; `blame` stays in
    // the structured result rather than being printed twice.
    lines.push(`    ${check.message.replace(/\s+/g, " ").trim()}`);
  }
  if (result.passed.length) {
    lines.push(`  passed: ${result.passed.map((c) => c.id).join(", ")}`);
  }
  if (result.errored.length) {
    lines.push(`  errored: ${result.errored.map((c) => c.id).join(", ")}`);
  }
  return lines.join("\n");
}

const USAGE = `usage: lint.js [--background <color>] [--space <name>] [--json] [<color> ...]
       lint.js [flags] < palettes.json`;

// Accepts ["#aaa", ...], [["#aaa", ...], ...], or [{name, colors, background}, ...].
function parsePalettes(json) {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("expected a JSON array of palettes");
  if (!parsed.length) throw new Error("no palettes on stdin");
  if (parsed.every((entry) => typeof entry === "string")) return [{ name: "palette", colors: parsed }];
  return parsed.map((entry, i) => {
    const named = Array.isArray(entry) ? { colors: entry } : entry;
    return { name: named.name ?? `palette ${i + 1}`, ...named };
  });
}

async function main(argv) {
  const options = {};
  const colors = [];
  let asJson = false;
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s);
    const value = () => inline ?? argv[++i];
    if (flag === "--json") asJson = true;
    else if (flag === "--background") options.background = value();
    else if (flag === "--space") options.colorSpace = value();
    else if (flag.startsWith("--")) throw new Error(`unknown flag ${flag}\n${USAGE}`);
    else colors.push(argv[i]);
  }

  const palettes = colors.length
    ? [{ name: "palette", colors }]
    : parsePalettes(readFileSync(0, "utf8"));

  const results = palettes.map((palette) => ({
    name: palette.name,
    ...lintPalette(palette.colors, { ...options, ...(palette.background && { background: palette.background }) }),
  }));

  console.log(
    asJson
      ? JSON.stringify(results, null, 2)
      : results.map((result) => report(result.name, result)).join("\n\n"),
  );
  // Exit non-zero when an error-level rule fails, the way a linter should.
  return results.some((r) => r.failed.some((c) => c.level === "error")) ? 1 : 0;
}

if (process.argv[1] === import.meta.filename) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
