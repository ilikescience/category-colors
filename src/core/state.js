const { initializeColors } = require('./initializeColors');
const { cost } = require('./cost');
const { findInitialTemperature } = require('./findInitialTemperature');
const { sanitizePalette } = require('../utils/colorSpaceTools');
const { resolveDistanceOptions } = require('../utils/distanceOptions');

const prepareInitialState = (state, config) => {
    const distanceOptions = resolveDistanceOptions(config);

    if (Array.isArray(config.similarityTarget)) {
        config.similarityTarget = sanitizePalette(
            config.similarityTarget,
            config,
            distanceOptions,
            'similarityTarget'
        );
    }

    const sanitizedState = {
        ...state,
        colors: sanitizePalette(state.colors || [], config, distanceOptions, 'initial'),
    };

    const initializedState = initializeColors(sanitizedState, config);
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
