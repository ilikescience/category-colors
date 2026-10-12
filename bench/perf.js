// Speed benchmark: CPU time per generation at the app's default settings.
//
//   node bench/perf.js                          # 4, 8, 12, 20 colors; 3 seeds each
//   node bench/perf.js --colors 8 --seeds 10
//   node bench/perf.js --format json -o perf.json
//
// Each run is seeded, so two checkouts given the same --seed and --seeds
// produce the same palettes if they make the same decisions. The JSON output
// keeps every palette and its exact final cost so two runs can be diffed for
// that: a change that only caches or skips redundant work should leave them
// identical.
//
// The configuration mirrors categorycolors.com's DEFAULT_PARAMS (okhsl, jnd 20,
// 60000 iterations, order optimization on, no similarity targets) rather than
// createDefaultConfig(), because the app is the workload being priced.

import fs from 'node:fs';
import {
    createDefaultConfig,
    energy,
    jnd,
    prepareInitialState,
    range,
    runWithOrderOptimization,
} from '../src/index.js';
import { scorePalette } from './metrics.js';
import { withSeed } from './seed.js';

const parseArgs = (argv) => {
    const options = { colors: [4, 8, 12, 20], seeds: 3, seed: 1, format: 'text', output: null };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = () => {
            if (i + 1 >= argv.length) throw new Error(`Missing value for ${arg}.`);
            return argv[++i];
        };
        const positiveInt = (raw) => {
            const value = Number(raw);
            if (!Number.isInteger(value) || value < 1) {
                throw new Error(`${arg} takes positive integers; received "${raw}".`);
            }
            return value;
        };
        if (arg === '--colors' || arg === '-n') options.colors = next().split(',').map(positiveInt);
        else if (arg === '--seeds') options.seeds = positiveInt(next());
        else if (arg === '--seed' || arg === '-s') options.seed = positiveInt(next());
        else if (arg === '--format' || arg === '-f') options.format = next();
        else if (arg === '--output' || arg === '-o') options.output = next();
        else throw new Error(`Unknown option: ${arg}`);
    }
    return options;
};

const appConfig = (colorCount) => {
    const config = createDefaultConfig();
    config.logProgress = false;
    config.recordHistory = true;
    config.colorCount = colorCount;
    config.jnd = 20;
    config.maxIterations = 60000;
    config.colorSpace = { mode: 'okhsl', ranges: [[0, 360], [0.2, 0.8], [0.3, 0.9]] };
    config.similarityTarget = [];
    config.evalFunctions = [
        { function: energy, weight: 0.15 },
        { function: range, weight: 0.15 },
        { function: jnd, weight: 1 },
        { function: jnd, weight: 0.1, cvd: { type: 'protanomaly', severity: 1 } },
        { function: jnd, weight: 0.1, cvd: { type: 'deuteranomaly', severity: 1 } },
        { function: jnd, weight: 0.1, cvd: { type: 'tritanomaly', severity: 1 } },
        { function: jnd, weight: 0.05, cvd: { type: 'grayscale', severity: 1 } },
    ];
    return config;
};

const generate = (colorCount, seed) =>
    withSeed(seed, () => {
        const config = appConfig(colorCount);
        const start = process.cpuUsage();
        const state = runWithOrderOptimization(prepareInitialState({ colors: [] }, config), config);
        const { user, system } = process.cpuUsage(start);
        const cpuMs = (user + system) / 1000;
        const colors = state.colors.map(String);
        const score = scorePalette(colors);
        return {
            colorCount,
            seed,
            iterations: state.iterations,
            cpuMs,
            usPerIteration: (cpuMs * 1000) / state.iterations,
            cost: state.cost,
            minDeltaE: score.minDeltaE,
            worstMinDeltaE: Math.min(score.minDeltaE, ...Object.values(score.cvd)),
            colors,
        };
    });

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

const options = parseArgs(process.argv.slice(2));
const runs = [];
for (const colorCount of options.colors) {
    for (let k = 0; k < options.seeds; k += 1) {
        const run = generate(colorCount, options.seed + k);
        runs.push(run);
        if (options.format === 'text') {
            console.log(
                `${String(colorCount).padStart(2)} colors  seed ${String(run.seed).padStart(3)}  ` +
                    `${run.cpuMs.toFixed(0).padStart(6)} ms  ${run.usPerIteration.toFixed(1).padStart(6)} µs/it  ` +
                    `${String(run.iterations).padStart(5)} it  cost ${run.cost.toFixed(6)}  ` +
                    `minΔE ${run.minDeltaE.toFixed(2)}  worst ${run.worstMinDeltaE.toFixed(2)}`
            );
        }
    }
}

if (options.format === 'text') {
    console.log('\ncolors   cpu ms   µs/it   minΔE   worst   cost');
    for (const colorCount of options.colors) {
        const group = runs.filter((run) => run.colorCount === colorCount);
        console.log(
            `${String(colorCount).padStart(6)} ${mean(group.map((r) => r.cpuMs)).toFixed(0).padStart(8)} ` +
                `${mean(group.map((r) => r.usPerIteration)).toFixed(1).padStart(7)} ` +
                `${mean(group.map((r) => r.minDeltaE)).toFixed(2).padStart(7)} ` +
                `${mean(group.map((r) => r.worstMinDeltaE)).toFixed(2).padStart(7)} ` +
                `${mean(group.map((r) => r.cost)).toFixed(4)}`
        );
    }
}

const json = JSON.stringify({ node: process.version, options, runs }, null, 2);
if (options.output) fs.writeFileSync(options.output, json);
else if (options.format === 'json') console.log(json);
