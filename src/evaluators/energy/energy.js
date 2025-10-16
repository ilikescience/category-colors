// evaluation function that describes a set of colors in terms of potential energy;
// colors that are close to each other have high potential energy,
// colors that are far away have low potential energy.

const { srgb_to_okhsl} = require('../../utils/okhsl.js');

const {
    cylindricalToCartesian,
    cartesianDistance,
} = require('../../utils/utils.js');

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

const transformCoordinates = (hsl) => {
    const [h, s, l] = hsl;
    // rearrange and convert to degrees
    return cylindricalToCartesian([s, h * 360, l]);
};

const evaluateEnergy = (state) => {
    let totalEnergy = 0;
    for (let i = 0; i < state.colors.length; i++) {
        const color = state.colors[i];
        const okhsl = srgb_to_okhsl(color.srgb.r, color.srgb.g, color.srgb.b);
        const hcl = makeBicone(okhsl);
        const transformedHcl = transformCoordinates(hcl);
        for (let j = 0; j < state.colors.length; j++) {
            if (i === j) continue;           
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
            if (hcl[1] > maxSaturation/2) {
                maxColorHcl = [(okhsl[0] + 0.5) % 1, maxSaturation, 0.5];
            } else if (hcl[2] < 0.5) {
                maxColorHcl = [0, 0, 1];
            } else {
                maxColorHcl = [0, 0, 0];
            }
            const thisDistance = cartesianDistance(
                transformedHcl,
                transformCoordinates(compareHcl)
            );
            const maxDistance = cartesianDistance(
                transformedHcl,
                transformCoordinates(maxColorHcl)
            );
            // low potential energy is when the distance is close to the max distance
            totalEnergy += (1 - (thisDistance / maxDistance)) ** 3;
        }
    }
    return (totalEnergy / (state.colors.length * (state.colors.length - 1)));
};

module.exports = evaluateEnergy;
