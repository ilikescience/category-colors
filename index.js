// todo:
// [] switch to procedural API for performance
// [] create benchmarks
// [] write report function
// [] make the cli interface better (with stdout?)

const Color = require('colorjs.io').default;

const evaluateSaliency = require('./evaluationFunctions/saliency/saliency');
const evaluateEnergy = require('./evaluationFunctions/energy/energy');
const evaluateRange = require('./evaluationFunctions/range/range');
const evaluateSimilarity = require('./evaluationFunctions/similarity/similarity');
const evaluateJnd = require('./evaluationFunctions/jnd/jnd');
const { observable10, d3category10 } = require('./palettes');
const { initializeColors } = require('./initializeColors');
const { getNeighbor } = require('./getNeighbor');
const { optimizeColorOrder } = require('./optimizeColorOrder');

// the simulated annealing algorithm
const optimize = (initialState, config) => {
  const state = { ...initializeColors(initialState, config) };

  // iteration loop
  while (
    state.temperature > config.cutoff &&
    state.iterations < config.maxIterations
  ) {
    // get a neighbor
    const candidateState = getNeighbor(state, config);
    if (
      Math.random() <
      Math.exp(-(candidateState.cost - state.cost) / state.temperature)
    ) {
      Object.assign(state, candidateState);
    }
    if (state.iterations % 100 === 0) {
      console.log(
        `Iteration: ${state.iterations}, Cost: ${state.cost.toFixed(
          2
        )}, Temperature: ${state.temperature}`
      );
    }

    // decrease temperature
    state.temperature *= config.coolingRate;
    state.iterations += 1;
  }

  console.log(`
Start colors: ${config.initialState.colors.map((color) =>
    color.toString({ format: 'hex' })
  )}
Start cost: ${config.initialState.cost}
Final colors: ${state.colors.map((color) => color.toString({ format: 'hex' }))}
Final cost: ${state.cost}
Cost difference: ${state.cost - config.initialState.cost}`);
  return state;
};

const config = {
  intialState: null,
  colorCount: 8,
  evalFunctions: [
    { function: evaluateEnergy, weight: 1 },
    { function: evaluateRange, weight: 1 },
    { function: evaluateJnd, weight: 1 },
    {
      function: evaluateJnd,
      weight: 1,
      cvd: { type: 'protanomaly', severity: 0.5 },
    },
    {
      function: evaluateJnd,
      weight: 1,
      cvd: { type: 'deuteranomaly', severity: 0.5 },
    },
    { function: evaluateSimilarity,
        weight: 1,

    }
  ],
  coolingRate: 0.999,
  cutoff: 0.0001,
  maxIterations: 100000,
  deltaEMethod: '2000',
  jnd: 25,
  hueRange: [0, 1],
  saturationRange: [0.1, 0.7],
  luminosityRange: [0.6, 1],
  maxMutationDistance: 0.15, // Max distance in Okhsl space at T=1.0
  minMutationDistance: 0.005, // Min distance in Okhsl space at T -> 0
  similarityTarget: [
    new Color('#DDFFDC'),
    new Color('#7FEE64'),
    new Color('#144236'),
    new Color('#4AD7DD'),
    new Color('#FFEA71'),
    new Color('#ED94A7'),
    new Color('#FFD80A'),
  ]
};

const state = {
  colors: [
    new Color('#DDFFDC'),
    new Color('srgb', [0.0275, 0.725, 0.463]),
    new Color('srgb', [1.0, 0.918, 0.443]),
    new Color('srgb', [0.29, 0.843, 0.867]),
    new Color('srgb', [0.953, 0.451, 0.29]),
    new Color('srgb', [0.737, 0.737, 0.761]),
  ],
  temperature: 1,
  iterations: 0,
  cost: Infinity,
};

state.colors[0].fixedColor = true;
state.colors[0].fixedOrder = true;

optimizeColorOrder(optimize(state, config), config);
