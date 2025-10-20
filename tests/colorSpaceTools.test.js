const test = require('node:test');
const assert = require('node:assert/strict');
const { mutateColorInSpace } = require('../src/utils/colorSpaceTools');
const { resolveDistanceOptions } = require('../src/utils/distanceOptions');
const { createColor } = require('../src/utils/paletteColor');
const { withMockedRandom } = require('./testUtils');

const angularDifference = (a, b) => {
    const diff = ((a - b + 540) % 360) - 180;
    return Math.abs(diff);
};

test('mutateColorInSpace scales channel mutations by the channel span', () => {
    const config = {
        colorSpace: {
            mode: 'okhsl', // hue range defaults to [0, 360] in Culori
        },
    };
    const distanceOptions = resolveDistanceOptions(config);
    const base = createColor('#ff0000');

    const mutated = withMockedRandom(
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
        () => mutateColorInSpace(base, 0.1, config, distanceOptions)
    );

    const [hBase] = base.to('okhsl').coords;
    const [hMutated] = mutated.to('okhsl').coords;
    const hueShift = angularDifference(hMutated, hBase);

    assert.ok(
        hueShift > 5,
        `expected hue shift to exceed 5 degrees, but got ${hueShift.toFixed(3)}`
    );
});
