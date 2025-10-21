const { palettes } = require('../data');
const { colorBrewer3_10 } = palettes;

const createDefaultState = () => {
    // Clone the colors array and set properties on the first color
    const colors = colorBrewer3_10.slice();

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
