import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareInitialState } from '../src/core/state.js';
import { runWithOrderOptimization } from '../src/core/annealing.js';
import { createDefaultConfig } from '../src/config/defaultConfig.js';
import { generatePalette } from '../src/cli/generatePalette.js';
import { randomFrom } from '../src/utils/random.js';

// Small enough to run in a few milliseconds, with a blank slot so the initial
// colors are drawn too.
const quickConfig = (seed) => ({
    ...createDefaultConfig(),
    colorCount: 4,
    maxIterations: 200,
    initialTemperatureSamples: 10,
    logProgress: false,
    seed,
});

const palette = (config) => {
    const state = { colors: ['#F1781E', '#D83F41', '#8F4CB3'], temperature: 1, iterations: 0, cost: Infinity };
    return runWithOrderOptimization(prepareInitialState(state, config), config).colors.map(String);
};

test('the same seed reproduces a run, and a different seed does not', () => {
    assert.deepEqual(palette(quickConfig(7)), palette(quickConfig(7)));
    assert.notDeepEqual(palette(quickConfig(7)), palette(quickConfig(8)));
});

test('a seeded run never touches Math.random', () => {
    const original = Math.random;
    Math.random = () => {
        throw new Error('Math.random was called during a seeded run');
    };
    try {
        palette(quickConfig(3));
    } finally {
        Math.random = original;
    }
});

test('an absent seed falls back to Math.random and a bad one is rejected', () => {
    assert.equal(randomFrom({}), Math.random);
    assert.equal(randomFrom({ seed: null }), Math.random);
    assert.throws(() => randomFrom({ seed: 1.5 }), /integer/);
    assert.throws(() => randomFrom({ seed: '7' }), /integer/);
});

test('generatePalette echoes the seed it used, drawing one when none is given', () => {
    const options = { config: { colorCount: 4, maxIterations: 200, initialTemperatureSamples: 10 }, logProgress: false };
    const first = generatePalette(options);
    assert.ok(Number.isInteger(first.seed), 'should report an integer seed');
    assert.equal(first.config.seed, first.seed);

    const repeat = generatePalette({ ...options, config: { ...options.config, seed: first.seed } });
    assert.equal(repeat.seed, first.seed);
    assert.deepEqual(repeat.finalState.colors.map(String), first.finalState.colors.map(String));
});
