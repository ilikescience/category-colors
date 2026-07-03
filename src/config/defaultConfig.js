const evaluators = require('../evaluators');

const createDefaultConfig = () => ({
    evalFunctions: [
        { function: evaluators.energy, weight: 0.15 },
        { function: evaluators.range, weight: 0.15 },
        { function: evaluators.jnd, weight: 0.15 },
        {
            function: evaluators.jnd,
            weight: 0.15,
            cvd: { type: 'protanomaly', severity: 0.5 },
        },
        {
            function: evaluators.jnd,
            weight: 0.5,
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
            [0.3, 0.9], // lightness
        ],
    },
    jnd: 20,
    maxMutationDistance: 0.15,
    minMutationDistance: 0.005,
    similarityTarget: [
        '#F1781E',
        '#D83F41',
        '#8F4CB3',
        '#215BEF',
        '#009919'
    ],
    initialTemperatureSamples: 100,
    initialAcceptanceRate: 0.95,
    colorCount: 8
});

module.exports = {
    createDefaultConfig,
};
