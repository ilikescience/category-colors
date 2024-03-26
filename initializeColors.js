const Color = require('colorjs.io').default;
const { okhsl_to_srgb } = require('./okhsl');

const randomColorInRange = (hueRange, chromaRange, luminosityRange) => {
    let h, c, l;
    do {
        h = Math.random();
    } while (!isInRange(h, hueRange));
    do {
        c = Math.random();
    } while (!isInRange(c, chromaRange));
    do {
        l = Math.random();
    } while (!isInRange(l, luminosityRange));
    return new Color('srgb', okhsl_to_srgb(h, c, l));
}

const initializeColors = (state, config) => {
    const colors = [];
    for (let i = 0; i < config.colorCount - state.colors.length; i++) {
        colors.push(randomColor());
    }
};

module.exports = {
    randomColorInRange,
    initializeColors,
};
