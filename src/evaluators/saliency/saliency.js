const saliencies = require('./saliencies.json');
const { converter } = require('culori');
const { getChannels } = require('../../utils/paletteColor');

const toLab = converter('lab65');
const labChannels = getChannels('lab65');

// saliency data is in lab-d65, rounded to the nearest 5
let saliencyByLab = null;
const getSaliencyMap = () => {
    if (!saliencyByLab) {
        saliencyByLab = new Map(
            saliencies.map(({ colorValue, saliency }) => [colorValue.join(','), saliency])
        );
    }
    return saliencyByLab;
};

const saliency = (color) => {
    const converted = toLab(color);
    const key = labChannels
        .map((channel) => Math.round((converted[channel] ?? 0) / 5) * 5)
        .join(',');
    return getSaliencyMap().get(key) ?? 0;
};

const evaluateSaliency = (state) => {
    const colors = state.colors || [];
    if (colors.length === 0) {
        return 0;
    }
    return colors.reduce((sum, color) => sum + saliency(color), 0) / colors.length;
};

module.exports = evaluateSaliency;
