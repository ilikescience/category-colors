import { converter } from 'culori';
import { getChannels } from '../../utils/paletteColor.js';
import saliencies from './saliencies.js';

const toLab = converter('lab65');
const labChannels = getChannels('lab65');

// The dataset is sampled on a 5-unit lab65 grid, so a lookup rounds each
// channel to the nearest 5 to find its cell.
const saliency = (color) => {
    const converted = toLab(color);
    const key = labChannels
        .map((channel) => Math.round((converted[channel] ?? 0) / 5) * 5)
        .join(',');
    return saliencies[key] ?? 0;
};

const evaluateSaliency = (state) => {
    const colors = state.colors || [];
    if (colors.length === 0) {
        return 0;
    }
    return colors.reduce((sum, color) => sum + saliency(color), 0) / colors.length;
};

export { saliency };
export default evaluateSaliency;
