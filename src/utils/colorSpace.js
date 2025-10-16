const Color = require('colorjs.io').default;

const toOkhsl01 = (color) => {
    const [h, s, l] = color.to('okhsl').coords;
    return [h / 360, s, l];
};

const fromOkhsl01 = ([h, s, l]) => {
    return new Color('okhsl', [h * 360, s, l]).to('srgb');
};

module.exports = {
    toOkhsl01,
    fromOkhsl01,
};
