const { palettes } = require('../data');
const { observable10 } = palettes;
const evaluators = require('../evaluators');

const createDefaultConfig = () => ({
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
    colorDistance: {
        method: 'ciede2000',
    },
    colorSpace: {
        mode: 'okhsl',
    },
    jnd: 25,
    maxMutationDistance: 0.15,
    minMutationDistance: 0.005,
    similarityTarget: observable10.slice(),
    initialTemperatureSamples: 100,
    initialAcceptanceRate: 0.95,
});

module.exports = {
    createDefaultConfig,
};
