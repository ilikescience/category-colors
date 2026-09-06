// Name difference from Heer & Stone's color-naming model: each lab65 voxel has
// a vector of how often survey participants called it each of 153 terms, and
// two colors differ in name by 1 - cosine(vector a, vector b). Colorgorical
// and Palettailor both optimize this quantity; here it is a cost, the mean
// pairwise name *similarity*, so palettes whose colors share names score high.
//
//   Heer, J. and Stone, M. "Color Naming Models for Color Selection, Image
//   Editing and Palette Design." ACM CHI 2012. https://vis.stanford.edu/color-names/
import saliencies from '../saliency/saliencies.js';
import { voxelKey } from '../saliency/saliency.js';
import encoded, { terms } from './names-data.js';

// Voxels are stored in the same order as saliencies.js, so its keys double as
// the L,a,b -> index table. See bench/buildNameData.js for the encoding.
const indexByKey = new Map(Object.keys(saliencies).map((key, index) => [key, index]));
const voxels = encoded.split('|');
const decoded = new Array(voxels.length);

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const decode = (index) => {
    if (decoded[index]) return decoded[index];
    const text = voxels[index];
    const indices = [];
    const counts = [];
    let position = 0;
    let previous = -1;
    const varint = () => {
        let value = 0;
        let shift = 0;
        let code;
        do {
            code = B64.indexOf(text[position++]);
            value |= (code & 31) << shift;
            shift += 5;
        } while (code & 32);
        return value;
    };
    while (position < text.length) {
        previous += varint() + 1;
        indices.push(previous);
        counts.push(varint());
    }
    const norm = Math.hypot(...counts);
    decoded[index] = { indices, weights: counts.map((c) => c / norm), counts };
    return decoded[index];
};

const EMPTY = { indices: [], weights: [], counts: [] };

// Off-grid colors (outside the model's sRGB sampling) have no name data and
// come back empty, which makes them fully different from everything.
const nameVector = (color) => {
    const index = indexByKey.get(voxelKey(color));
    return index === undefined ? EMPTY : decode(index);
};

const cosine = (a, b) => {
    let sum = 0;
    for (let i = 0, j = 0; i < a.indices.length && j < b.indices.length; ) {
        if (a.indices[i] === b.indices[j]) sum += a.weights[i++] * b.weights[j++];
        else if (a.indices[i] < b.indices[j]) i++;
        else j++;
    }
    return sum;
};

/** The terms people use for a color, with each term's share of the answers. */
const nameTerms = (color) => {
    const { indices, counts } = nameVector(color);
    const total = counts.reduce((sum, c) => sum + c, 0);
    return indices
        .map((term, i) => ({ term: terms[term], share: counts[i] / total }))
        .sort((a, b) => b.share - a.share);
};

/** 1 - cosine similarity of two colors' name vectors; 0 is the same name, 1 no overlap. */
const nameDifference = (a, b) => 1 - cosine(nameVector(a), nameVector(b));

// Mean pairwise name similarity, in [0, 1].
const evaluateNames = (state) => {
    const colors = state.colors || [];
    if (colors.length < 2) return 0;
    const vectors = colors.map(nameVector);
    let cost = 0;
    for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {
            cost += cosine(vectors[i], vectors[j]);
        }
    }
    return cost / ((vectors.length * (vectors.length - 1)) / 2);
};

export { nameDifference, nameTerms, terms };
export default evaluateNames;
