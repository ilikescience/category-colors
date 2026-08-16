import simulateCvd from '../core/simulateCvd.js';
import { deltaE } from '../utils/deltaE.js';
import { createColor, getChannels } from '../utils/paletteColor.js';
import { converter } from 'culori';

const defaultOptions = {
    distanceMethod: 'ciede2000',
    distanceSpace: 'lab65',
    jndThreshold: 25,
    cvdSimulations: [],
    paletteSpace: null,
    includePairs: true,
};

const toColorInstance = (color) => {
    // Check if it's already a color object with our custom properties
    if (color && typeof color === 'object' && 'mode' in color && 'fixedColor' in color) {
        return color;
    }
    if (typeof color === 'string') {
        return createColor(color);
    }
    if (Array.isArray(color)) {
        return createColor('srgb', color);
    }
    if (color && color.mode) {
        return createColor(color);
    }
    throw new Error('Unsupported color format in palette.');
};

const formatColor = (color, paletteSpace) => {
    if (!paletteSpace) {
        return color.toString({ format: 'hex' });
    }
    const converted = converter(paletteSpace)(color);
    const channels = getChannels(paletteSpace) || [];
    const coords = channels.map(ch => converted[ch] ?? 0);
    return `${paletteSpace}(${coords.map((value) => Number(value.toFixed(4))).join(', ')})`;
};

/**
 * Builds one test's pair records.
 *
 * Colors are formatted once each up front rather than once per pair: every
 * color appears in n-1 pairs, so formatting inside the loop re-runs a culori
 * conversion O(n^2) times to produce n distinct strings.
 *
 * `issues` is a filtered view of `pairs` and shares its objects, the way
 * Array#filter always does. The threshold test runs on the full-precision
 * distance, before it is rounded for display.
 */
const buildTest = (label, description, testColors, options) => {
    const { distanceOptions, jndThreshold, paletteSpace, includePairs } = options;
    const formatted = testColors.map((color) => formatColor(color, paletteSpace));

    const pairs = [];
    const issues = [];
    for (let i = 0; i < testColors.length; i++) {
        for (let j = i + 1; j < testColors.length; j++) {
            const distance = deltaE(testColors[i], testColors[j], distanceOptions);
            const pair = {
                indexA: i,
                indexB: j,
                deltaE: Number(distance.toFixed(3)),
                colors: [formatted[i], formatted[j]],
            };
            pairs.push(pair);
            if (distance < jndThreshold) {
                issues.push(pair);
            }
        }
    }

    const test = { label, description, issues, issueCount: issues.length };
    // Opt-out: `pairs` is O(n^2) per test and is mostly pairs that passed, which
    // dominates a serialized report. Callers that only want the failures — the
    // CLI's default output among them — can leave it off.
    if (includePairs !== false) {
        test.pairs = pairs;
    }
    return test;
};

const analysePalette = (paletteColors, options) =>
    buildTest('normal', 'Base case (no CVD simulation)', paletteColors, options);

const simulatePalette = (paletteColors, simulation, options) => {
    const state = { colors: paletteColors };
    const simulated = simulateCvd(state, simulation.type, simulation.severity);
    return buildTest(
        `${simulation.type}:${simulation.severity}`,
        `CVD simulation (${simulation.type}, severity ${simulation.severity})`,
        simulated.colors,
        options
    );
};

const buildReport = (paletteColors, options) => {
    const tests = [];
    tests.push(analysePalette(paletteColors, options));
    if (options.cvdSimulations && options.cvdSimulations.length > 0) {
        for (const simulation of options.cvdSimulations) {
            tests.push(simulatePalette(paletteColors, simulation, options));
        }
    }
    return {
        totalIssues: tests.reduce((acc, test) => acc + test.issueCount, 0),
        tests,
    };
};

const reportJndIssues = (palette, options = {}) => {
    if (!Array.isArray(palette) || palette.length < 2) {
        throw new Error('Palette must contain at least two colors.');
    }
    const resolved = { ...defaultOptions, ...options };
    resolved.distanceMethod = resolved.distanceMethod || resolved.deltaEMethod || 'ciede2000';
    resolved.distanceSpace = resolved.distanceSpace || resolved.distanceOptions?.space || 'lab65';
    resolved.distanceOptions = {
        method: resolved.distanceMethod,
        space: resolved.distanceSpace,
        cmc: resolved.cmc,
    };
    const paletteColors = palette.map((color) => toColorInstance(color));
    return buildReport(paletteColors, resolved);
};

export { reportJndIssues };
