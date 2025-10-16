const test = require('node:test');
const assert = require('node:assert/strict');
const Color = require('colorjs.io').default;

const { initializeColors } = require('../src/core/initializeColors');
const { srgb_to_okhsl } = require('../src/utils/okhsl');
const { withMockedRandom } = require('./testUtils');

// These tests focus on the deterministic parts of initializeColors by
// mocking Math.random so the generated colors are reproducible.

test('initializeColors preserves fixed colors and fills remaining slots within the configured range', () => {
    const fixedColor = new Color('#ff0000');
    fixedColor.fixedColor = true;

    const state = { colors: [fixedColor] };
    const config = {
        colorCount: 2,
        hueRange: [0, 1],
        saturationRange: [0.2, 0.8],
        luminosityRange: [0.3, 0.9],
    };

    const result = withMockedRandom([0.4, 0.5, 0.6], () =>
        initializeColors(state, config)
    );

    assert.notStrictEqual(result.colors, state.colors, 'should create a new colors array');
    assert.strictEqual(result.colors.length, config.colorCount);
    assert.strictEqual(result.colors[0], fixedColor, 'fixed colors should remain untouched');

    const generatedColor = result.colors[1];
    const [h, s, l] = srgb_to_okhsl(
        generatedColor.srgb.r,
        generatedColor.srgb.g,
        generatedColor.srgb.b
    );

    assert.ok(h >= config.hueRange[0] && h <= config.hueRange[1], 'hue should be within range');
    assert.ok(s >= config.saturationRange[0] && s <= config.saturationRange[1], 'saturation should be within range');
    assert.ok(l >= config.luminosityRange[0] && l <= config.luminosityRange[1], 'luminosity should be within range');
});

test('initializeColors clips existing colors that fall outside the allowed range', () => {
    const outsideRange = new Color('srgb', [0.1, 0.1, 0.1]);
    const state = { colors: [outsideRange] };
    const config = {
        colorCount: 1,
        hueRange: [0.45, 0.55],
        saturationRange: [0.6, 0.6],
        luminosityRange: [0.6, 0.6],
    };

    const result = initializeColors(state, config);
    const [h, s, l] = srgb_to_okhsl(
        result.colors[0].srgb.r,
        result.colors[0].srgb.g,
        result.colors[0].srgb.b
    );

    const epsilon = 1e-6;
    assert.ok(
        h >= config.hueRange[0] - epsilon && h <= config.hueRange[1] + epsilon,
        'hue should respect wrapped range'
    );
    assert.ok(Math.abs(s - config.saturationRange[0]) <= epsilon);
    assert.ok(Math.abs(l - config.luminosityRange[0]) <= epsilon);
});
