// evaluation function that describes a set of colors in terms of potential energy;
// colors that are close to each other have high potential energy,
// colors that are far away have low potential energy.

import { pairwiseTerms } from '../../utils/deltaE.js';
import { resolveDistanceOptions, getMaxDistance } from '../../utils/distanceOptions.js';

// Potential energy of one pair: the cube of how far short of the maximum
// distance it falls. An unmeasurable pair contributes nothing.
const energyOf = (difference, maxDistance) => {
    if (!Number.isFinite(difference)) {
        return 0;
    }
    const normalized = Math.max(0, Math.min(difference / maxDistance, 1));
    const complement = 1 - normalized;
    return complement * complement * complement;
};

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

    const n = colors.length;
    const energies = pairwiseTerms(colors, distanceOptions, energyOf, maxDistance, true);
    let totalEnergy = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            totalEnergy += energies[i * n + j];
        }
    }

    return totalEnergy / (colors.length * (colors.length - 1));
};

export default evaluateEnergy;
