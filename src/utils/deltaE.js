const { differenceCiede2000, converter } = require('culori');

const difference2000 = differenceCiede2000();
const toLab65 = converter('lab65');

const colorToLab65 = (color, targetSpace) => {
    const working = targetSpace ? color.to(targetSpace) : color;
    const rgb = working.to('srgb');
    return toLab65({ mode: 'rgb', r: rgb.coords[0], g: rgb.coords[1], b: rgb.coords[2] });
};

const deltaE = (colorA, colorB, options = {}) => {
    const method = (options.method || '2000').toLowerCase();
    if (method === '2000' || method === 'ciede2000') {
        const lab1 = colorToLab65(colorA, options.space);
        const lab2 = colorToLab65(colorB, options.space);
        return difference2000(lab1, lab2);
    }

    return colorA.deltaE(colorB, options.method || method.toUpperCase());
};

module.exports = {
    deltaE,
};
