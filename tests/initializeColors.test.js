const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeColors } = require('../src/core/initializeColors');
const { withMockedRandom } = require('./testUtils');
const { createColor } = require('../src/utils/paletteColor');

// These tests focus on the deterministic parts of initializeColors by
// mocking Math.random so the generated colors are reproducible.

test('initializeColors preserves fixed colors and fills remaining slots within the configured range', () => {
    const fixedColor = createColor('#ff0000');
    fixedColor.fixedColor = true;

    const state = { colors: [fixedColor] };
    const config = {
        colorCount: 2,
        colorSpace: {
            mode: 'okhsl',
            ranges: [
                [0, 1],
                [0.2, 0.8],
                [0.3, 0.9],
            ],
            distance: { method: 'ciede2000', space: 'lab65' },
        },
    };

    const result = withMockedRandom([0.4, 0.5, 0.6], () =>
        initializeColors(state, config)
    );

    assert.notStrictEqual(result.colors, state.colors, 'should create a new colors array');
    assert.strictEqual(result.colors.length, config.colorCount);
    assert.ok(result.colors[0].fixedColor, 'fixed colors should remain flagged');
    const [fh, fs, fl] = result.colors[0].to('okhsl').coords;
    assert.ok(fh >= config.colorSpace.ranges[0][0] && fh <= config.colorSpace.ranges[0][1]);
    assert.ok(fs >= config.colorSpace.ranges[1][0] && fs <= config.colorSpace.ranges[1][1]);
    assert.ok(fl >= config.colorSpace.ranges[2][0] && fl <= config.colorSpace.ranges[2][1]);

    const generatedColor = result.colors[1];
    const [h, s, l] = generatedColor.to('okhsl').coords;

    assert.ok(h >= config.colorSpace.ranges[0][0] && h <= config.colorSpace.ranges[0][1], 'hue should be within range');
    assert.ok(s >= config.colorSpace.ranges[1][0] && s <= config.colorSpace.ranges[1][1], 'saturation should be within range');
    assert.ok(l >= config.colorSpace.ranges[2][0] && l <= config.colorSpace.ranges[2][1], 'luminosity should be within range');
});

test('initializeColors clips existing colors that fall outside the allowed range', () => {
    const outsideRange = createColor('rgb', [0.1, 0.1, 0.1]);
    const state = { colors: [outsideRange] };
    const config = {
        colorCount: 1,
        colorSpace: {
            mode: 'okhsl',
            ranges: [
                [0.45, 0.55],
                [0.6, 0.6],
                [0.6, 0.6],
            ],
            distance: { method: 'ciede2000', space: 'lab65' },
        },
    };

    const result = initializeColors(state, config);
    const [h, s, l] = result.colors[0].to('okhsl').coords;

    const epsilon = 1e-6;
    assert.ok(
        h >= config.colorSpace.ranges[0][0] - epsilon && h <= config.colorSpace.ranges[0][1] + epsilon,
        'hue should respect wrapped range'
    );
    assert.ok(Math.abs(s - config.colorSpace.ranges[1][0]) <= epsilon);
    assert.ok(Math.abs(l - config.colorSpace.ranges[2][0]) <= epsilon);
});

test('initializeColors derives channel ranges from Culori definitions when none provided', () => {
    const outsideRgb = createColor('rgb', [1.5, -0.2, 0.5]);
    const state = { colors: [outsideRgb] };
    const config = {
        colorCount: 1,
        colorSpace: {
            mode: 'rgb',
        },
    };

    const result = initializeColors(state, config);
    const [r, g, b] = result.colors[0].to('rgb').coords;

    assert.ok(r >= 0 && r <= 1, 'red channel should be clamped to RGB range');
    assert.ok(g >= 0 && g <= 1, 'green channel should be clamped to RGB range');
    assert.ok(b >= 0 && b <= 1, 'blue channel should be clamped to RGB range');
});
