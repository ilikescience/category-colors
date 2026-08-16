/**
 * Custom Example: Ambient Data Series Colors
 *
 * Optimizing specific colors with locked hue channels and contrast requirements
 */

import { evaluators } from '../src/index.js';
import { generatePalette } from '../src/cli/generatePalette.js';

console.log('\n=== Ambient Data Series Color Optimization ===\n');

// Your starting colors with locked hue channels and fixed order
const initialColors = [
    { color: '#583b54', lockedChannels: [0], fixedOrder: true }, // ambient-data-series-1
    { color: '#be673a', lockedChannels: [0], fixedOrder: true }, // ambient-data-series-2
    { color: '#ddd4af', lockedChannels: [0], fixedOrder: true }, // ambient-data-series-3
    { color: '#d787a2', lockedChannels: [0], fixedOrder: true }, // ambient-data-series-4
    { color: '#5071ae', lockedChannels: [0], fixedOrder: true }, // ambient-data-series-5
    { color: '#82d8f7', lockedChannels: [0], fixedOrder: true }, // ambient-data-series-6
    { color: '#378d63', lockedChannels: [0], fixedOrder: true }, // ambient-data-series-7
    { color: '#c6d147', lockedChannels: [0], fixedOrder: true }, // ambient-data-series-8
];

const config = {
    evalFunctions: [
        { function: evaluators.jnd, weight: 0.3 },
        { function: evaluators.energy, weight: 0.3 },
        {
            function: evaluators.contrast,
            weight: 0.2,
            background: '#ffffff',
            ratio: 3, // WCAG non-text minimum
        },
    ],
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],   // hue (locked per color)
            [0.1, 0.80], // saturation
            [0.3, 0.90], // lightness
        ],
    },
    maxIterations: 10000,
};

console.log('Initial colors:');
initialColors.forEach((colorObj, i) => {
    console.log(`  ${i + 1}. ${colorObj.color}`);
});

const { finalState } = generatePalette({ state: initialColors, config });

console.log('\n✨ Optimized colors (with hue locked):');
finalState.colors.forEach((color) => {
    console.log(`${color.toString()},`);
});

console.log('\n✅ Optimization complete!\n');
