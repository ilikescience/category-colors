const simulateCvd = require('./simulateCvd');

const cost = (state, config) => {
    const weightSum = config.evalFunctions.reduce((acc, { weight }) => acc + weight, 0);
    return config.evalFunctions.reduce((acc, evalFunction) => {
        const evalState = evalFunction.cvd
            ? simulateCvd(state, evalFunction.cvd.type, evalFunction.cvd.severity)
            : state;
        const evalCost = evalFunction.function(evalState, config, evalFunction);
        return acc + evalCost * (evalFunction.weight / weightSum);
    }, 0);
};

module.exports = { cost };
