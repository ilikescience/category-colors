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

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    createDefaultConfig,
    createDefaultState,
    palettes,
    prepareInitialState,
    runWithOrderOptimization,
    similarity,
} from '../src/index.js';
import names from '../src/evaluators/names/names.js';
import { CVD_CONDITIONS, aggregate, scorePalette } from './metrics.js';
import { withSeed } from './seed.js';

// ── Options ─────────────────────────────────────────────────────────────────

const parseArgs = (argv) => {
    const options = {
        colors: 8, trials: 10, seed: 1, names: 0, palettailor: false, colorgorical: false,
        format: 'text', output: null,
    };

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

        const nextNumber = (name, { min }) => {
            const raw = next(name);
            const value = Number(raw);
            if (!Number.isFinite(value) || value < min) {
                throw new Error(`${name} must be a number >= ${min}; received "${raw}".`);
            }
            return value;
        };

        if (arg === '--colors' || arg === '-n') options.colors = nextInt(arg, { min: 2 });
        else if (arg === '--names') options.names = nextNumber(arg, { min: 0 });
        else if (arg === '--palettailor') options.palettailor = true;
        else if (arg === '--colorgorical') options.colorgorical = true;
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
  --names <w>        Also optimize name difference, at this weight (default 0: off)
  --palettailor      Also generate palettes with Palettailor (downloads its sources once)
  --colorgorical     Score every palette on Colorgorical's criteria too, and include its
                     sample palettes if bench/colorgorical/samples.json exists (needs Docker)
  -f, --format <t>   text (default) or json
  -o, --output <p>   Write to a file instead of stdout
`;

// ── Runs ────────────────────────────────────────────────────────────────────

const generateOne = (colorCount, seed, namesWeight) =>
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
        // Name difference is not in the default config: it costs a 260 kB table
        // and most users never asked for it. Opting in here is what makes the
        // objective comparable with Colorgorical's and Palettailor's.
        if (namesWeight > 0) {
            config.evalFunctions.push({ function: names, weight: namesWeight });
        }

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

// Mean ± sd of every metric over one generator's trials, plus its best trial.
const summarizeTrials = (generated) => {
    const scores = generated.map((g) => g.score);
    const best = generated.reduce((a, b) => (b.score.minDeltaE > a.score.minDeltaE ? b : a));
    return {
        minDeltaE: aggregate(scores, (s) => s.minDeltaE),
        meanDeltaE: aggregate(scores, (s) => s.meanDeltaE),
        uniformity: aggregate(scores, (s) => s.uniformity),
        minCvdDeltaE: aggregate(scores, (s) => s.minCvdDeltaE),
        minNameDifference: aggregate(scores, (s) => s.minNameDifference),
        meanNameDifference: aggregate(scores, (s) => s.meanNameDifference),
        cvd: Object.fromEntries(
            CVD_CONDITIONS.map((c) => [c.label, aggregate(scores, (s) => s.cvd[c.label])])
        ),
        best: { seed: best.seed, colors: best.colors, score: best.score },
        trials: generated,
    };
};

// ── Colorgorical ────────────────────────────────────────────────────────────

const SCORER = fileURLToPath(new URL('./colorgorical/score.sh', import.meta.url));
const SAMPLES = new URL('./colorgorical/samples.json', import.meta.url);
export const COLORGORICAL_CRITERIA = [
    { key: 'de', label: 'ΔE' },
    { key: 'nd', label: 'name diff' },
    { key: 'pp', label: 'pair pref' },
    { key: 'nu', label: 'name uniq' },
];

// One container run for every palette in the benchmark; see
// bench/colorgorical/readme.md for what the four minima mean.
const colorgoricalScores = (palettes) => {
    const proc = spawnSync(SCORER, [], {
        input: JSON.stringify(palettes),
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    });
    if (proc.status !== 0) {
        throw new Error(`Colorgorical scorer failed: ${(proc.stderr || proc.error?.message || '').trim()}`);
    }
    return JSON.parse(proc.stdout).map((entry) => entry.min);
};

const attachColorgorical = (generators, references) => {
    const targets = [...generators.flatMap((g) => g.trials), ...references];
    const scores = colorgoricalScores(targets.map((t) => t.colors));
    targets.forEach((target, i) => {
        target.score.colorgorical = scores[i];
    });
    for (const generator of generators) {
        const trialScores = generator.trials.map((t) => t.score);
        generator.colorgorical = Object.fromEntries(
            COLORGORICAL_CRITERIA.map(({ key }) => [
                key,
                aggregate(trialScores, (s) => s.colorgorical[key]),
            ])
        );
    }
};

// Colorgorical's own palettes, from the samples its authors' script makes,
// at the slider setting that weights all three of its optimized criteria
// equally. Only the sizes that script produces (3, 5, 8) are available.
const colorgoricalSamples = (colorCount) => {
    if (!fs.existsSync(SAMPLES)) return null;
    const settings = JSON.parse(fs.readFileSync(SAMPLES, 'utf8'));
    const setting = settings.find(
        ({ weights }) =>
            weights.ciede2000 === 1 && weights.nameDifference === 1 && weights.pairPreference === 1
    );
    const palettes = setting?.palettes[String(colorCount)];
    if (!palettes) return null;
    return summarizeTrials(
        palettes.map((p, i) => ({ seed: i, colors: p.hex, score: scorePalette(p.hex) }))
    );
};

const run = async (options) => {
    const { colors: colorCount, trials, seed, names: namesWeight } = options;

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
        const palette = generateOne(colorCount, seed + i, namesWeight);
        generated.push({ seed: seed + i, colors: palette, score: scorePalette(palette) });
    }

    // Loaded only on request: the runner fetches Palettailor's sources from
    // GitHub the first time, which a default `npm run bench` should not do.
    let palettailor = null;
    if (options.palettailor) {
        const { generatePalettailor } = await import('./palettailor/run.js');
        const runs = [];
        for (let i = 0; i < trials; i += 1) {
            const colors = await generatePalettailor({ colorCount, seed: seed + i });
            runs.push({ seed: seed + i, colors, score: scorePalette(colors) });
        }
        palettailor = summarizeTrials(runs);
    }

    const references = available.map((entry) => ({
        ...entry,
        score: scorePalette(entry.colors),
    }));

    const result = {
        options: { colorCount, trials, seed, namesWeight },
        generated: summarizeTrials(generated),
        palettailor,
        colorgorical: options.colorgorical ? colorgoricalSamples(colorCount) : null,
        references,
    };
    if (options.colorgorical) {
        attachColorgorical(
            [result.generated, result.palettailor, result.colorgorical].filter(Boolean),
            references
        );
    }
    return result;
};

// ── Output ──────────────────────────────────────────────────────────────────

const pad = (value, width, align = 'right') => {
    const text = String(value);
    return align === 'right' ? text.padStart(width) : text.padEnd(width);
};

const num = (value, digits = 1) => value.toFixed(digits);

const formatText = (result) => {
    const { options, generated, palettailor, colorgorical, references } = result;
    const generators = [
        ['category-colors', generated],
        ['palettailor', palettailor],
        ['colorgorical', colorgorical],
    ].filter(([, summary]) => summary);
    const lines = [];

    lines.push(
        `Palette comparison at ${options.colorCount} colors ` +
        `(${options.trials} generated trials, seed ${options.seed}, ciede2000/lab65` +
        (options.namesWeight > 0 ? `, names weight ${options.namesWeight})` : ')')
    );
    lines.push('');
    lines.push(
        `${pad('palette', 18, 'left')}${pad('min ΔE', 10)}${pad('mean ΔE', 10)}` +
        `${pad('unif.', 8)}${pad('min ΔE (CVD)', 14)}${pad('min name Δ', 12)}`
    );
    lines.push('─'.repeat(72));

    const row = (name, minDeltaE, meanDeltaE, uniformity, minCvd, minName) =>
        `${pad(name, 18, 'left')}${pad(minDeltaE, 10)}${pad(meanDeltaE, 10)}` +
        `${pad(uniformity, 8)}${pad(minCvd, 14)}${pad(minName, 12)}`;

    const generatorRows = (name, summary) => {
        lines.push(
            row(
                name,
                `${num(summary.minDeltaE.mean)}±${num(summary.minDeltaE.sd)}`,
                `${num(summary.meanDeltaE.mean)}±${num(summary.meanDeltaE.sd)}`,
                num(summary.uniformity.mean, 3),
                `${num(summary.minCvdDeltaE.mean)}±${num(summary.minCvdDeltaE.sd)}`,
                `${num(summary.minNameDifference.mean, 2)}±${num(summary.minNameDifference.sd, 2)}`
            )
        );
        lines.push(
            row(
                '  best trial',
                num(summary.best.score.minDeltaE),
                num(summary.best.score.meanDeltaE),
                num(summary.best.score.uniformity, 3),
                num(summary.best.score.minCvdDeltaE),
                num(summary.best.score.minNameDifference, 2)
            )
        );
    };
    for (const [name, summary] of generators) generatorRows(name, summary);
    lines.push('');

    for (const reference of references) {
        lines.push(
            row(
                reference.name + (reference.truncatedFrom ? '*' : ''),
                num(reference.score.minDeltaE),
                num(reference.score.meanDeltaE),
                num(reference.score.uniformity, 3),
                num(reference.score.minCvdDeltaE),
                num(reference.score.minNameDifference, 2)
            )
        );
    }

    lines.push('');
    lines.push('  best trial = highest min ΔE of the sampled trials; its other');
    lines.push('  columns are that palette\'s scores, not per-column maxima.');
    lines.push('  min name Δ = Heer & Stone name difference of the closest-named pair;');
    lines.push('  0 means two colors share a name, 1 means no term in common.');
    if (references.some((r) => r.truncatedFrom)) {
        lines.push(`  * truncated to the first ${options.colorCount} colors`);
    }

    lines.push('');
    lines.push('Minimum ΔE per condition');
    lines.push('  deficiencies simulated with culori\'s filters (Machado et al. 2009);');
    lines.push('  grayscale is a luminance projection, not a model of anyone\'s vision.');
    lines.push('─'.repeat(60));
    for (const condition of CVD_CONDITIONS) {
        const parts = [`${pad(condition.label, 20, 'left')}`];
        parts.push(`generated ${pad(num(generated.cvd[condition.label].mean), 6)}`);
        if (palettailor) {
            parts.push(`   palettailor ${pad(num(palettailor.cvd[condition.label].mean), 6)}`);
        }
        const worst = references.reduce(
            (a, b) => (b.score.cvd[condition.label] < a.score.cvd[condition.label] ? b : a)
        );
        parts.push(
            `   worst reference ${worst.name} ${num(worst.score.cvd[condition.label])}`
        );
        lines.push(parts.join(''));
    }

    lines.push('');
    if (generated.colorgorical) {
        lines.push("Colorgorical's criteria (minimum over pairs; higher is better)");
        lines.push('─'.repeat(72));
        const cgRow = (name, values) =>
            `${pad(name, 18, 'left')}${COLORGORICAL_CRITERIA.map(({ key }) => pad(values[key], 13)).join('')}`;
        lines.push(cgRow('palette', Object.fromEntries(COLORGORICAL_CRITERIA.map(({ key, label }) => [key, label]))));
        for (const [name, summary] of generators) {
            lines.push(
                cgRow(
                    name,
                    Object.fromEntries(
                        COLORGORICAL_CRITERIA.map(({ key }) => [
                            key,
                            `${num(summary.colorgorical[key].mean, key === 'nd' || key === 'nu' ? 2 : 1)}` +
                            `±${num(summary.colorgorical[key].sd, key === 'nd' || key === 'nu' ? 2 : 1)}`,
                        ])
                    )
                )
            );
        }
        for (const reference of references) {
            lines.push(
                cgRow(
                    reference.name + (reference.truncatedFrom ? '*' : ''),
                    Object.fromEntries(
                        COLORGORICAL_CRITERIA.map(({ key }) => [
                            key,
                            num(reference.score.colorgorical[key], key === 'nd' || key === 'nu' ? 2 : 1),
                        ])
                    )
                )
            );
        }
        lines.push('  Colorgorical snaps colors to its 5-unit Lab grid before scoring;');
        lines.push('  see bench/colorgorical/readme.md.');
    }

    lines.push('');
    for (const [name, summary] of generators) {
        lines.push(`Best ${name} palette (seed ${summary.best.seed}):`);
        lines.push(`  ${summary.best.colors.join(' ')}`);
    }

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
        const result = await run(options);
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
