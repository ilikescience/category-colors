import test from 'node:test';
import assert from 'node:assert/strict';
import evaluateAvoid from '../src/evaluators/avoid/avoid.js';
import { createColor } from '../src/utils/paletteColor.js';

test('evaluateAvoid penalizes colors near an avoid color', () => {
    const descriptor = { colors: ['#ff0000'], radius: 0.2 };

    const nearState = { colors: [createColor('#f01010')] };
    const farState = { colors: [createColor('#0000ff')] };

    const nearCost = evaluateAvoid(nearState, {}, descriptor);
    const farCost = evaluateAvoid(farState, {}, descriptor);

    assert.ok(
        nearCost > farCost,
        `Near-avoid color should cost more (near: ${nearCost}, far: ${farCost})`
    );
    assert.equal(farCost, 0, 'Colors outside every radius should cost nothing');
});

test('evaluateAvoid charges the full penalty for an exact match', () => {
    const descriptor = { colors: ['#ff0000'], radius: 0.2 };
    const state = { colors: [createColor('#ff0000')] };

    assert.equal(evaluateAvoid(state, {}, descriptor), 1);
});

test('evaluateAvoid uses the nearest avoid color', () => {
    const oneAvoid = { colors: ['#0000ff'], radius: 0.2 };
    const twoAvoids = { colors: ['#0000ff', '#ff0000'], radius: 0.2 };
    const state = { colors: [createColor('#f01010')] };

    const oneCost = evaluateAvoid(state, {}, oneAvoid);
    const twoCost = evaluateAvoid(state, {}, twoAvoids);

    assert.ok(
        twoCost > oneCost,
        `Adding a nearby avoid color should raise cost (one: ${oneCost}, two: ${twoCost})`
    );
});

test('evaluateAvoid averages over the palette', () => {
    const descriptor = { colors: ['#ff0000'], radius: 0.2 };
    const mixedState = {
        colors: [createColor('#ff0000'), createColor('#0000ff')],
    };

    // One exact hit (cost 1) and one clear miss (cost 0) average to 0.5
    assert.equal(evaluateAvoid(mixedState, {}, descriptor), 0.5);
});

test('evaluateAvoid scores 0 with no avoid colors or empty palette', () => {
    const state = { colors: [createColor('#ff0000')] };

    assert.equal(evaluateAvoid(state, {}, {}), 0);
    assert.equal(evaluateAvoid(state, {}, { colors: [] }), 0);
    assert.equal(evaluateAvoid({ colors: [] }, {}, { colors: ['#ff0000'] }), 0);
});

test('evaluateAvoid falls back to the default radius for invalid values', () => {
    const state = { colors: [createColor('#f01010')] };
    const base = evaluateAvoid(state, {}, { colors: ['#ff0000'] });

    for (const radius of [0, -1, NaN, 'wide']) {
        assert.equal(evaluateAvoid(state, {}, { colors: ['#ff0000'], radius }), base);
    }
});

test('a larger radius reaches further', () => {
    const state = { colors: [createColor('#ff8080')] };

    const narrow = evaluateAvoid(state, {}, { colors: ['#ff0000'], radius: 0.05 });
    const wide = evaluateAvoid(state, {}, { colors: ['#ff0000'], radius: 0.5 });

    assert.ok(
        wide > narrow,
        `Wider radius should penalize more (narrow: ${narrow}, wide: ${wide})`
    );
});

test('evaluateAvoid clamps radius to a maximum of 1', () => {
    const state = { colors: [createColor('#ff8080')] };

    const atOne = evaluateAvoid(state, {}, { colors: ['#ff0000'], radius: 1 });
    const aboveOne = evaluateAvoid(state, {}, { colors: ['#ff0000'], radius: 5 });

    assert.equal(aboveOne, atOne, 'radius above 1 should behave like radius 1');
});

test('evaluateAvoid measures avoid colors exactly, not coerced into the working ranges', () => {
    // A working space whose saturation cap (0.4) sits well below #ff0000's
    // true okhsl saturation (~1). If the avoid color were coerced into these
    // ranges it would become a duller red, and an exact #ff0000 palette color
    // would no longer be a perfect match.
    const config = {
        colorSpace: {
            mode: 'okhsl',
            ranges: [[0, 360], [0.2, 0.4], [0.3, 0.9]],
        },
    };
    const descriptor = { colors: ['#ff0000'], radius: 0.2 };
    const state = { colors: [createColor('#ff0000')] };

    assert.equal(
        evaluateAvoid(state, config, descriptor),
        1,
        'exact match against the raw avoid color should still be a full penalty'
    );
});

test('evaluateAvoid honors a non-default distance metric', () => {
    const descriptor = { colors: ['#ff0000'], radius: 0.2 };
    const near = { colors: [createColor('#f01010')] };

    const ciede = evaluateAvoid(near, {}, descriptor);
    const euclidean = evaluateAvoid(near, { colorDistance: { method: 'euclidean' } }, descriptor);

    // The same colors under a different metric must produce a different cost,
    // proving the resolved distance options actually flow through.
    assert.notEqual(ciede, euclidean);

    // Exact matches are a full penalty regardless of the metric.
    const exact = { colors: [createColor('#ff0000')] };
    assert.equal(
        evaluateAvoid(exact, { colorDistance: { method: 'euclidean' } }, descriptor),
        1
    );
});
