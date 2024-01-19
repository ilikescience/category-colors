const { Hsluv } = require('hsluv');

const ColorJS = require('colorjs.io');
const Color = ColorJS.default;

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
    colorFromHsluv,
    hsluvFromColor,
    isOutOfHsluv
};
