import { resolveDistanceOptions } from '../utils/distanceOptions.js';
import { ensureColorInSpace, randomColorInSpace, sanitizePalette, } from '../utils/colorSpaceTools.js';

const initializeColors = (state, config) => {
    const distanceOptions = resolveDistanceOptions(config);
    const sanitized = sanitizePalette(state.colors || [], config, distanceOptions, 'initial');

    // Use config.colorCount if provided, otherwise use the length of the initial colors
    const targetColorCount = config.colorCount !== undefined ? config.colorCount : sanitized.length;

    const initializedState = {
        ...state,
        colors: Array.from({ length: targetColorCount }, (_, index) => sanitized[index] || null),
    };

    for (let i = 0; i < targetColorCount; i++) {
        if (!initializedState.colors[i]) {
            initializedState.colors[i] = randomColorInSpace(config, distanceOptions);
        } else if (!initializedState.colors[i].fixedColor) {
            initializedState.colors[i] = ensureColorInSpace(
                initializedState.colors[i],
                config,
                distanceOptions,
                { context: `initial[${i}]`, silent: true }
            );
        }
    }

    return initializedState;
};

export { initializeColors };
