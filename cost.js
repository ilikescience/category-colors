const cost = (state, config) => {
    const weights = config.evalFunctions.map(evalFunction => evalFunction.weight);
    const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
    const normalizedWeights = weights.map(weight => weight / weightSum);
    const costs = config.evalFunctions.map(evalFunction => evalFunction.function(state, config));
    return costs.reduce((acc, cost, i) => acc + cost * normalizedWeights[i], 0);
};

module.exports = {cost};