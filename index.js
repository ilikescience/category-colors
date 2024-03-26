// todo:
// [] standardize eval functions - make sure each works on state, config
//   [x] energy
//   [x] range
//   [x] saliency
//   [x] similarity (aka target)
//   [] avoid
//   [] contrast
//   [] jnd
//   [] cvd
// [] improve neighbor function
// [] make configurable with lightness, chroma, and hue ranges
// [] use colorjsio for hsluv and okhsl
// [] typescript?
// [] switch to procedural API for performance
// [] improve api for simulated annealing
//   [] fixed colors
//   [] provided colors
// [] create benchmarks

const Color = require('colorjs.io').default;
const { srgb_to_okhsl } = require('./okhsl');

const simulateCvd = require('./simulateCvd');

const evaluateSaliency = require('./evaluationFunctions/saliency/saliency');
const evaluateEnergy = require('./evaluationFunctions/energy/energy');
const evaluateRange = require('./evaluationFunctions/range/range');
const evaluateSimilarity = require('./evaluationFunctions/similarity/similarity');
const { observable10, d3category10 } = require('./palettes');

const { initializeColors } = require('./initializeColors');

const { getNeighbor, randomlyMutateColor } = require('./getNeighbor');

const { cost } = require('./cost');

const { randomVector, cartesianDistance } = require('./utils');

const convertToCvd = (color, cvdType, severity) => {
    const cvdRgb = simulateCvd(
        [color.srgb_linear.r, color.srgb_linear.g, color.srgb_linear.b],
        cvdType,
        severity
    );
    return new Color('srgb-linear', cvdRgb).to('srgb');
};

// the simulated annealing algorithm
const optimize = (state, config) => {
    if (state.colors.length < config.colorCount) {
        // add colors to state if there are not enough
        colorsToAdd = initializeColors(config.colorCount - state.colors.length);
        state.colors = state.colors.concat(colorsToAdd);
    }

    state.cost = cost(state, config);
    config.initialState = { ...state };

    // iteration loop
    while (state.temperature > config.cutoff || state.iterations < config.maxIterations) {
        // get a neighbor
        const candidateState = getNeighbor(state, config);
        // calculate the cost of the candidate
        const delta = candidateState.cost - state.cost;
        const probability = Math.exp(-delta / state.temperature);
        if (Math.random() < probability) {
            Object.assign(state, candidateState);
        }
        // use std out to show progress
        if (state.iterations % 100 === 0) {
            console.log(`Iteration: ${state.iterations}, Cost: ${state.cost}`);
        }

        // decrease temperature
        state.temperature *= config.coolingRate;
        state.iterations += 1;
    }

    console.log(`
Start colors: ${config.initialState.colors.map((color) => color.toString({ format: 'hex' }))}
Start cost: ${config.initialState.cost}
Final colors: ${state.colors.reduce(
        (acc, color) => acc + `"${color.toString({ format: 'hex' })}" `,
        ''
    )}
Final cost: ${state.cost}
Cost difference: ${state.cost - config.initialState.cost}`);
    return state.colors;
};

const config = {
    intialState: null,
    colorCount: 8,
    evalFunctions: [
        { function: evaluateEnergy, weight: 0.5 },
        { function: evaluateRange, weight: 0.5 },
        // { function: evaluateSimilarity, weight: 0.5 },
    ],
    fixedColors: 0,
    similarityTarget: observable10,
    coolingRate: 0.99,
    cutoff: 0.0001,
    maxIterations: 10000,
    deltaEMethod: '2000',
    jnd: 5,
    hueRange: [0, 1],
    chromaRange: [0.5, 1],
    luminosityRange: [0.1, 0.9],
};

const state = {
    colors: initializeColors(8),
    cost: Infinity,
    temperature: 100,
    iterations: 0,
};

optimize(state, config);

// sketching out the config object
// const config = {
//     intialState: state,
//     colorCount: 10,
//     evalFunctions: [
//         {function: evalFunction1, weight: 0.5},
//         {function: evalFunction2, weight: 0.5},
//     ],
//     fixedColors: 0,
//     similarityTarget: observable10,
//     coolingRate: 0.99,
//     cutoff: 0.0001,
//     maxIterations: 1000,
//     deltaEMethod: '2000',
//     jnd: 5,
//     hueRange: [0, 360],
//     chromaRange: [0, 1], 
//     luminosityRange: [0, 1],
// }
// mapping out the state object
// const state = {
//     colors: [colors],
//     temperature: 100,
//     iterations: 0,
// }
