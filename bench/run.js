// Benchmark harness: scores palettes this library generates against
// established categorical palettes on the same measurements.
//
//   node bench/run.js                          # defaults
//   node bench/run.js --colors 10 --trials 20
//   node bench/run.js --format json -o results.json
//
// Annealing is stochastic, so generated palettes are run `--trials` times and
// reported as mean ± sd. Math.random is replaced with a seeded generator for
// the duration of the run, which makes a given --seed reproduce exactly.

import fs from 'node:fs';
import {
    createDefaultConfig,
    createDefaultState,
    palettes,
    prepareInitialState,
    runWithOrderOptimization,
    similarity,
} from '../src/index.js';
import { CVD_CONDITIONS, aggregate, scorePalette } from './metrics.js';

// ── Seeded randomness ───────────────────────────────────────────────────────

// mulberry32: small, fast, and good enough for reproducing a search path.
const mulberry32 = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const withSeed = (seed, fn) => {
    const original = Math.random;
    Math.random = mulberry32(seed);
    try {
        return fn();
    } finally {
        Math.random = original;
    }
};

// ── Options ─────────────────────────────────────────────────────────────────

const parseArgs = (argv) => {
    const options = { colors: 8, trials: 10, seed: 1, format: 'text', output: null };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        // Validated at the boundary: without this a bare `--colors` becomes
        // Number(undefined) and surfaces as a NaN failure deep in the optimizer,
        // with a stack that never mentions the flag.
        const next = (name) => {
            if (i + 1 >= argv.length) {
                throw new Error(`Missing value for ${name}.`);
            }
            return argv[++i];
        };
        const nextInt = (name, { min }) => {
            const raw = next(name);
            const value = Number(raw);
            if (!Number.isInteger(value) || value < min) {
                throw new Error(`${name} must be an integer >= ${min}; received "${raw}".`);
            }
            return value;
        };

        if (arg === '--colors' || arg === '-n') options.colors = nextInt(arg, { min: 2 });
        else if (arg === '--trials' || arg === '-t') options.trials = nextInt(arg, { min: 1 });
        else if (arg === '--seed' || arg === '-s') options.seed = nextInt(arg, { min: 0 });
        else if (arg === '--format' || arg === '-f') {
            options.format = next(arg);
            if (options.format !== 'text' && options.format !== 'json') {
                throw new Error(`--format must be text or json; received "${options.format}".`);
            }
        } else if (arg === '--output' || arg === '-o') options.output = next(arg);
        else if (arg === '--help' || arg === '-h') options.help = true;
        else throw new Error(`Unknown option: ${arg}`);
    }
    return options;
};

const USAGE = `Usage: node bench/run.js [options]

  -n, --colors <n>   Palette size to compare at (default 8)
  -t, --trials <n>   Generated palettes to sample (default 10)
  -s, --seed <n>     Base seed; trial i uses seed + i (default 1)
  -f, --format <t>   text (default) or json
  -o, --output <p>   Write to a file instead of stdout
`;

// ── Runs ────────────────────────────────────────────────────────────────────

const generateOne = (colorCount, seed) =>
    withSeed(seed, () => {
        const config = createDefaultConfig();
        config.colorCount = colorCount;
        config.logProgress = false;
        // The default config pulls the palette toward similarityTarget. Left in,
        // this would measure how well the optimizer reproduces that particular
        // reference rather than how distinguishable a palette it can find.
        config.similarityTarget = [];
        config.evalFunctions = config.evalFunctions.filter(
            (entry) => entry.function !== similarity
        );

        const state = createDefaultState();
        state.colors = [];
        const initial = prepareInitialState(state, config);
        const final = runWithOrderOptimization(initial, config);
        return final.colors.map(String);
    });

const referencePalettes = (colorCount) =>
    Object.entries(palettes)
        .filter(([, colors]) => colors.length >= colorCount)
        .map(([name, colors]) => ({
            name,
            // Truncating rather than sampling: these palettes are published in
            // a specific order, and users take the first n.
            colors: colors.slice(0, colorCount).map(String),
            truncatedFrom: colors.length > colorCount ? colors.length : null,
        }));

const run = (options) => {
    const { colors: colorCount, trials, seed } = options;

    // Checked before any annealing: the reference set is what gives the numbers
    // meaning, and discovering it is empty after a multi-minute run would throw
    // that work away.
    const available = referencePalettes(colorCount);
    if (available.length === 0) {
        const largest = Math.max(...Object.values(palettes).map((p) => p.length));
        throw new Error(
            `No reference palette has ${colorCount} colors; the largest has ${largest}. ` +
            `Re-run with --colors ${largest} or fewer.`
        );
    }

    const generated = [];
    for (let i = 0; i < trials; i += 1) {
        const palette = generateOne(colorCount, seed + i);
        generated.push({ seed: seed + i, colors: palette, score: scorePalette(palette) });
    }

    const references = available.map((entry) => ({
        ...entry,
        score: scorePalette(entry.colors),
    }));

    const scores = generated.map((g) => g.score);
    const best = generated.reduce((a, b) => (b.score.minDeltaE > a.score.minDeltaE ? b : a));

    return {
        options: { colorCount, trials, seed },
        generated: {
            minDeltaE: aggregate(scores, (s) => s.minDeltaE),
            meanDeltaE: aggregate(scores, (s) => s.meanDeltaE),
            uniformity: aggregate(scores, (s) => s.uniformity),
            minCvdDeltaE: aggregate(scores, (s) => s.minCvdDeltaE),
            cvd: Object.fromEntries(
                CVD_CONDITIONS.map((c) => [c.label, aggregate(scores, (s) => s.cvd[c.label])])
            ),
            best: { seed: best.seed, colors: best.colors, score: best.score },
            trials: generated,
        },
        references,
    };
};

// ── Output ──────────────────────────────────────────────────────────────────

const pad = (value, width, align = 'right') => {
    const text = String(value);
    return align === 'right' ? text.padStart(width) : text.padEnd(width);
};

const num = (value, digits = 1) => value.toFixed(digits);

const formatText = (result) => {
    const { options, generated, references } = result;
    const lines = [];

    lines.push(
        `Palette comparison at ${options.colorCount} colors ` +
        `(${options.trials} generated trials, seed ${options.seed}, ciede2000/lab65)`
    );
    lines.push('');
    lines.push(
        `${pad('palette', 18, 'left')}${pad('min ΔE', 10)}${pad('mean ΔE', 10)}` +
        `${pad('unif.', 8)}${pad('min ΔE (CVD)', 14)}`
    );
    lines.push('─'.repeat(60));

    const row = (name, minDeltaE, meanDeltaE, uniformity, minCvd) =>
        `${pad(name, 18, 'left')}${pad(minDeltaE, 10)}${pad(meanDeltaE, 10)}` +
        `${pad(uniformity, 8)}${pad(minCvd, 14)}`;

    lines.push(
        row(
            'category-colors',
            `${num(generated.minDeltaE.mean)}±${num(generated.minDeltaE.sd)}`,
            `${num(generated.meanDeltaE.mean)}±${num(generated.meanDeltaE.sd)}`,
            num(generated.uniformity.mean, 3),
            `${num(generated.minCvdDeltaE.mean)}±${num(generated.minCvdDeltaE.sd)}`
        )
    );
    lines.push(
        row(
            '  best trial',
            num(generated.best.score.minDeltaE),
            num(generated.best.score.meanDeltaE),
            num(generated.best.score.uniformity, 3),
            num(generated.best.score.minCvdDeltaE)
        )
    );
    lines.push('');

    for (const reference of references) {
        lines.push(
            row(
                reference.name + (reference.truncatedFrom ? '*' : ''),
                num(reference.score.minDeltaE),
                num(reference.score.meanDeltaE),
                num(reference.score.uniformity, 3),
                num(reference.score.minCvdDeltaE)
            )
        );
    }

    lines.push('');
    lines.push('  best trial = highest min ΔE of the sampled trials; its other');
    lines.push('  columns are that palette\'s scores, not per-column maxima.');
    if (references.some((r) => r.truncatedFrom)) {
        lines.push(`  * truncated to the first ${options.colorCount} colors`);
    }

    lines.push('');
    lines.push('Minimum ΔE per CVD condition');
    lines.push('─'.repeat(60));
    for (const condition of CVD_CONDITIONS) {
        const parts = [`${pad(condition.label, 20, 'left')}`];
        parts.push(`generated ${pad(num(generated.cvd[condition.label].mean), 6)}`);
        const worst = references.reduce(
            (a, b) => (b.score.cvd[condition.label] < a.score.cvd[condition.label] ? b : a)
        );
        parts.push(
            `   worst reference ${worst.name} ${num(worst.score.cvd[condition.label])}`
        );
        lines.push(parts.join(''));
    }

    lines.push('');
    lines.push(`Best generated palette (seed ${generated.best.seed}):`);
    lines.push(`  ${generated.best.colors.join(' ')}`);

    return lines.join('\n');
};

// ── Entry ───────────────────────────────────────────────────────────────────

// Usage mistakes print the message alone. A stack trace here points at the
// harness rather than at the flag that was wrong.
try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        console.log(USAGE);
    } else {
        const result = run(options);
        const text =
            options.format === 'json'
                ? JSON.stringify(result, null, 2)
                : formatText(result);
        if (options.output) {
            fs.writeFileSync(options.output, `${text}\n`);
            console.log(`Wrote ${options.output}`);
        } else {
            console.log(text);
        }
    }
} catch (error) {
    console.error(`bench: ${error.message}`);
    process.exitCode = 1;
}
