/**
 * Example: Channel Locking
 *
 * This example demonstrates how to lock specific color channels during optimization.
 * This is useful when you want to preserve certain aspects of colors (like hue)
 * while allowing others (like saturation and lightness) to vary.
 */

import { evaluators } from '../src/index.js';
import { generatePalette } from '../src/cli/generatePalette.js';

// Example 1: Lock hue while allowing saturation and lightness to vary
console.log('\n=== Example 1: Lock Hue ===\n');

const config1 = {
    evalFunctions: [
        { function: evaluators.energy, weight: 0.3 },
        { function: evaluators.jnd, weight: 0.3 },
        {
            function: evaluators.contrast,
            weight: 0.4,
            background: '#ffffff',
            ratio: 3, // WCAG non-text minimum
        },
    ],
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],   // hue
            [0.3, 0.9], // saturation
            [0.3, 0.8], // lightness
        ],
    },
    maxIterations: 5000,
};

const initialColors1 = [
    { color: '#ff0000', lockedChannels: [0] }, // Lock hue (red)
    { color: '#00ff00', lockedChannels: [0] }, // Lock hue (green)
    { color: '#0000ff', lockedChannels: [0] }, // Lock hue (blue)
    { color: '#ffff00', lockedChannels: [0] }, // Lock hue (yellow)
];

const { finalState: result1 } = generatePalette({ state: initialColors1, config: config1 });
console.log('Colors with locked hue:');
result1.colors.forEach((color, i) => {
    console.log(`  ${i + 1}. ${color.toString()}`);
});

// Example 2: Lock hue and saturation, vary only lightness
console.log('\n=== Example 2: Lock Hue and Saturation ===\n');

const initialColors2 = [
    { color: '#e74c3c', lockedChannels: [0, 1] }, // Lock hue & saturation
    { color: '#3498db', lockedChannels: [0, 1] },
    { color: '#2ecc71', lockedChannels: [0, 1] },
    { color: '#f39c12', lockedChannels: [0, 1] },
];

const config2 = {
    ...config1,
    evalFunctions: [
        {
            function: evaluators.contrast,
            weight: 1.0,
            background: '#ffffff',
            ratio: 3,
        },
    ],
    maxIterations: 3000,
};

const { finalState: result2 } = generatePalette({ state: initialColors2, config: config2 });
console.log('Colors with locked hue and saturation (only lightness varies):');
result2.colors.forEach((color, i) => {
    console.log(`  ${i + 1}. ${color.toString()}`);
});

// Example 3: Mix of locked and unlocked colors
console.log('\n=== Example 3: Mix of Locked and Unlocked Colors ===\n');

const initialColors3 = [
    { color: '#ff0000', lockedChannels: [0] }, // Red hue locked
    '#00ff00',                                   // Fully mutable
    { color: '#0000ff', lockedChannels: [0] }, // Blue hue locked
    '#ffff00',                                   // Fully mutable
];

const { finalState: result3 } = generatePalette({ state: initialColors3, config: config1 });
console.log('Mix of locked and unlocked colors:');
result3.colors.forEach((color, i) => {
    const locked = Array.isArray(color.lockedChannels) && color.lockedChannels.length > 0;
    console.log(`  ${i + 1}. ${color.toString()} ${locked ? '(hue locked)' : '(fully mutable)'}`);
});

console.log('\n✅ Channel locking examples complete!\n');
