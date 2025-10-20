// evaluates the similarity of two sets of colors.
// uses the Munkres algorithm to find the minimum weight assignment of the distance matrix

const { minWeightAssign } = require('munkres-algorithm');
const { deltaE } = require('../../utils/deltaE');
const { resolveDistanceOptions, getMaxDistance } = require('../../utils/distanceOptions');

const normalizeDifference = (difference, maxDistance) => {
    if (!Number.isFinite(difference) || !Number.isFinite(maxDistance) || maxDistance <= 0) {
        return 1;
    }
    return Math.max(0, Math.min(difference / maxDistance, 1));
};

const buildCostMatrix = (array1, array2, distanceOptions, maxDistance) => {
    const matrix = [];
    for (let i = 0; i < array1.length; i++) {
        const row = [];
        for (let j = 0; j < array2.length; j++) {
            const diff = deltaE(array1[i], array2[j], distanceOptions);
            row.push(normalizeDifference(diff, maxDistance));
        }
        matrix.push(row);
    }
    return matrix;
};

const evaluateSimilarity = (state, config) => {
    const colors = state.colors || [];
    if (colors.length === 0) {
        return 0;
    }

    const targetColors = config.similarityTarget || [];
    if (targetColors.length === 0) {
        return 0;
    }

    const distanceOptions = resolveDistanceOptions(config);
    const maxDistance = getMaxDistance(distanceOptions);

    const { assignments } = minWeightAssign(
        buildCostMatrix(colors, targetColors, distanceOptions, maxDistance)
    );

    let distanceSum = 0;
    for (let i = 0; i < colors.length; i++) {
        if (assignments[i] === null) {
            distanceSum += 1;
        } else {
            const diff = deltaE(colors[i], targetColors[assignments[i]], distanceOptions);
            distanceSum += normalizeDifference(diff, maxDistance);
        }
    }

    return distanceSum / colors.length;
};

module.exports = evaluateSimilarity;
