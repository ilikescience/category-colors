const simulateCvd = require('../core/simulateCvd');
const { deltaE } = require('../utils/deltaE');
const { createColor } = require('../utils/paletteColor');
const { converter, getMode } = require('culori');

const defaultOptions = {
    distanceMethod: 'ciede2000',
    distanceSpace: 'lab65',
    jndThreshold: 25,
    cvdSimulations: [],
    paletteSpace: null,
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
    // Extract coordinates directly from Culori color object
    const channels = getMode(paletteSpace).channels.filter(ch => ch !== 'alpha');
    const coords = channels.map(ch => converted[ch] ?? 0);
    return `${paletteSpace}(${coords.map((value) => Number(value.toFixed(4))).join(', ')})`;
};

const enumeratePairs = (colors, distanceOptions, threshold) => {
    const issues = [];
    for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
            const deltaEValue = deltaE(colors[i], colors[j], distanceOptions);
            if (deltaEValue < threshold) {
                issues.push({ indexA: i, indexB: j, deltaE: deltaEValue });
            }
        }
    }
    return issues;
};

const analysePalette = (paletteColors, options) => {
    const { distanceOptions, jndThreshold } = options;
    const issues = enumeratePairs(paletteColors, distanceOptions, jndThreshold).map((issue) => ({
        indexA: issue.indexA,
        indexB: issue.indexB,
        deltaE: Number(issue.deltaE.toFixed(3)),
        colors: [
            formatColor(paletteColors[issue.indexA], options.paletteSpace),
            formatColor(paletteColors[issue.indexB], options.paletteSpace),
        ],
    }));
    return {
        label: 'normal',
        description: 'Base case (no CVD simulation)',
        issues,
        issueCount: issues.length,
    };
};

const simulatePalette = (paletteColors, simulation, options) => {
    const state = { colors: paletteColors };
    const simulated = simulateCvd(state, simulation.type, simulation.severity);
    const issues = enumeratePairs(simulated.colors, options.distanceOptions, options.jndThreshold).map(
        (issue) => ({
            indexA: issue.indexA,
            indexB: issue.indexB,
            deltaE: Number(issue.deltaE.toFixed(3)),
            colors: [
                formatColor(simulated.colors[issue.indexA], options.paletteSpace),
                formatColor(simulated.colors[issue.indexB], options.paletteSpace),
            ],
        })
    );
    return {
        label: `${simulation.type}:${simulation.severity}`,
        description: `CVD simulation (${simulation.type}, severity ${simulation.severity})`,
        issues,
        issueCount: issues.length,
    };
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

module.exports = {
    reportJndIssues,
};
