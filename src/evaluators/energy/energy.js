// evaluation function that describes a set of colors in terms of potential energy;
// colors that are close to each other have high potential energy,
// colors that are far away have low potential energy.

import { pairwiseDistances } from '../../utils/deltaE.js';
import { resolveDistanceOptions, getMaxDistance } from '../../utils/distanceOptions.js';

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

    // Each unordered pair once: CIEDE2000 is not symmetric to the last bit,
    // but the difference is far below anything the optimizer responds to,
    // and measuring both directions doubled the distances a step computes.
    const n = colors.length;
    const distances = pairwiseDistances(colors, distanceOptions);
    let totalEnergy = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const difference = distances[i * n + j];
            if (!Number.isFinite(difference)) {
                continue;
            }
            const normalized = Math.max(0, Math.min(difference / maxDistance, 1));
            const complement = 1 - normalized;
            totalEnergy += complement * complement * complement;
        }
    }

    return totalEnergy / ((n * (n - 1)) / 2);
};

export default evaluateEnergy;
