const { Hsluv } = require('hsluv');

const Color = require('colorjs.io').default;

const distanceMethod = '2000';

// generates a random color
const randomColor = () => {
    h = Math.random() * 360;
    s = Math.random() * 100;
    l = Math.random() * 100;
    return colorFromHsluv(h, s, l);
};

// measures the distance between two colors
const distance = (color1, color2) => color1.deltaE(color2, distanceMethod);

// gets the closest color from an array of colors
const getClosestColor = (color, colorArray) => {
    const distances = colorArray.map((c) => distance(color, c));
    const minIndex = distances.indexOf(Math.min(...distances));
    return colorArray[minIndex];
};

// array of distances between all points in a color array
const distances = (colorArray) => {
    const distances = [];
    for (let i = 0; i < colorArray.length; i++) {
        for (let j = i + 1; j < colorArray.length; j++) {
            distances.push(distance(colorArray[i], colorArray[j]));
        }
    }
    return distances;
};

const convertHexShorthand = (hex) => hex.replace(/^#([a-f0-9])([a-f0-9])([a-f0-9])$/i, '#$1$1$2$2$3$3');

const colorFromHsluv = (h, s, l) => {
    const color = new Hsluv();
    color.hsluv_h = h;
    color.hsluv_s = s;
    color.hsluv_l = l;
    color.hsluvToHex();
    return new Color(color.hex);
};

const hsluvFromColor = (color) => {
    const hsluv = new Hsluv();
    const hex = color.toString({ format: 'hex' });
    hsluv.hex = hex.length === 4 ? convertHexShorthand(hex) : hex;
    hsluv.hexToHsluv();
    return [hsluv.hsluv_h, hsluv.hsluv_s, hsluv.hsluv_l];
};

const isOutOfHsluv = (h, s, l) => {
    return h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100;
};

module.exports = {
    randomColor,
    distance,
    getClosestColor,
    distances,
    colorFromHsluv,
    hsluvFromColor,
    isOutOfHsluv
};