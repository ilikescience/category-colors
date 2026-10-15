import test from 'node:test';
import assert from 'node:assert/strict';
import { converter, displayable, formatHex, parse, differenceCiede2000 } from 'culori';
import { prepareInitialState } from '../src/core/state.js';
import { runWithOrderOptimization } from '../src/core/annealing.js';
import { createDefaultConfig } from '../src/config/defaultConfig.js';
import { ensureColorInSpace } from '../src/utils/colorSpaceTools.js';
import { reportJndIssues } from '../src/report/jnd.js';
import { formatColor, formatPalette, resolveGamut } from '../src/utils/gamut.js';
import { createColor } from '../src/utils/paletteColor.js';
import { buildJsonSummary } from '../src/cli/generatePalette.js';

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

// ── config.colorSpace.gamut ──────────────────────────────────────────────────

const p3Config = (gamut) => ({ ...oklchConfig([0.1, 0.37]), colorCount: 6, seed: 2, colorSpace: { mode: 'oklch', gamut, ranges: [[0.4, 0.85], [0.1, 0.37], [0, 360]] } });
const inGamutOf = (mode) => (color) => {
    const { r, g, b } = converter(mode)(color);
    return [r, g, b].every((v) => v >= -1e-6 && v <= 1 + 1e-6);
};

test('the gamut defaults to sRGB and names CSS color spaces', () => {
    assert.deepEqual(resolveGamut({ mode: 'oklch' }), { name: 'srgb', mode: 'rgb' });
    assert.deepEqual(resolveGamut({ mode: 'oklch', gamut: 'display-p3' }), { name: 'display-p3', mode: 'p3' });
    assert.equal(resolveGamut({ mode: 'oklch', gamut: null }), null);
    assert.throws(() => resolveGamut({ mode: 'oklch', gamut: 'p3' }), /must be one of srgb, display-p3/);
});

// okhsl only describes sRGB colors, so a wider gamut there would do nothing.
test('a gamut wider than the mode can describe is rejected', () => {
    assert.throws(() => resolveGamut({ mode: 'okhsl', gamut: 'display-p3' }), /wider than okhsl can describe/);
    assert.deepEqual(resolveGamut({ mode: 'okhsl', gamut: 'srgb' }), { name: 'srgb', mode: 'rgb' });
});

test('a display-p3 run uses colors outside sRGB and keeps every one inside P3', () => {
    const config = p3Config('display-p3');
    const result = runWithOrderOptimization(prepareInitialState({ colors: [] }, config), config);
    assert.ok(result.colors.every(inGamutOf('p3')), result.colors.map((c) => formatColor(c, 'display-p3')).join(' '));
    assert.ok(result.colors.some((color) => !displayable(color)), 'expected at least one color outside sRGB');
});

test('clamping to a wider gamut keeps lightness and hue', () => {
    const config = p3Config('display-p3');
    const color = ensureColorInSpace({ mode: 'oklch', l: 0.6, c: 0.37, h: 150 }, config, null, { silent: true });
    assert.ok(inGamutOf('p3')(color));
    assert.ok(!displayable(color), 'P3 allows more chroma here than sRGB');
    assert.ok(Math.abs(color.l - 0.6) < 1e-6 && Math.abs(color.h - 150) < 1e-6, JSON.stringify(color));
});

test('a null gamut leaves colors unclamped', () => {
    const config = p3Config(null);
    const color = ensureColorInSpace({ mode: 'oklch', l: 0.6, c: 0.37, h: 150 }, config, null, { silent: true });
    assert.equal(color.c, 0.37);
});

test('colors are written in their gamut', () => {
    const color = { mode: 'oklch', l: 0.6, c: 0.23, h: 150 };
    assert.match(formatColor(color, 'srgb'), /^#[0-9a-f]{6}$/);
    const p3 = formatColor(color, 'display-p3');
    assert.match(p3, /^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/);
    assert.ok(differenceCiede2000()(color, parse(p3)) < 0.1, p3);
    assert.match(formatColor(color, null), /^oklch\(0\.6 0\.23 150\)$/);
    assert.deepEqual(formatPalette([color], 'rec2020').map((s) => s.slice(0, 14)), ['color(rec2020 ']);
});

test('the report and CLI summaries write colors in the requested gamut', () => {
    const palette = ['color(display-p3 0.9963 0.6068 0.0155)', 'color(display-p3 0.0004 0.3394 0.3024)'];
    const report = reportJndIssues(palette, { gamut: 'display-p3', includePairs: true });
    assert.deepEqual(report.tests[0].pairs[0].colors, palette);

    const state = { colors: palette.map((c) => createColor(c)), cost: 0, iterations: 0, temperature: 0 };
    assert.deepEqual(buildJsonSummary(state, state, 1, 'display-p3').palette, palette);
    assert.match(buildJsonSummary(state, state, 1).palette[0], /^#/);
});
