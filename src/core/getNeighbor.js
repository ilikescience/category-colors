import { cost } from './cost.js';
import { resolveDistanceOptions } from '../utils/distanceOptions.js';
import { mutateColorInSpace } from '../utils/colorSpaceTools.js';

const getNeighbor = (state, config, random = Math.random) => {
    const distanceOptions = resolveDistanceOptions(config);
    const neighborState = { ...state };
    const colors = state.colors.slice();
    const mutableIndexes = colors
        .map((color, index) => (color.fixedColor ? null : index))
        .filter((index) => index !== null);
    if (mutableIndexes.length === 0) {
        return neighborState;
    }
    const colorIndex = mutableIndexes[Math.floor(random() * mutableIndexes.length)];

    const {
        maxMutationDistance,
        minMutationDistance,
    } = config;
    const distance = minMutationDistance + (maxMutationDistance - minMutationDistance) * state.temperature;

    const mutatedColor = mutateColorInSpace(colors[colorIndex], distance, config, distanceOptions, random);
    neighborState.colors = colors.map((color, index) => (index === colorIndex ? mutatedColor : color));
    neighborState.cost = cost(neighborState, config);
    return neighborState;
};

export { getNeighbor };
