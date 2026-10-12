import test from 'node:test';
import assert from 'node:assert/strict';
import { converter, differenceCiede2000, differenceCie94, filterDeficiencyDeuter } from 'culori';
import {
    cost,
    createColor,
    createDefaultConfig,
    deltaE,
    prepareInitialState,
    runWithOrderOptimization,
    simulateCvd,
} from '../src/index.js';
import { paletteDeltaE } from '../src/utils/deltaE.js';
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

test('paletteDeltaE agrees with deltaE and sees edits made between calls', () => {
    const colors = [okhsl(10, 0.5, 0.5), okhsl(200, 0.7, 0.4), okhsl(90, 0.3, 0.8)];
    const first = paletteDeltaE(colors, DISTANCE);
    assert.equal(first(0, 2), deltaE(colors[0], colors[2], DISTANCE));

    colors[2].s = 0.6;
    const second = paletteDeltaE(colors, DISTANCE);
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

// Captured from 3.0.1, before any of this caching existed. The caches only
// skip work, so seeded runs must still reproduce these exactly. If a change
// to the algorithm itself moves them, regenerate them on purpose.
test('seeded runs reproduce the palettes generated before caching', () => {
    const run = (config, state) =>
        withSeed(7, () => {
            const final = runWithOrderOptimization(prepareInitialState(state, config), config);
            return { colors: final.colors.map(String), cost: final.cost, iterations: final.iterations };
        });

    const okhslConfig = createDefaultConfig();
    okhslConfig.logProgress = false;
    okhslConfig.colorCount = 6;
    okhslConfig.maxIterations = 1500;
    assert.deepEqual(
        run(okhslConfig, {
            colors: [{ color: '#d83f41', fixedColor: true }, { color: '#215bef', lockedChannels: [0] }],
        }),
        {
            colors: ['#e0e2eb', '#d83f41', '#741463', '#524238', '#1f408b', '#7c1b31'],
            cost: 293.14765861651915,
            iterations: 1500,
        }
    );

    const oklchConfig = createDefaultConfig();
    oklchConfig.logProgress = false;
    oklchConfig.colorCount = 5;
    oklchConfig.maxIterations = 1500;
    oklchConfig.colorDistance = { method: 'cie94' };
    oklchConfig.colorSpace = { mode: 'oklch', ranges: [[0.3, 0.9], [0.02, 0.32], [0, 360]] };
    assert.deepEqual(run(oklchConfig, { colors: [] }), {
        colors: ['#ffa600', '#600000', '#d8f100', '#950000', '#ffb200'],
        cost: 420.300906853935,
        iterations: 1500,
    });
});
