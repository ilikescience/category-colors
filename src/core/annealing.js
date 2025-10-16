const { getNeighbor } = require('./getNeighbor');
const { optimizeColorOrder } = require('./optimizeColorOrder');
const { cost } = require('./cost');

const shouldAcceptCandidate = (currentCost, candidateCost, temperature) => {
    if (candidateCost <= currentCost) {
        return true;
    }
    const acceptanceProbability = Math.exp(-(candidateCost - currentCost) / temperature);
    return Math.random() < acceptanceProbability;
};

const stepAnnealing = (state, config) => {
    const candidateState = getNeighbor(state, config);
    if (shouldAcceptCandidate(state.cost, candidateState.cost, state.temperature)) {
        Object.assign(state, candidateState);
    }
    if (state.iterations % 100 === 0) {
        console.log(
            `Iteration: ${state.iterations}, Cost: ${state.cost.toFixed(2)}, Temperature: ${state.temperature}`
        );
    }
    state.temperature *= config.coolingRate;
    state.iterations += 1;
};

const runSimulatedAnnealing = (initialState, config) => {
    const state = {
        ...initialState,
        colors: initialState.colors.map((color) => color),
    };

    while (
        state.temperature > config.cutoff &&
        state.iterations < config.maxIterations
    ) {
        stepAnnealing(state, config);
    }

    return state;
};

const runWithOrderOptimization = (initialState, config) => {
    const annealedState = runSimulatedAnnealing(initialState, config);
    const orderedColors = optimizeColorOrder(annealedState, config);
    const finalState = {
        ...annealedState,
        colors: orderedColors,
    };
    finalState.cost = cost(finalState, config);
    return finalState;
};

module.exports = {
    runSimulatedAnnealing,
    runWithOrderOptimization,
};
