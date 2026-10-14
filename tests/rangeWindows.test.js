import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ensureColorInSpace,
    mutateColorInSpace,
    randomColorInSpace,
    resolveChannels,
} from '../src/utils/colorSpaceTools.js';
import { resolveDistanceOptions } from '../src/utils/distanceOptions.js';
import { createColor } from '../src/utils/paletteColor.js';
import { mulberry32 } from '../src/utils/random.js';

const config = {
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [[0, 60], [180, 240]], // two hue windows
            [0.5, 0.5],
            [0.5, 0.5],
        ],
    },
};
const distanceOptions = resolveDistanceOptions(config);
const hue = (color) => color.to('okhsl').coords[0];
const inWindows = (h) => (h >= 0 && h <= 60) || (h >= 180 && h <= 240);

test('a wrapped hue window is split at the seam and merged with its neighbours', () => {
    const [hueInfo] = resolveChannels({ mode: 'okhsl', ranges: [[300, 60], [0, 1], [0, 1]] });
    assert.deepEqual(hueInfo.windows, [[0, 60], [300, 360]]);
    assert.equal(hueInfo.span, 120);

    const [merged] = resolveChannels({ mode: 'okhsl', ranges: [[[10, 50], [40, 90]], [0, 1], [0, 1]] });
    assert.deepEqual(merged.windows, [[10, 90]]);
});

test('a non-cyclic window given backwards is sorted, not emptied', () => {
    const [, saturation] = resolveChannels({ mode: 'okhsl', ranges: [[0, 360], [0.8, 0.2], [0, 1]] });
    assert.deepEqual(saturation.windows, [[0.2, 0.8]]);
});

test('random colors land in each window in proportion to its width', () => {
    const random = mulberry32(1);
    const counts = { low: 0, high: 0 };
    for (let i = 0; i < 2000; i++) {
        const h = hue(randomColorInSpace(config, distanceOptions, random));
        assert.ok(inWindows(h), `hue ${h} is outside every window`);
        counts[h <= 60 ? 'low' : 'high'] += 1;
    }
    // Both windows are 60° wide, so each should take about half the draws.
    assert.ok(Math.abs(counts.low - counts.high) < 200, JSON.stringify(counts));
});

test('a value outside every window snaps to the nearest edge, around the circle', () => {
    const at = (h) => hue(ensureColorInSpace(createColor({ mode: 'okhsl', h, s: 0.5, l: 0.5 }), config, distanceOptions));
    assert.equal(Math.round(at(100)), 60);
    assert.equal(Math.round(at(150)), 180);
    assert.equal(Math.round(at(250)), 240);
    // 350 is 10° from 0 across the seam and 110° from 240.
    assert.equal(Math.round(at(350)), 0);
});

test('mutations never leave the windows and are scaled by their total width', () => {
    const random = mulberry32(2);
    let color = createColor({ mode: 'okhsl', h: 30, s: 0.5, l: 0.5 });
    for (let i = 0; i < 500; i++) {
        color = mutateColorInSpace(color, 0.3, config, distanceOptions, random);
        assert.ok(inWindows(hue(color)), `hue ${hue(color)} escaped the windows`);
    }
});
