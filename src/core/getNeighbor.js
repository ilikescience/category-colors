const { cost } = require('./cost');
const { resolveDistanceOptions } = require('../utils/distanceOptions');
const { mutateColorInSpace } = require('../utils/colorSpaceTools');

const getNeighbor = (state, config) => {
    const distanceOptions = resolveDistanceOptions(config);
    const neighborState = { ...state };
    const colors = state.colors.slice();
    let colorIndex;
    do {
        colorIndex = Math.floor(Math.random() * colors.length);
    } while (colors[colorIndex].fixedColor);

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
