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

    const { maxMutationDistance, minMutationDistance, cutoff, coolingRate, maxIterations } = config;
    // Temperature is in cost units and falls geometrically from its starting
    // value until the run ends: at the cutoff, or at maxIterations if that comes
    // first. Steps shrink with progress along that schedule, from full size at
    // the start to the minimum at the end.
    const start = state.initialTemperature ?? 1;
    const end = Math.max(cutoff, start * coolingRate ** maxIterations);
    let progress;
    if (end > 0) {
        progress = start > end ? Math.log(state.temperature / end) / Math.log(start / end) : 0;
    } else {
        // A cutoff of 0 means "run to maxIterations", and a long run's end
        // temperature underflows to 0 too, so measure it in log space.
        const logStart = Math.log(start);
        const logEnd = logStart + maxIterations * Math.log(coolingRate);
        progress = (Math.log(state.temperature) - logEnd) / (logStart - logEnd);
    }
    // A schedule with no finite end (no cutoff and no cap) keeps full-size steps.
    const scale = Number.isNaN(progress) ? 1 : Math.min(1, Math.max(0, progress));
    const distance = minMutationDistance + (maxMutationDistance - minMutationDistance) * scale;

    const mutatedColor = mutateColorInSpace(colors[colorIndex], distance, config, distanceOptions, random);
    neighborState.colors = colors.map((color, index) => (index === colorIndex ? mutatedColor : color));
    neighborState.cost = cost(neighborState, config);
    return neighborState;
};

export { getNeighbor };
