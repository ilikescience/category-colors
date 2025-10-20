// evaluation function that describes a set of colors in terms of potential energy;
// colors that are close to each other have high potential energy,
// colors that are far away have low potential energy.

const { deltaE } = require('../../utils/deltaE');
const { resolveDistanceOptions, getMaxDistance } = require('../../utils/distanceOptions');

const evaluateEnergy = (state, config) => {
    const colors = state.colors || [];
    if (colors.length < 2) {
        return 0;
    }

    const distanceOptions = resolveDistanceOptions(config);
    const maxDistance = getMaxDistance(distanceOptions);
    if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
        return 0;
    }

    let totalEnergy = 0;
    for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        for (let j = 0; j < colors.length; j++) {
            if (i === j) continue;
            const compareColor = colors[j];
            const difference = deltaE(color, compareColor, distanceOptions);
            if (!Number.isFinite(difference)) {
                continue;
            }
            const normalized = Math.max(0, Math.min(difference / maxDistance, 1));
            const complement = 1 - normalized;
            totalEnergy += complement * complement * complement;
        }
    }

    return totalEnergy / (colors.length * (colors.length - 1));
};

module.exports = evaluateEnergy;
