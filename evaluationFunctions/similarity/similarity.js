// todo: figure out a better way to share code between this and the energy evaluation function

// evaluates the similarity of two sets of colors.
// uses the Munkres algorithm to find the minimum weight assignment of the distance matrix

const { minWeightAssign } = require('munkres-algorithm');
const { srgb_to_okhsl } = require('../../okhsl.js');

const { cylindricalToCartesian, cartesianDistance } = require('../../utils.js');

// this factor adjusts the max saturation when converting to
// a bi-conic color space. This makes the resulting shape
// have a max distance of 1 in each axis.
const maxSaturation = 0.5;

const makeBicone = (hsl) => {
    const [h, s, l] = hsl;
    let s_adjusted = l < 0.5 ? s * (l / 0.5) : s * ((1 - l) / 0.5);
    s_adjusted *= maxSaturation;
    return [h, s_adjusted, l];
};

const transformCoordinates = (hcl) => {
    const [h, c, l] = hcl;
    // rearrange and convert to degrees
    return cylindricalToCartesian([c, h * 360, l]);
};

const costMatrix = (array1, array2) => {
    const costMatrix = [];
    for (let i = 0; i < array1.length; i++) {
        const row = [];
        for (let j = 0; j < array2.length; j++) {
            row.push(array1[i].deltaE(array2[j], '2000'));
        }
        costMatrix.push(row);
    }
    return costMatrix;
};

const evaluateSimilarity = (state, config) => {
    // use the Munkres algorithm to match the colors in the state to the target colors
    const assignments = minWeightAssign(
        costMatrix(state.colors, config.similarityTarget)
    ).assignments;

    // calculate the similarity as the average distance between eaach color in the state and the corresponding color in the target
    let distance = 0;
    for (let i = 0; i < state.colors.length; i++) {
        if (assignments[i] === null) {
            distance += 1;
        } else {
            const color = state.colors[i];
            // use biconic okhsl space to calculate distance
            // this guarantees that the distance is in [0, 1]
            const okhsl = srgb_to_okhsl(color.srgb.r, color.srgb.g, color.srgb.b);
            const hcl = makeBicone(okhsl);
            const compareColor = config.similarityTarget[assignments[i]];
            const compareOkhsl = srgb_to_okhsl(
                compareColor.srgb.r,
                compareColor.srgb.g,
                compareColor.srgb.b
            );
            const compareHcl = makeBicone(compareOkhsl);
            distance += cartesianDistance(
                transformCoordinates(hcl),
                transformCoordinates(compareHcl)
            );
        }
    }
    return distance / state.colors.length;
};

module.exports = evaluateSimilarity;
