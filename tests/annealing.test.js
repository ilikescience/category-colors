const test = require('node:test');
const assert = require('node:assert/strict');
const { runWithOrderOptimization } = require('../src/core/annealing');
const { createColor } = require('../src/utils/paletteColor');

// Verifies the orchestration logic without relying on the random walk by
// configuring the state so the simulated annealing loop terminates immediately.
test('runWithOrderOptimization re-evaluates cost after ordering', () => {
    const colors = [
        createColor('#ff0000'),
        createColor('#00ff00'),
        createColor('#0000ff'),
    ];
    const state = {
        colors,
        temperature: 0, // ensures the annealing loop does not execute
        iterations: 0,
        cost: 123,
    };

    const config = {
        colorSpace: {
            mode: 'rgb',
            ranges: [
                [0, 1],
                [0, 1],
                [0, 1],
            ],
            distance: { method: 'ciede2000', space: 'lab65' },
        },
        coolingRate: 0.5,
        cutoff: 0.1,
        maxIterations: 10,
        maxMutationDistance: 0.1,
        minMutationDistance: 0.1,
        evalFunctions: [
            {
                function: () => 5,
                weight: 1,
            },
        ],
    };

    const result = runWithOrderOptimization(state, config);
    assert.strictEqual(result.colors.length, colors.length);
    assert.strictEqual(result.cost, 5, 'cost should be recalculated using eval functions');
    assert.strictEqual(result.iterations, state.iterations);
});
