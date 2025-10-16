const test = require('node:test');
const assert = require('node:assert/strict');

const api = require('../src');

test('public API exposes core helpers, evaluators, and config factories', () => {
    assert.ok(api.core, 'core namespace should exist');
    assert.equal(typeof api.core.runSimulatedAnnealing, 'function');
    assert.equal(typeof api.core.runWithOrderOptimization, 'function');
    assert.equal(typeof api.core.prepareInitialState, 'function');

    assert.ok(api.evaluators, 'evaluators namespace should exist');
    assert.equal(typeof api.evaluators.energy, 'function');
    assert.equal(typeof api.evaluators.range, 'function');

    assert.ok(api.config, 'config namespace should exist');
    assert.equal(typeof api.config.createDefaultConfig, 'function');
    assert.equal(typeof api.config.createDefaultState, 'function');

    assert.ok(api.data, 'data namespace should exist');
});
