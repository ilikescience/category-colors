import simulateCvd from './simulateCvd.js';

const totalWeight = (config) =>
    config.evalFunctions.reduce((acc, { weight }) => acc + weight, 0);

// One evaluator's contribution. `cost` and `costBreakdown` both go through
// here so weight normalization and CVD handling have a single definition.
const scoreEvalFunction = (evalFunction, state, config, weightSum) => {
    const evalState = evalFunction.cvd
        ? simulateCvd(state, evalFunction.cvd.type, evalFunction.cvd.severity)
        : state;
    const evalCost = evalFunction.function(evalState, config, evalFunction);
    return {
        weight: evalFunction.weight,
        cost: evalCost,
        weightedCost: evalCost * (evalFunction.weight / weightSum),
    };
};

// Per-evaluator view of the weighted average, in config.evalFunctions order.
const costBreakdown = (state, config) => {
    const weightSum = totalWeight(config);
    return config.evalFunctions.map((evalFunction) =>
        scoreEvalFunction(evalFunction, state, config, weightSum)
    );
};

const cost = (state, config) => {
    const weightSum = totalWeight(config);
    return config.evalFunctions.reduce(
        (acc, evalFunction) =>
            acc + scoreEvalFunction(evalFunction, state, config, weightSum).weightedCost,
        0
    );
};

export { cost, costBreakdown };
