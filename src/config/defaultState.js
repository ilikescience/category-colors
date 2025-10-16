const Color = require('colorjs.io').default;

const createDefaultState = () => {
    const colors = [
        new Color('#DDFFDC'),
        new Color('srgb', [0.0275, 0.725, 0.463]),
        new Color('srgb', [1.0, 0.918, 0.443]),
        new Color('srgb', [0.29, 0.843, 0.867]),
        new Color('srgb', [0.953, 0.451, 0.29]),
        new Color('srgb', [0.737, 0.737, 0.761]),
    ];

    colors[0].fixedColor = true;
    colors[0].fixedOrder = true;

    return {
        colors,
        temperature: 1,
        iterations: 0,
        cost: Infinity,
    };
};

module.exports = {
    createDefaultState,
};
