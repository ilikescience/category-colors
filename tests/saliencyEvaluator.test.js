import test from 'node:test';
import assert from 'node:assert/strict';
import evaluateSaliency, { saliency } from '../src/evaluators/saliency/saliency.js';
import { createColor } from '../src/utils/paletteColor.js';

test('saliency is higher for a prototypical color than an ambiguous one', () => {
    // Pure red is named "red" by nearly everyone; a muddy olive-grey is not.
    assert.ok(saliency(createColor('#ff0000')) > saliency(createColor('#6b705c')));
});

// The evaluator is a cost, so the sign matters: minimizing it has to pull the
// palette toward colors people can name, not away from them.
test('evaluateSaliency costs less for a palette of nameable colors', () => {
    // Note the arrow: createColor takes (input, coords), so a bare .map(createColor)
    // would hand it the array index as coordinates.
    const nameable = { colors: ['#ff0000', '#0000ff', '#ffff00'].map((c) => createColor(c)) };
    const muddy = { colors: ['#6b705c', '#7d7461', '#8a7f6d'].map((c) => createColor(c)) };

    assert.ok(
        evaluateSaliency(nameable) < evaluateSaliency(muddy),
        'a nameable palette should be the cheaper one'
    );
});

test('evaluateSaliency stays within [0, 1] and is 0 for an empty palette', () => {
    assert.equal(evaluateSaliency({ colors: [] }), 0);
    for (const hex of ['#ff0000', '#6b705c', '#000000', '#ffffff']) {
        const value = evaluateSaliency({ colors: [createColor(hex)] });
        assert.ok(value >= 0 && value <= 1, `${hex} scored ${value}`);
    }
});

// Off-grid colors look up 0 saliency, which as a cost must be the maximum
// penalty. Scoring them free would reward the optimizer for leaving the gamut.
test('a color off the model grid costs the maximum', () => {
    const offGrid = { colors: [{ mode: 'lab65', l: 50, a: 200, b: 200 }] };
    assert.equal(evaluateSaliency(offGrid), 1);
});
