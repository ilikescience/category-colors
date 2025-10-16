const { runWithOrderOptimization } = require('./src/core/annealing');
const { prepareInitialState } = require('./src/core/state');
const { createDefaultConfig } = require('./src/config/defaultConfig');
const { createDefaultState } = require('./src/config/defaultState');
const api = require('./src');

const logSummary = (config, finalState) => {
    const initialColors = config.initialState.colors.map((color) =>
        color.toString({ format: 'hex' })
    );
    const finalColors = finalState.colors.map((color) =>
        color.toString({ format: 'hex' })
    );

    console.log(`
Start colors: ${initialColors}
Start cost: ${config.initialState.cost}
Final colors: ${finalColors}
Final cost: ${finalState.cost}
Cost difference: ${finalState.cost - config.initialState.cost}`);
};

const run = () => {
    const config = createDefaultConfig();
    const initialState = prepareInitialState(createDefaultState(), config);
    const finalState = runWithOrderOptimization(initialState, config);

    logSummary(config, finalState);
    return finalState;
};

if (require.main === module) {
    run();
}

module.exports = {
    run,
    ...api,
};
