// todo:
// [ ] account for temperature when deciding how to mutate the color
// [ ] finish implementing the neighbor function

const {randomVector, isInRange } = require('./utils.js');
const { okhsl_to_srgb, srgb_to_okhsl} = require('./okhsl.js');
const { cost } = require('./cost');
const Color = require('colorjs.io').default;


// produces a color a given distance in a random direction away from the given color in okhsl space
// respects provided ranges for hue, chroma, and luminosity
const randomlyMutateColor = (color, distance, hueRange, chromaRange, luminosityRange) => {
    const okhsl = srgb_to_okhsl(color.srgb.r, color.srgb.g, color.srgb.b);
    const randomVec = randomVector(3, distance);
    const ranges = [hueRange, chromaRange, luminosityRange];
    // checks to see if the new color is within the specified ranges
    // if not, it will reflect the delta vector across the boundary
    // if the new color is still out of bounds, it will keep the original channel value
    for (let i = 0; i < 3; i++) {
        if (isInRange(okhsl[i] + randomVec[i], ranges[i])) {
            okhsl[i] += randomVec[i];
        } else if (isInRange(okhsl[i] - randomVec[i], ranges[i])) {
            okhsl[i] -= randomVec[i];
        }
    }

    return new Color('srgb', okhsl_to_srgb(okhsl[0], okhsl[1], okhsl[2]));
}

const getNeighbor = (state, config) => {
    const neighborState = { ...state };
    const colorIndex = Math.floor(Math.random() * state.colors.length);
    const { colors } = state;
    const { hueRange, chromaRange, luminosityRange } = config;
    const distance = 0.1;
    const newColor = randomlyMutateColor(colors[colorIndex], distance, hueRange, chromaRange, luminosityRange);
    neighborState.colors = colors.map((color, i) => (i === colorIndex ? newColor : color));
    neighborState.cost = cost(neighborState, config);
    return neighborState;
};

module.exports = {
    getNeighbor,
    randomlyMutateColor,
    isInRange
};
