import test from 'node:test';
import assert from 'node:assert/strict';
import { displayable, formatHex, parse, differenceCiede2000 } from 'culori';
import { prepareInitialState } from '../src/core/state.js';
import { runWithOrderOptimization } from '../src/core/annealing.js';
import { createDefaultConfig } from '../src/config/defaultConfig.js';
import { ensureColorInSpace } from '../src/utils/colorSpaceTools.js';
import { reportJndIssues } from '../src/report/jnd.js';

const deltaE = differenceCiede2000();

// A color is what it scores as only if hex output doesn't clip it. Conversion
// round-trips leave sRGB channels a hair past 0 or 1, so "displayable" here
// means hex output moves it by well under a just-noticeable difference.
const survivesHex = (color) => deltaE(color, parse(formatHex(color))) < 0.5;

const oklchConfig = (chroma) => ({
    ...createDefaultConfig(),
    colorCount: 8,
    coolingRate: 0.99,
    initialTemperatureSamples: 20,
    logProgress: false,
    seed: 3,
    colorSpace: { mode: 'oklch', ranges: [[0.3, 0.9], chroma, [0, 360]] },
});

// culori gives oklch no gamut, so inGamut('oklch') passes everything. Before
// 3.6.0 the annealer scored colors far outside sRGB that hex output clipped.
test('an oklch run with a wide chroma window returns only displayable colors', () => {
    const config = oklchConfig([0, 0.4]);
    const result = runWithOrderOptimization(prepareInitialState({ colors: [] }, config), config);
    for (const color of result.colors) {
        assert.ok(survivesHex(color), `${formatHex(color)} ${JSON.stringify(color)}`);
    }
});

test('the gamut clamp keeps lightness and hue, and gives up chroma', () => {
    const config = oklchConfig([0, 0.4]);
    const color = ensureColorInSpace({ mode: 'oklch', l: 0.5, c: 0.4, h: 30 }, config, null, { silent: true });
    assert.ok(survivesHex(color));
    assert.ok(Math.abs(color.l - 0.5) < 1e-6, `l ${color.l}`);
    assert.ok(Math.abs(color.h - 30) < 1e-6, `h ${color.h}`);
    assert.ok(color.c < 0.4);
});

// At a low lightness no hue reaches c 0.3, so a window starting there can't be
// met: sRGB wins over the window rather than snapping back out of gamut.
test('a chroma window above the gamut gives way to sRGB', () => {
    const config = oklchConfig([0.3, 0.4]);
    const color = ensureColorInSpace({ mode: 'oklch', l: 0.3, c: 0.35, h: 200 }, config, null, { silent: true });
    assert.ok(survivesHex(color), JSON.stringify(color));
    assert.ok(color.c < 0.3);
});

test("modes with a gamut of their own keep culori's clamp", () => {
    const config = { ...createDefaultConfig(), logProgress: false };
    const color = ensureColorInSpace({ mode: 'okhsl', h: 30, s: 0.5, l: 0.5 }, config, null, { silent: true });
    assert.ok(displayable(color));
});

test("the report flags pairs at the optimizer's threshold by default", () => {
    const { jnd } = createDefaultConfig();
    // #ff0000 and #ff8200 are 21.8 apart: an issue at 25, the old report
    // default, but not at 20, where the optimizer stops pushing them apart.
    const palette = ['#ff0000', '#ff8200', '#00a000', '#0000ff'];
    const byDefault = reportJndIssues(palette);
    const explicit = reportJndIssues(palette, { jndThreshold: jnd });
    assert.equal(jnd, 20);
    assert.deepEqual(byDefault, explicit);
    assert.equal(byDefault.tests[0].issues.length, 0);
});
