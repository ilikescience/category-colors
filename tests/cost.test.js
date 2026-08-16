import test from 'node:test';
import assert from 'node:assert/strict';
import { cost, costBreakdown } from '../src/core/cost.js';
import { createColor } from '../src/utils/paletteColor.js';

const state = { colors: [createColor('#ff0000'), createColor('#00ff00')] };

const config = {
    evalFunctions: [
        { function: () => 2, weight: 1 },
        { function: () => 6, weight: 3 },
    ],
};

test('costBreakdown agrees with cost', () => {
    const breakdown = costBreakdown(state, config);
    const total = breakdown.reduce((sum, entry) => sum + entry.weightedCost, 0);
    assert.equal(total, cost(state, config));
});

test('costBreakdown reports one entry per evalFunction, in order', () => {
    const breakdown = costBreakdown(state, config);

    assert.equal(breakdown.length, 2);
    assert.deepEqual(breakdown[0], { weight: 1, cost: 2, weightedCost: 2 * (1 / 4) });
    assert.deepEqual(breakdown[1], { weight: 3, cost: 6, weightedCost: 6 * (3 / 4) });
});

test('costBreakdown applies CVD simulation to the state an evaluator sees', () => {
    const seen = [];
    const cvdConfig = {
        evalFunctions: [
            { function: (s) => { seen.push(s); return 1; }, weight: 1 },
            {
                function: (s) => { seen.push(s); return 1; },
                weight: 1,
                cvd: { type: 'deuteranomaly', severity: 1 },
            },
        ],
    };

    costBreakdown(state, cvdConfig);

    assert.equal(seen.length, 2);
    assert.equal(seen[0], state, 'evaluator without cvd should receive the original state');
    assert.notEqual(seen[1], state, 'evaluator with cvd should receive a simulated state');
    assert.notDeepEqual(
        seen[1].colors.map(String),
        state.colors.map(String),
        'simulated colors should differ from the originals'
    );
});
