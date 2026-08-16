// Color saliency from Heer & Stone's color naming model: the CIELAB gamut is
// discretized into 8,325 voxels, and each voxel scores how consistently people
// name that color, derived from the entropy of its color-term distribution over
// the xkcd color survey. Prototypical colors score high; colors people cannot
// agree on a name for score low.
//
//   Heer, J. and Stone, M. "Color Naming Models for Color Selection, Image
//   Editing and Palette Design." ACM CHI 2012. https://vis.stanford.edu/color-names/
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
