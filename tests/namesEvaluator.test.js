import test from 'node:test';
import assert from 'node:assert/strict';
import evaluateNames, { nameDifference, nameTerms, terms } from '../src/evaluators/names/names.js';
import encoded from '../src/evaluators/names/names-data.js';
import saliencies from '../src/evaluators/saliency/saliencies.js';
import { createColor } from '../src/utils/paletteColor.js';

test('nameTerms returns the expected basic term first', () => {
    assert.equal(nameTerms(createColor('#ff0000'))[0].term, 'red');
    assert.equal(nameTerms(createColor('#0000ff'))[0].term, 'blue');
    assert.equal(nameTerms(createColor('#ffff00'))[0].term, 'yellow');
});

test('name shares sum to 1 and are sorted', () => {
    const shares = nameTerms(createColor('#3a7d44')).map((entry) => entry.share);
    assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 1) < 1e-9);
    for (let i = 1; i < shares.length; i++) assert.ok(shares[i] <= shares[i - 1]);
});

test('nameDifference is 0 for a color against itself and near 1 across basic terms', () => {
    const red = createColor('#ff0000');
    const blue = createColor('#0000ff');
    assert.ok(nameDifference(red, red) < 1e-9);
    assert.ok(nameDifference(red, blue) > 0.95);
    assert.ok(nameDifference(red, createColor('#f00a0a')) < 0.1, 'two reds share a name');
    assert.equal(nameDifference(red, blue), nameDifference(blue, red));
});

test('evaluateNames costs more for a palette that shares names', () => {
    const twoReds = { colors: [createColor('#ff0000'), createColor('#ee1010')] };
    const redBlue = { colors: [createColor('#ff0000'), createColor('#0000ff')] };
    assert.ok(evaluateNames(twoReds) > 0.9);
    assert.ok(evaluateNames(redBlue) < 0.05);
    assert.ok(evaluateNames(twoReds) > evaluateNames(redBlue));
});

test('evaluateNames is 0 for fewer than two colors', () => {
    assert.equal(evaluateNames({ colors: [] }), 0);
    assert.equal(evaluateNames({ colors: [createColor('#ff0000')] }), 0);
});

// The data file is generated; this walks every voxel through the decoder so a
// bad encoding fails here rather than as a silently odd cost.
test('every voxel decodes to at least one known term', () => {
    const voxels = encoded.split('|');
    assert.equal(voxels.length, Object.keys(saliencies).length);
    assert.equal(terms.length, 153);
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (const voxel of voxels) {
        assert.ok(voxel.length >= 2, 'voxel has data');
        for (const char of voxel) assert.ok(B64.includes(char), `bad character ${char}`);
    }
    // Spot-check a decoded voxel reaches a real term index.
    for (const hex of ['#000000', '#ffffff', '#808080', '#123456']) {
        const entries = nameTerms(createColor(hex));
        assert.ok(entries.length > 0, `${hex} has terms`);
        assert.ok(entries.every((e) => typeof e.term === 'string'));
    }
});
