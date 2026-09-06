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

// Cost, so it is inverted: a palette of prototypical, consistently named colors
// scores near 0 and one of colors people cannot name scores near 1. Colors off
// the model's grid look up 0 and so cost the maximum, which is the right
// direction — the grid covers sRGB, and a color outside it is one nobody in the
// survey was ever asked to name.
const evaluateSaliency = (state) => {
    const colors = state.colors || [];
    if (colors.length === 0) {
        return 0;
    }
    return 1 - colors.reduce((sum, color) => sum + saliency(color), 0) / colors.length;
};

export { saliency };
export default evaluateSaliency;
