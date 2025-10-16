const Color = require('colorjs.io').default;
const evaluators = require('../evaluators');

const createDefaultConfig = () => ({
    colorCount: 8,
    evalFunctions: [
        { function: evaluators.energy, weight: 1 },
        { function: evaluators.range, weight: 1 },
        { function: evaluators.jnd, weight: 1 },
        {
            function: evaluators.jnd,
            weight: 1,
            cvd: { type: 'protanomaly', severity: 0.5 },
        },
        {
            function: evaluators.jnd,
            weight: 1,
            cvd: { type: 'deuteranomaly', severity: 0.5 },
        },
        { function: evaluators.similarity, weight: 1 },
    ],
    coolingRate: 0.999,
    cutoff: 0.0001,
    maxIterations: 100000,
    deltaEMethod: '2000',
    jnd: 25,
    hueRange: [0, 1],
    saturationRange: [0.1, 0.7],
    luminosityRange: [0.6, 1],
    maxMutationDistance: 0.15,
    minMutationDistance: 0.005,
    similarityTarget: [
        new Color('#DDFFDC'),
        new Color('#7FEE64'),
        new Color('#144236'),
        new Color('#4AD7DD'),
        new Color('#FFEA71'),
        new Color('#ED94A7'),
        new Color('#FFD80A'),
    ],
    initialTemperatureSamples: 100,
    initialAcceptanceRate: 0.95,
});

module.exports = {
    createDefaultConfig,
};
