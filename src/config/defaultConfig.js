const { palettes } = require('../data');
const { colorBrewer3_10 } = palettes;
const evaluators = require('../evaluators');

const createDefaultConfig = () => ({
    evalFunctions: [
        { function: evaluators.energy, weight: 0.15 },
        { function: evaluators.range, weight: 0.15 },
        { function: evaluators.jnd, weight: 0.15 },
        {
            function: evaluators.jnd,
            weight: 0.5,
            cvd: { type: 'protanomaly', severity: 0.5 },
        },
        {
            function: evaluators.jnd,
            weight: 0.15,
            cvd: { type: 'deuteranomaly', severity: 0.5 },
        },
        { function: evaluators.similarity, weight: 1 },
    ],
    coolingRate: 0.999,
    cutoff: 0.0001,
    maxIterations: 100000,
    colorDistance: {
        method: 'ciede2000',
    },
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],   // hue
            [0.2, 0.8], // saturation
            [0.7, 1], // lightness
        ],
    },
    jnd: 20,
    maxMutationDistance: 0.15,
    minMutationDistance: 0.005,
    similarityTarget: colorBrewer3_10.slice(),
    initialTemperatureSamples: 100,
    initialAcceptanceRate: 0.95,
});

module.exports = {
    createDefaultConfig,
};
