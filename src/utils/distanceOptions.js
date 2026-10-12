import { createColor } from './paletteColor.js';
import { deltaE, metricFor } from './deltaE.js';

const DEFAULT_REFERENCE_COLORS = [
    '#000000',
    '#ffffff',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#00ffff',
    '#ff00ff',
];

const REFERENCE_COLORS = DEFAULT_REFERENCE_COLORS.map((hex) => createColor(hex));

const resolveDistanceOptions = (config = {}, overrides = {}) => {
    const distanceConfig = config.colorDistance || {};

    const method = overrides.method || distanceConfig.method || config.deltaEMethod || 'ciede2000';
    const space =
        overrides.space ||
        distanceConfig.space ||
        config.deltaESpace ||
        'lab65';
    const cmc = overrides.cmc || distanceConfig.cmc;
    const maxDistance =
        overrides.maxDistance ??
        distanceConfig.maxDistance ??
        config.deltaEMaxDistance ??
        null;
    return { method, space, cmc, maxDistance };
};

const getMaxDistance = (options = {}) => {
    if (!options || typeof options !== 'object') {
        return 1;
    }

    if (Number.isFinite(options.maxDistance) && options.maxDistance > 0) {
        return options.maxDistance;
    }

    // Cached on the metric's record, which deltaE already keys by the
    // options that matter.
    const metric = metricFor(options);
    if (metric.maxDistance !== undefined) {
        return metric.maxDistance;
    }

    let maxDistance = 0;
    for (let i = 0; i < REFERENCE_COLORS.length; i++) {
        for (let j = i + 1; j < REFERENCE_COLORS.length; j++) {
            const diff = deltaE(REFERENCE_COLORS[i], REFERENCE_COLORS[j], options);
            if (Number.isFinite(diff) && diff > maxDistance) {
                maxDistance = diff;
            }
        }
    }

    if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
        maxDistance = 1;
    }

    metric.maxDistance = maxDistance;
    return maxDistance;
};

export { resolveDistanceOptions, getMaxDistance };
