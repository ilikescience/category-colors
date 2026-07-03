const test = require('node:test');
const assert = require('node:assert/strict');
const evaluateContrast = require('../src/evaluators/contrast/contrast');
const { createColor } = require('../src/utils/paletteColor');

test('evaluateContrast returns lower cost for high contrast colors', () => {
    const descriptor = {
        background: '#ffffff',
        ratio: 3,
    };

    // High contrast palette (dark colors on white background)
    const highContrastState = {
        colors: [
            createColor('#000000'),
            createColor('#1a1a1a'),
            createColor('#2d2d2d'),
        ],
    };

    // Low contrast palette (light colors on white background)
    const lowContrastState = {
        colors: [
            createColor('#f0f0f0'),
            createColor('#e8e8e8'),
            createColor('#d0d0d0'),
        ],
    };

    const highContrastCost = evaluateContrast(highContrastState, {}, descriptor);
    const lowContrastCost = evaluateContrast(lowContrastState, {}, descriptor);

    assert.ok(
        highContrastCost < lowContrastCost,
        `High contrast should have lower cost (high: ${highContrastCost}, low: ${lowContrastCost})`
    );
});

test('evaluateContrast penalizes colors below contrast threshold', () => {
    const descriptor = {
        background: '#ffffff',
        ratio: 4.5, // WCAG AA text
    };

    // Color with insufficient contrast against white
    const lowContrastState = {
        colors: [createColor('#cccccc')],
    };

    // Color with sufficient contrast against white
    const highContrastState = {
        colors: [createColor('#595959')],
    };

    const lowContrastCost = evaluateContrast(lowContrastState, {}, descriptor);
    const highContrastCost = evaluateContrast(highContrastState, {}, descriptor);

    assert.ok(
        highContrastCost < lowContrastCost,
        `Sufficient contrast should have lower cost (sufficient: ${highContrastCost}, insufficient: ${lowContrastCost})`
    );
});

test('evaluateContrast works with dark backgrounds', () => {
    const descriptor = {
        background: '#000000',
        ratio: 3,
        checkAdjacent: false,
    };

    // Light colors should have good contrast on dark background
    const lightColorsState = {
        colors: [
            createColor('#ffffff'),
            createColor('#f0f0f0'),
            createColor('#e0e0e0'),
        ],
    };

    // Dark colors should have poor contrast on dark background
    const darkColorsState = {
        colors: [
            createColor('#1a1a1a'),
            createColor('#2d2d2d'),
            createColor('#404040'),
        ],
    };

    const lightColorsCost = evaluateContrast(lightColorsState, {}, descriptor);
    const darkColorsCost = evaluateContrast(darkColorsState, {}, descriptor);

    assert.ok(
        lightColorsCost < darkColorsCost,
        `Light colors on dark background should have lower cost (light: ${lightColorsCost}, dark: ${darkColorsCost})`
    );
});

test('evaluateContrast checks adjacent colors when enabled', () => {
    const baseDescriptor = {
        background: '#ffffff',
        ratio: 3,
        checkAdjacent: false,
    };

    const adjacentDescriptor = {
        ...baseDescriptor,
        checkAdjacent: true,
    };

    // Colors with poor contrast between adjacent pairs
    const state = {
        colors: [
            createColor('#ff0000'), // Red
            createColor('#ff1010'), // Slightly different red
            createColor('#ff2020'), // Another similar red
        ],
    };

    const costWithoutAdjacent = evaluateContrast(state, {}, baseDescriptor);
    const costWithAdjacent = evaluateContrast(state, {}, adjacentDescriptor);

    // With adjacent checking, similar colors should increase cost
    assert.ok(
        costWithAdjacent >= costWithoutAdjacent,
        `Adjacent color checking should not decrease cost (without: ${costWithoutAdjacent}, with: ${costWithAdjacent})`
    );
});

test('evaluateContrast normalizes cost by number of checks', () => {
    const descriptor = {
        background: '#ffffff',
        ratio: 3,
        checkAdjacent: false,
    };

    const smallPalette = {
        colors: [createColor('#000000')],
    };

    const largePalette = {
        colors: [
            createColor('#000000'),
            createColor('#000000'),
            createColor('#000000'),
            createColor('#000000'),
        ],
    };

    const smallCost = evaluateContrast(smallPalette, {}, descriptor);
    const largeCost = evaluateContrast(largePalette, {}, descriptor);

    // Cost should be similar (within 10%) since it's normalized
    const ratio = largeCost / smallCost;
    assert.ok(
        ratio > 0.9 && ratio < 1.1,
        `Normalized costs should be similar (small: ${smallCost}, large: ${largeCost}, ratio: ${ratio})`
    );
});

test('evaluateContrast handles different contrast ratio requirements', () => {
    const state = {
        colors: [createColor('#767676')], // This has ~4.5:1 contrast with white
    };

    const lowRequirement = {
        contrastBackground: '#ffffff',
        contrastRatio: 3, // Non-text WCAG
        checkAdjacentColors: false,
    };

    const mediumRequirement = {
        contrastBackground: '#ffffff',
        contrastRatio: 4.5, // AA text
        checkAdjacentColors: false,
    };

    const highRequirement = {
        contrastBackground: '#ffffff',
        contrastRatio: 7, // AAA text
        checkAdjacentColors: false,
    };

    const lowCost = evaluateContrast(state, lowRequirement);
    const mediumCost = evaluateContrast(state, mediumRequirement);
    const highCost = evaluateContrast(state, highRequirement);

    // Cost should increase as requirements get stricter
    assert.ok(
        mediumCost >= lowCost,
        `Medium requirement should have >= cost than low (low: ${lowCost}, medium: ${mediumCost})`
    );
    assert.ok(
        highCost >= mediumCost,
        `High requirement should have >= cost than medium (medium: ${mediumCost}, high: ${highCost})`
    );
});
