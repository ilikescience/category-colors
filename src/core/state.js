const { initializeColors } = require('./initializeColors');
const { cost } = require('./cost');
const { findInitialTemperature } = require('./findInitialTemperature');

const prepareInitialState = (state, config) => {
    const initializedState = initializeColors(state, config);
    const workingState = {
        ...initializedState,
        iterations: state.iterations ?? 0,
        temperature: state.temperature ?? 1,
    };

    workingState.cost = cost(workingState, config);
    const samples = config.initialTemperatureSamples ?? 100;
    const targetAcceptance = config.initialAcceptanceRate ?? 0.95;
    workingState.temperature = findInitialTemperature(workingState, config, samples, targetAcceptance);

    config.initialState = { ...workingState };
    return workingState;
};

module.exports = {
    prepareInitialState,
};
