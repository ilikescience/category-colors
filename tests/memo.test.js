import test from 'node:test';
import assert from 'node:assert/strict';
import { converter, differenceCiede2000, differenceCie94, filterDeficiencyDeuter } from 'culori';
import {
    avoid,
    cost,
    createColor,
    createDefaultConfig,
    deltaE,
    prepareInitialState,
    runWithOrderOptimization,
    simulateCvd,
} from '../src/index.js';
import { pairwiseDeltaE } from '../src/utils/deltaE.js';
import { setMemoization } from '../src/utils/colorMemo.js';
import { withSeed } from '../bench/seed.js';

// deltaE, simulateCvd and the evaluators cache what they derive from each
// color (see src/utils/colorMemo.js). These tests hold the caches to two
// promises: a cached value is bit-for-bit what an uncached computation gives,
// and nothing computed from a color survives an edit to it.

const ciede2000 = differenceCiede2000();
const DISTANCE = { method: 'ciede2000' };

const okhsl = (h, s, l) => createColor({ mode: 'okhsl', h, s, l });

test('cached distances equal culori computed directly, in both orders and on repeat', () => {
    const colors = [okhsl(10, 0.5, 0.5), okhsl(200, 0.7, 0.4), okhsl(90, 0.3, 0.8)];
    for (let round = 0; round < 2; round++) {
        for (const a of colors) {
            for (const b of colors) {
                assert.equal(deltaE(a, b, DISTANCE), ciede2000(a, b));
            }
        }
    }
    const cie94 = differenceCie94();
    assert.equal(deltaE(colors[0], colors[1], { method: 'cie94' }), cie94(colors[0], colors[1]));
});

test('editing a color in place invalidates its distances', () => {
    const a = okhsl(10, 0.5, 0.5);
    const b = okhsl(200, 0.7, 0.4);
    const before = deltaE(a, b, DISTANCE);
    deltaE(b, a, DISTANCE);

    a.h = 120;
    assert.notEqual(deltaE(a, b, DISTANCE), before);
    assert.equal(deltaE(a, b, DISTANCE), ciede2000(a, b));
    assert.equal(deltaE(b, a, DISTANCE), ciede2000(b, a));

    // Every channel takes part, including one a mode could leave undefined.
    b.alpha = 0.5;
    b.l = 0.9;
    assert.equal(deltaE(a, b, DISTANCE), ciede2000(a, b));
});

test('changing a color to another mode in place invalidates it', () => {
    const a = okhsl(10, 0.5, 0.5);
    const b = okhsl(200, 0.7, 0.4);
    deltaE(a, b, DISTANCE);
    Object.assign(a, converter('rgb')(okhsl(300, 0.6, 0.6)));
    delete a.h;
    delete a.s;
    delete a.l;
    assert.equal(a.mode, 'rgb');
    assert.equal(deltaE(a, b, DISTANCE), ciede2000(a, b));
});

test('pairwiseDeltaE agrees with deltaE and sees edits made between calls', () => {
    const colors = [okhsl(10, 0.5, 0.5), okhsl(200, 0.7, 0.4), okhsl(90, 0.3, 0.8)];
    const first = pairwiseDeltaE(colors, colors, DISTANCE);
    assert.equal(first(0, 2), deltaE(colors[0], colors[2], DISTANCE));

    colors[2].s = 0.6;
    const second = pairwiseDeltaE(colors, colors, DISTANCE);
    assert.equal(second(0, 2), ciede2000(colors[0], colors[2]));
});

test('simulateCvd reuses a simulation only while the color is unchanged', () => {
    const color = okhsl(30, 0.8, 0.6);
    const state = { colors: [color] };
    const first = simulateCvd(state, 'deuteranopia', 1).colors[0];
    assert.equal(simulateCvd(state, 'deuteranopia', 1).colors[0], first, 'same object while unchanged');
    assert.equal(first.l, filterDeficiencyDeuter(1)(color).l);

    color.h = 250;
    const second = simulateCvd(state, 'deuteranopia', 1).colors[0];
    assert.notEqual(second, first);
    const expected = filterDeficiencyDeuter(1)(color);
    assert.deepEqual([second.h, second.s, second.l], [expected.h, expected.s, expected.l]);
});

test('simulateCvd keys simulations by condition and severity', () => {
    const color = okhsl(30, 0.8, 0.6);
    const state = { colors: [color] };
    const full = simulateCvd(state, 'deuteranomaly', 1).colors[0];
    const half = simulateCvd(state, 'deuteranomaly', 0.5).colors[0];
    const trit = simulateCvd(state, 'tritanomaly', 1).colors[0];
    assert.notEqual(String(full), String(half));
    assert.notEqual(String(full), String(trit));
});

test('simulateCvd copies flags changed after the simulation was cached', () => {
    const color = okhsl(30, 0.8, 0.6);
    simulateCvd({ colors: [color] }, 'protanopia', 1);
    color.fixedColor = true;
    color.fixedOrder = true;
    const [simulated] = simulateCvd({ colors: [color] }, 'protanopia', 1).colors;
    assert.equal(simulated.fixedColor, true);
    assert.equal(simulated.fixedOrder, true);
});

test('the memo is invisible to enumeration, copies and comparison', () => {
    const color = okhsl(10, 0.5, 0.5);
    const keys = Reflect.ownKeys(createColor({ mode: 'okhsl', h: 10, s: 0.5, l: 0.5 }))
        .filter((key) => typeof key === 'string');
    deltaE(color, okhsl(20, 0.5, 0.5), DISTANCE);
    simulateCvd({ colors: [color] }, 'tritanopia', 1);

    assert.deepEqual(Object.keys(color), keys);
    assert.deepEqual(Object.getOwnPropertySymbols({ ...color }), []);
    assert.equal(JSON.stringify(color), JSON.stringify({ ...color }));
});

// culori reads an object with no mode as already being in the space it is
// converted to, so { l, a, b } is measured as Lab. A memo can't express that,
// and with no registered channels it couldn't notice an edit either.
test('colors with no mode are measured the way culori measures them, edits included', () => {
    const a = { l: 50, a: 10, b: 20 };
    const b = { l: 60, a: -10, b: 5 };
    assert.equal(deltaE(a, b, DISTANCE), ciede2000(a, b));
    a.l = 90;
    assert.equal(deltaE(a, b, DISTANCE), ciede2000(a, b));
    assert.equal(pairwiseDeltaE([a], [b], DISTANCE)(0, 0), ciede2000(a, b));
});

test('a NaN channel is measured without a memo rather than re-memoized on every read', () => {
    const a = okhsl(NaN, 0.5, 0.5);
    const b = okhsl(200, 0.7, 0.4);
    assert.ok(Object.is(deltaE(a, b, DISTANCE), ciede2000(a, b)));
    assert.deepEqual(Object.getOwnPropertySymbols(a), []);
});

test('colors that cannot hold a memo are measured without one', () => {
    const frozen = Object.freeze(okhsl(10, 0.5, 0.5));
    const other = okhsl(200, 0.7, 0.4);
    assert.equal(deltaE(frozen, other, DISTANCE), ciede2000(frozen, other));
    assert.equal(deltaE('#ff0000', '#00ff00', DISTANCE), ciede2000('#ff0000', '#00ff00'));
    assert.equal(simulateCvd({ colors: [frozen] }, 'grayscale', 1).colors.length, 1);
});

// After a long run, every cached distance and simulation has been consulted
// thousands of times across colors that came and went. Scoring the final
// palette again from fresh objects, which have no memos, must reproduce the
// cost exactly; any stale entry would show up as a difference.
test('a full run ends on the cost a cold evaluation gives', () => {
    const config = createDefaultConfig();
    config.logProgress = false;
    config.colorCount = 6;
    config.maxIterations = 2000;
    const final = withSeed(3, () =>
        runWithOrderOptimization(prepareInitialState({ colors: [] }, config), config)
    );
    const fresh = final.colors.map((color) => createColor({ ...color }));
    assert.equal(cost({ ...final, colors: fresh }, config), final.cost);
});

// The caches only skip work, so a seeded run must produce the same palette,
// iteration count and cost to the last bit with them as without them. Compared
// on the same machine rather than against stored values, because the last bits
// of the floating-point math differ between platforms.
test('seeded runs are bit-identical with and without memoization', () => {
    const scenarios = [];

    const library = createDefaultConfig();
    library.colorCount = 6;
    scenarios.push([
        library,
        { colors: [{ color: '#d83f41', fixedColor: true }, { color: '#215bef', lockedChannels: [0] }] },
    ]);

    const oklch = createDefaultConfig();
    oklch.colorCount = 5;
    oklch.colorDistance = { method: 'cie94' };
    oklch.colorSpace = { mode: 'oklch', ranges: [[0.3, 0.9], [0.02, 0.32], [0, 360]] };
    oklch.evalFunctions.push({ function: avoid, weight: 0.5, colors: ['#00ff00'] });
    scenarios.push([oklch, { colors: [] }]);

    const run = (config, state) =>
        withSeed(7, () => {
            const final = runWithOrderOptimization(prepareInitialState(state, config), config);
            return { colors: final.colors.map(String), cost: final.cost, iterations: final.iterations };
        });

    for (const [config, state] of scenarios) {
        config.logProgress = false;
        config.maxIterations = 1500;
        const cached = run(config, state);
        setMemoization(false);
        try {
            assert.deepEqual(cached, run(config, state));
        } finally {
            setMemoization(true);
        }
    }
});
