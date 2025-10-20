const test = require('node:test');
const assert = require('node:assert/strict');
const { optimizeColorOrder } = require('../src/core/optimizeColorOrder');
const { createColor } = require('../src/utils/paletteColor');
const { deltaE } = require('../src/utils/deltaE');

// A simple helper to mirror the internal cost calculation for verification.
const pathCost = (path, colors, distanceOptions) => {
    let pathMean = 0;
    let pathStdAccumulator = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const left = colors[path[i]];
        const right = colors[path[i + 1]];
        const distance = deltaE(left, right, distanceOptions);
        pathMean += distance;
        pathStdAccumulator += distance * distance;
    }
    pathMean /= path.length - 1;
    const variance = pathStdAccumulator / (path.length - 1) - pathMean * pathMean;
    const stdDev = Math.sqrt(Math.max(variance, 0));
    return stdDev / pathMean;
};

test('optimizeColorOrder returns a permutation that respects fixed order constraints', () => {
    const colors = [
        createColor('#ff0000'),
        createColor('#00ff00'),
        createColor('#0000ff'),
    ];
    colors[1].fixedOrder = true;

    const state = { colors };
    const config = {
        colorSpace: {
            mode: 'rgb',
            distance: { method: 'ciede2000', space: 'lab65' },
        },
    };

    const ordered = optimizeColorOrder(state, config);

    assert.strictEqual(ordered.length, colors.length);
    assert.strictEqual(ordered[1], colors[1], 'fixed-order color must remain in place');

    const indices = ordered.map((color) => colors.indexOf(color));
    assert.deepStrictEqual(indices.slice().sort((a, b) => a - b), [0, 1, 2]);

    const distanceOptions = { method: 'ciede2000', space: 'lab65' };
    const identityCost = pathCost([0, 1, 2], colors, distanceOptions);
    const newCost = pathCost(indices, colors, distanceOptions);
    assert.ok(newCost <= identityCost + 1e-9, 'reordered path should be at least as good as identity');
});
