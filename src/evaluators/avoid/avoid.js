// Penalizes palette colors that come near a set of "avoid" colors.
// The inverse of similarity: each palette color is charged for how far it
// has intruded into the radius around its nearest avoid color, and scores
// zero once it is outside every radius. Avoid colors are measured as given —
// unlike similarity targets they are deliberately not coerced into the
// working color space, since the point is distance from the exact color.

import { deltaE } from '../../utils/deltaE.js';
import { resolveDistanceOptions, getMaxDistance } from '../../utils/distanceOptions.js';
import { createColor } from '../../utils/paletteColor.js';

// Radius within which a palette color is penalized, as a fraction of the
// maximum distance for the configured metric.
const DEFAULT_RADIUS = 0.15;

// Avoid lists are converted once per descriptor array, not once per cost
// evaluation.
const AVOID_COLORS = new WeakMap();

const getAvoidColors = (descriptor) => {
    const colors = descriptor.colors;
    if (!Array.isArray(colors) || colors.length === 0) {
        return [];
    }
    if (!AVOID_COLORS.has(colors)) {
        AVOID_COLORS.set(colors, colors.map((color) => createColor(color)));
    }
    return AVOID_COLORS.get(colors);
};

const evaluateAvoid = (state, config, descriptor = {}) => {
    const colors = state.colors || [];
    if (colors.length === 0) {
        return 0;
    }

    const avoidColors = getAvoidColors(descriptor);
    if (avoidColors.length === 0) {
        return 0;
    }

    const radius =
        Number.isFinite(descriptor.radius) && descriptor.radius > 0
            ? Math.min(descriptor.radius, 1)
            : DEFAULT_RADIUS;
    const distanceOptions = resolveDistanceOptions(config);
    const radiusDistance = radius * getMaxDistance(distanceOptions);

    let cost = 0;
    for (let i = 0; i < colors.length; i++) {
        let nearest = Infinity;
        for (let j = 0; j < avoidColors.length; j++) {
            const diff = deltaE(colors[i], avoidColors[j], distanceOptions);
            // A non-finite distance tells us nothing about proximity, so skip
            // it: an unmeasurable avoid color leaves this color unpenalized
            // rather than counting as an exact hit.
            if (Number.isFinite(diff) && diff < nearest) {
                nearest = diff;
            }
        }
        cost += Math.max(0, 1 - nearest / radiusDistance);
    }

    return cost / colors.length;
};

export default evaluateAvoid;
