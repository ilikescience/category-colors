import test from 'node:test';
import assert from 'node:assert/strict';
import simulateCvd from '../src/core/simulateCvd.js';
import { createColor } from '../src/utils/paletteColor.js';
import { deltaE } from '../src/utils/deltaE.js';
import { createDefaultConfig } from '../src/config/defaultConfig.js';

const state = (hexes) => ({ colors: hexes.map((h) => createColor(h)) });
const DISTANCE = { method: 'ciede2000', space: 'lab65' };

test('each deficiency collapses the axis it is named for', () => {
    // Red and green are confusable under the red-green deficiencies and stay
    // distinct under tritanopia, which is the blue-yellow axis.
    const redGreen = state(['#ff0000', '#00ff00']);
    const apart = deltaE(redGreen.colors[0], redGreen.colors[1], DISTANCE);

    for (const type of ['protanopia', 'deuteranopia']) {
        const { colors } = simulateCvd(redGreen, type, 1);
        assert.ok(deltaE(colors[0], colors[1], DISTANCE) < apart, `${type} should collapse red/green`);
    }
    const trit = simulateCvd(redGreen, 'tritanopia', 1).colors;
    assert.ok(deltaE(trit[0], trit[1], DISTANCE) > 50, 'tritanopia leaves red/green apart');
});

test('severity scales the effect', () => {
    const pair = state(['#ff0000', '#00ff00']);
    const at = (severity) => {
        const { colors } = simulateCvd(pair, 'deuteranomaly', severity);
        return deltaE(colors[0], colors[1], DISTANCE);
    };
    assert.ok(at(0) > at(0.5) && at(0.5) > at(1), 'higher severity should collapse further');
});

// grayscale is a luminance projection standing in for print, not a deficiency
// filter. It is in the same switch because it is the same kind of transform:
// a state in, a state out.
test('grayscale keeps only lightness', () => {
    const { colors } = simulateCvd(state(['#ff0000', '#00ff00', '#0000ff']), 'grayscale', 1);
    for (const color of colors) {
        const { r, g, b } = color;
        assert.ok(Math.abs(r - g) < 1e-6 && Math.abs(g - b) < 1e-6, `${String(color)} should be neutral`);
    }
    // Green is the brightest of the three primaries, blue the darkest.
    assert.ok(colors[1].r > colors[0].r, 'green outranks red in luminance');
    assert.ok(colors[0].r > colors[2].r, 'red outranks blue in luminance');
});

test('an unknown condition throws rather than silently passing colors through', () => {
    assert.throws(() => simulateCvd(state(['#ff0000']), 'not-a-condition', 1), /Unknown CVD type/);
});

test('simulation preserves fixed flags and palette length', () => {
    const colors = [createColor('#ff0000'), createColor('#00ff00')];
    colors[0].fixedColor = true;
    const out = simulateCvd({ colors, extra: 'kept' }, 'deuteranopia', 1);
    assert.equal(out.colors.length, 2);
    assert.equal(out.colors[0].fixedColor, true);
    assert.equal(out.extra, 'kept', 'other state fields survive');
});

// The defaults are a deliberate, measured choice; this pins them so a change
// has to be intentional rather than incidental.
test('the default config models both dichromacies, tritanopia and grayscale', () => {
    const conditions = createDefaultConfig()
        .evalFunctions.filter((entry) => entry.cvd)
        .map((entry) => `${entry.cvd.type}:${entry.cvd.severity}`);
    assert.deepEqual(conditions.sort(), [
        'deuteranopia:1', 'grayscale:1', 'protanopia:1', 'tritanopia:1',
    ]);
});
