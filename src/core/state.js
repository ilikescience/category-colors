import { initializeColors } from './initializeColors.js';
import { cost } from './cost.js';
import { findInitialTemperature } from './findInitialTemperature.js';
import { randomFrom } from '../utils/random.js';

const prepareInitialState = (state, config) => {
    const random = randomFrom(config);
    const initializedState = initializeColors(state, config, random);
    const workingState = {
        ...initializedState,
        iterations: state.iterations ?? 0,
        temperature: state.temperature ?? 1,
    };

    workingState.cost = cost(workingState, config);
    const samples = config.initialTemperatureSamples ?? 100;
    const targetAcceptance = config.initialAcceptanceRate ?? 0.95;
    workingState.temperature = findInitialTemperature(workingState, config, samples, targetAcceptance, random);

    return workingState;
};

export { prepareInitialState };
