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

    const { maxMutationDistance, minMutationDistance, cutoff } = config;
    // Temperature is in cost units and falls geometrically from its starting
    // value to the cutoff. Steps shrink with progress along that schedule, from
    // full size at the start to the minimum at the cutoff.
    const start = state.initialTemperature ?? 1;
    const progress = start > cutoff
        ? Math.log(state.temperature / cutoff) / Math.log(start / cutoff)
        : 0;
    const scale = Math.min(1, Math.max(0, progress));
    const distance = minMutationDistance + (maxMutationDistance - minMutationDistance) * scale;

    const mutatedColor = mutateColorInSpace(colors[colorIndex], distance, config, distanceOptions, random);
    neighborState.colors = colors.map((color, index) => (index === colorIndex ? mutatedColor : color));
    neighborState.cost = cost(neighborState, config);
    return neighborState;
};

export { getNeighbor };
