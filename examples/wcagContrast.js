/**
 * Example: WCAG Contrast Optimization
 *
 * This example demonstrates how to use the WCAG contrast evaluator
 * to generate color palettes that meet accessibility requirements.
 */

import { evaluators } from '../src/index.js';
import { generatePalette } from '../src/cli/generatePalette.js';

// Example 1: Optimize for 3:1 contrast with white background (WCAG non-text)
console.log('\n=== Example 1: Non-text WCAG (3:1 contrast on white) ===\n');

const config1 = {
    evalFunctions: [
        { function: evaluators.energy, weight: 0.2 },
        { function: evaluators.jnd, weight: 0.2 },
        {
            function: evaluators.contrast,
            weight: 0.6,
            background: '#ffffff',
            ratio: 3, // WCAG non-text minimum
        },
    ],
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],   // hue
            [0.4, 1.0], // saturation
            [0.2, 0.7], // lightness (darker colors for better contrast on white)
        ],
    },
    maxIterations: 10000,
    colorCount: 6,
};

const { finalState: result1 } = generatePalette({ config: config1 });
console.log('Colors optimized for 3:1 contrast on white background:');
result1.colors.forEach((color, i) => {
    console.log(`  ${i + 1}. ${color.toString()}`);
});

// Example 2: Optimize for 4.5:1 contrast with white background (WCAG AA text)
console.log('\n=== Example 2: WCAG AA Text (4.5:1 contrast on white) ===\n');

const config2 = {
    ...config1,
    evalFunctions: [
        { function: evaluators.energy, weight: 0.2 },
        { function: evaluators.jnd, weight: 0.2 },
        {
            function: evaluators.contrast,
            weight: 0.6,
            background: '#ffffff',
            ratio: 4.5, // WCAG AA text
        },
    ],
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],   // hue
            [0.4, 1.0], // saturation
            [0.2, 0.6], // lightness (even darker for higher contrast)
        ],
    },
};

const { finalState: result2 } = generatePalette({ config: config2 });
console.log('Colors optimized for 4.5:1 contrast on white background (AA text):');
result2.colors.forEach((color, i) => {
    console.log(`  ${i + 1}. ${color.toString()}`);
});

// Example 3: Dark mode - optimize for contrast with black background
console.log('\n=== Example 3: Dark Mode (3:1 contrast on black) ===\n');

const config3 = {
    evalFunctions: [
        { function: evaluators.energy, weight: 0.2 },
        { function: evaluators.jnd, weight: 0.2 },
        {
            function: evaluators.contrast,
            weight: 0.6,
            background: '#000000', // Black background
            ratio: 3,
        },
    ],
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],   // hue
            [0.4, 1.0], // saturation
            [0.5, 0.9], // lightness (lighter colors for contrast on black)
        ],
    },
    maxIterations: 10000,
    colorCount: 6,
};

const { finalState: result3 } = generatePalette({ config: config3 });
console.log('Colors optimized for 3:1 contrast on black background:');
result3.colors.forEach((color, i) => {
    console.log(`  ${i + 1}. ${color.toString()}`);
});

// Example 4: Adjacent color contrast checking
console.log('\n=== Example 4: Adjacent Color Contrast ===\n');

const config4 = {
    evalFunctions: [
        { function: evaluators.energy, weight: 0.15 },
        { function: evaluators.jnd, weight: 0.15 },
        {
            function: evaluators.contrast,
            weight: 0.7,
            background: '#ffffff',
            ratio: 3,
            checkAdjacent: true, // Enable adjacent color contrast checking
        },
    ],
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],
            [0.4, 0.9],
            [0.3, 0.7],
        ],
    },
    maxIterations: 10000,
    colorCount: 5,
};

const { finalState: result4 } = generatePalette({ config: config4 });
console.log('Colors with adjacent contrast checking enabled:');
result4.colors.forEach((color, i) => {
    console.log(`  ${i + 1}. ${color.toString()}`);
});

// Example 5: Combining channel locking with contrast optimization
console.log('\n=== Example 5: Brand Colors with Contrast Optimization ===\n');

const brandColors = [
    { color: '#e74c3c', lockedChannels: [0] }, // Brand red - lock hue
    { color: '#3498db', lockedChannels: [0] }, // Brand blue - lock hue
    { color: '#2ecc71', lockedChannels: [0] }, // Brand green - lock hue
    { color: '#f39c12', lockedChannels: [0] }, // Brand orange - lock hue
];

const config5 = {
    evalFunctions: [
        { function: evaluators.energy, weight: 0.2 },
        {
            function: evaluators.contrast,
            weight: 0.8,
            background: '#ffffff',
            ratio: 3,
        },
    ],
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],
            [0.3, 1.0],
            [0.2, 0.7],
        ],
    },
    maxIterations: 10000,
};

const { finalState: result5 } = generatePalette({ state: brandColors, config: config5 });
console.log('Brand colors optimized for contrast (hue preserved):');
result5.colors.forEach((color, i) => {
    console.log(`  ${i + 1}. ${color.toString()}`);
});

console.log('\n✅ WCAG contrast examples complete!\n');
