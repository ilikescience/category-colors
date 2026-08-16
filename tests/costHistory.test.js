import test from 'node:test';
import assert from 'node:assert/strict';
import { runSimulatedAnnealing, runWithOrderOptimization } from '../src/core/annealing.js';
import { createColor } from '../src/utils/paletteColor.js';

const baseConfig = () => ({
    colorSpace: {
        mode: 'rgb',
        ranges: [[0, 1], [0, 1], [0, 1]],
    },
    colorDistance: { method: 'ciede2000', space: 'lab65' },
    coolingRate: 0.9,
    cutoff: 0.001,
    maxIterations: 50,
    maxMutationDistance: 0.1,
    minMutationDistance: 0.01,
    logProgress: false,
    evalFunctions: [{ function: () => 5, weight: 1 }],
});

const baseState = () => ({
    colors: [createColor('#ff0000'), createColor('#00ff00'), createColor('#0000ff')],
    temperature: 1,
    iterations: 0,
    cost: 5,
});

test('costHistory is not recorded unless asked for', () => {
    const result = runSimulatedAnnealing(baseState(), baseConfig());
    assert.equal(result.costHistory, undefined);
});

test('recordHistory captures the first and last iteration', () => {
    const config = { ...baseConfig(), recordHistory: true, historyInterval: 5 };
    const result = runSimulatedAnnealing(baseState(), config);

    assert.ok(Array.isArray(result.costHistory));
    assert.equal(result.costHistory[0][0], 0, 'first sample should be the starting iteration');
    assert.equal(
        result.costHistory[result.costHistory.length - 1][0],
        result.iterations,
        'last sample should be the final iteration'
    );
    // Samples are [iteration, cost] pairs in ascending iteration order.
    for (let i = 1; i < result.costHistory.length; i++) {
        assert.ok(result.costHistory[i][0] > result.costHistory[i - 1][0]);
        assert.ok(Number.isFinite(result.costHistory[i][1]));
    }
});

test('historyInterval controls sampling density', () => {
    const sparse = runSimulatedAnnealing(baseState(), {
        ...baseConfig(),
        recordHistory: true,
        historyInterval: 25,
    });
    const dense = runSimulatedAnnealing(baseState(), {
        ...baseConfig(),
        recordHistory: true,
        historyInterval: 1,
    });

    assert.ok(
        dense.costHistory.length > sparse.costHistory.length,
        'a smaller interval should produce more samples'
    );
});

test('order optimization records its cost at the final iteration', () => {
    const config = { ...baseConfig(), recordHistory: true, historyInterval: 5 };
    const ordered = runWithOrderOptimization(baseState(), config);

    const last = ordered.costHistory[ordered.costHistory.length - 1];
    assert.equal(last[0], ordered.iterations);
    assert.equal(last[1], ordered.cost, 'last sample should be the post-reorder cost');

    // Reordering does not advance the iteration counter, so it must overwrite
    // the final sample rather than append a second one at the same x.
    const iterations = ordered.costHistory.map(([i]) => i);
    assert.equal(
        new Set(iterations).size,
        iterations.length,
        `costHistory has duplicate iterations: ${iterations.join(', ')}`
    );
    for (let i = 1; i < iterations.length; i++) {
        assert.ok(iterations[i] > iterations[i - 1], 'iterations must strictly ascend');
    }
});

test('order optimization leaves an inherited costHistory alone when not recording', () => {
    // A state carried over from an earlier run still has costHistory on it.
    // Appending to that with recording off would invent a sample.
    const state = { ...baseState(), costHistory: [[0, 5]] };
    const result = runWithOrderOptimization(state, { ...baseConfig(), recordHistory: false });

    assert.deepEqual(result.costHistory, [[0, 5]]);
});

test('an invalid historyInterval is rejected rather than silently ignored', () => {
    for (const historyInterval of [0, -5, 1.5, Number.NaN]) {
        assert.throws(
            () => runSimulatedAnnealing(baseState(), {
                ...baseConfig(),
                recordHistory: true,
                historyInterval,
            }),
            /historyInterval must be a positive integer/,
            `historyInterval ${historyInterval} should throw`
        );
    }
});

test('the default interval samples the run the cooling schedule actually takes', () => {
    // maxIterations is a ceiling the default config never reaches: cooling from
    // temperature 1 at 0.999 hits the 0.0001 cutoff around 9,200 iterations.
    // Sizing the interval off maxIterations alone would under-sample ~10x.
    const config = {
        ...baseConfig(),
        maxIterations: 100000,
        coolingRate: 0.999,
        cutoff: 0.0001,
        recordHistory: true,
    };
    delete config.historyInterval;

    const result = runSimulatedAnnealing(baseState(), config);

    assert.ok(
        result.iterations < 20000,
        `expected the cooling schedule to end the run, got ${result.iterations} iterations`
    );
    assert.ok(
        result.costHistory.length > 100,
        `expected roughly 250 samples, got ${result.costHistory.length}`
    );
});
