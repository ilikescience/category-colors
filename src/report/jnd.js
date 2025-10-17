const Color = require('colorjs.io').default;
const simulateCvd = require('../core/simulateCvd');
const { deltaE } = require('../utils/deltaE');

const defaultOptions = {
    deltaEMethod: '2000',
    jndThreshold: 25,
    cvdSimulations: [],
    paletteSpace: null,
};

const toColorInstance = (color, paletteSpace) => {
    if (color instanceof Color) {
        return color;
    }
    const instance = new Color(color);
    if (paletteSpace) {
        return instance.to(paletteSpace);
    }
    return instance;
};

const formatColor = (color, paletteSpace) => {
    const target = paletteSpace ? color.to(paletteSpace) : color;
    if (!paletteSpace && target.space && target.space.id === 'srgb') {
        return target.toString({ format: 'hex' });
    }
    return target.toString({ precision: 4 });
};

const enumeratePairs = (colors, deltaEMethod, threshold) => {
    const issues = [];
    for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
            const deltaEValue = deltaE(colors[i], colors[j], { method: deltaEMethod });
            if (deltaEValue < threshold) {
                issues.push({ indexA: i, indexB: j, deltaE: deltaEValue });
            }
        }
    }
    return issues;
};

const analysePalette = (paletteColors, options) => {
    const { deltaEMethod, jndThreshold } = options;
    const issues = enumeratePairs(paletteColors, deltaEMethod, jndThreshold).map((issue) => ({
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
    const issues = enumeratePairs(simulated.colors, options.deltaEMethod, options.jndThreshold).map(
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
    const paletteColors = palette.map((color) => toColorInstance(color, resolved.paletteSpace));
    return buildReport(paletteColors, resolved);
};

module.exports = {
    reportJndIssues,
};
