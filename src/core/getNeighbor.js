const { cost } = require('./cost');
const { resolveDistanceOptions } = require('../utils/distanceOptions');
const { mutateColorInSpace } = require('../utils/colorSpaceTools');

const getNeighbor = (state, config) => {
    const distanceOptions = resolveDistanceOptions(config);
    const neighborState = { ...state };
    const colors = state.colors.slice();
    const mutableIndexes = colors
        .map((color, index) => (color.fixedColor ? null : index))
        .filter((index) => index !== null);
    if (mutableIndexes.length === 0) {
        return neighborState;
    }
    const colorIndex = mutableIndexes[Math.floor(Math.random() * mutableIndexes.length)];

    const {
        maxMutationDistance,
        minMutationDistance,
    } = config;
    const distance = minMutationDistance + (maxMutationDistance - minMutationDistance) * state.temperature;

    const mutatedColor = mutateColorInSpace(colors[colorIndex], distance, config, distanceOptions);
    neighborState.colors = colors.map((color, index) => (index === colorIndex ? mutatedColor : color));
    neighborState.cost = cost(neighborState, config);
    return neighborState;
};

module.exports = {
    getNeighbor,
};
