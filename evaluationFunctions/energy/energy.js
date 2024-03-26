// evaluation function that describes a set of colors in terms of potential energy;
// colors that are close to each other have high potential energy,
// colors that are far away have low potential energy.

const { srgb_to_okhsl } = require('../../okhsl.js');

const { cylindricalToCartesian, cartesianDistance } = require('../../utils.js');

// this factor adjusts the max chroma when converting to
// a bi-conic color space. This makes the resulting shape
// have a max distance of 1 in each axis.
const maxChroma = 0.5;

const makeBicone = (hsl) => {
    const [h, s, l] = hsl;
    let c = l < 0.5 ? s * (l / 0.5) : s * ((1 - l) / 0.5);
    c *= maxChroma;
    return [h, c, l];
};

const transformCoordinates = (hcl) => {
    const [h, c, l] = hcl;
    // rearrange and convert to degrees
    return cylindricalToCartesian([c, h * 360, l]);
};

const evaluateEnergy = (state) => {
    let totalDistance = 0;
    for (let i = 0; i < state.colors.length; i++) {
        for (let j = 0; j < state.colors.length; j++) {
            if (i === j) continue;
            const color = state.colors[i];
            const okhsl = srgb_to_okhsl(color.srgb.r, color.srgb.g, color.srgb.b);
            const hcl = makeBicone(okhsl);
            const compareColor = state.colors[j];
            const compareOkhsl = srgb_to_okhsl(
                compareColor.srgb.r,
                compareColor.srgb.g,
                compareColor.srgb.b
            );
            const compareHcl = makeBicone(compareOkhsl);
            // the max distance possible from an hcl color:
            // if c is greater than 0.5, the max distance is from the hue opposite the color with s = 1 and l = 0.5
            // if c is less than 0.5, max distance is from white or black
            // it's white if l is less than 0.5, black if l is greater than 0.5
            let maxColorHcl;
            if (hcl[1] > maxChroma / 2) {
                maxColorHcl = [(okhsl[0] + 0.5) % 1, maxChroma, 0.5];
            } else if (hcl[2] < 0.5) {
                maxColorHcl = [0, 0, 1];
            } else {
                maxColorHcl = [0, 0, 0];
            }
            const thisDistance = cartesianDistance(
                transformCoordinates(hcl),
                transformCoordinates(compareHcl)
            );
            const maxDistance = cartesianDistance(
                transformCoordinates(hcl),
                transformCoordinates(maxColorHcl)
            );
            totalDistance += thisDistance / maxDistance;
        }
    }
    return 1 - totalDistance / (state.colors.length * (state.colors.length - 1));
};

module.exports = evaluateEnergy;
