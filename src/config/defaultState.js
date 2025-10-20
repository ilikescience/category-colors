const { palettes } = require('../data');
const { observable10 } = palettes;

const createDefaultState = () => {
    // Clone the colors array and set properties on the first color
    const colors = observable10.slice();

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
