import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareInitialState } from '../src/core/state.js';
import { getNeighbor } from '../src/core/getNeighbor.js';
import { createDefaultConfig } from '../src/config/defaultConfig.js';
import { randomFrom } from '../src/utils/random.js';
import { differenceEuclidean } from 'culori';

const config = (seed) => ({ ...createDefaultConfig(), logProgress: false, seed });

// jnd's deltas are heavy-tailed; a mean over them gave starting temperatures
// up to 2e10, so a run spent its first ~20k steps as random restarts.
test('the starting temperature is finite and on the scale of a typical move', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
        const state = prepareInitialState({ colors: [] }, config(seed));
        assert.ok(Number.isFinite(state.temperature) && state.temperature > 0, `seed ${seed}: ${state.temperature}`);
        assert.ok(state.temperature < 1e5, `seed ${seed}: ${state.temperature}`);
        assert.equal(state.initialTemperature, state.temperature);
    }
});

// The same draws at three temperatures: steps shrink along the schedule rather
// than staying full-size until the temperature drops below 1, which is still
// in cost units a hundredth of the way down from the start.
const totalStep = (state, cfg) => {
    const random = randomFrom({ seed: 9 });
    let total = 0;
    for (let i = 0; i < 50; i += 1) {
        const next = getNeighbor(state, cfg, random);
        total += next.colors.reduce((sum, color, j) => sum + differenceEuclidean('okhsl')(color, state.colors[j]), 0);
    }
    return total;
};

test('mutations shrink from full size at the start to the minimum at the cutoff', () => {
    const cfg = config(1);
    const state = prepareInitialState({ colors: [] }, cfg);
    const start = totalStep(state, cfg);
    const middle = totalStep({ ...state, temperature: state.temperature / 100 }, cfg);
    const end = totalStep({ ...state, temperature: cfg.cutoff }, cfg);
    assert.ok(start > middle && middle > end, `start ${start}, middle ${middle}, end ${end}`);
});
