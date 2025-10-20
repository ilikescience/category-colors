const culori = require('culori');
const { randomVector } = require('./utils');
const { createColor, getChannelWrap } = require('./paletteColor');

const { random, clampGamut, inGamut } = culori;

const clampChannelToRange = (value, range, wrap) => {
    if (!range) {
        return value;
    }
    let result = value;
    if (wrap) {
        const modulus = typeof wrap === 'number' ? wrap : range[1] - range[0];
        if (modulus > 0) {
            result = ((result - range[0]) % modulus + modulus) % modulus + range[0];
        }
    }
    const [min, max] = range;
    if (result < min) return min;
    if (result > max) return max;
    return result;
};

const getChannelSpan = (range, wrap) => {
    let span = null;

    if (wrap) {
        if (typeof wrap === 'number' && Number.isFinite(wrap) && wrap !== 0) {
            span = Math.abs(wrap);
        } else if (range && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
            const diff = range[1] - range[0];
            if (Number.isFinite(diff) && diff !== 0) {
                span = Math.abs(diff);
            }
        }
    }

    if (span === null && range && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
        const diff = range[1] - range[0];
        if (Number.isFinite(diff) && diff !== 0) {
            span = Math.abs(diff);
        }
    }

    if (span === null || span === 0) {
        return 1;
    }

    return span;
};

const resolveRanges = (mode, configRanges) => {
    const modeDefinition = culori.getMode(mode);
    const channels = modeDefinition?.channels?.filter((channel) => channel !== 'alpha') || [];
    if (Array.isArray(configRanges) && configRanges.length === channels.length) {
        return configRanges.slice();
    }
    const modeRanges = modeDefinition?.ranges || {};
    const objectRanges =
        configRanges && !Array.isArray(configRanges) && typeof configRanges === 'object'
            ? configRanges
            : null;

    return channels.map((channel, index) => {
        if (Array.isArray(configRanges) && Array.isArray(configRanges[index])) {
            return configRanges[index];
        }
        if (objectRanges && Array.isArray(objectRanges[channel])) {
            return objectRanges[channel];
        }
        const defaultRange = modeRanges[channel];
        if (Array.isArray(defaultRange)) {
            return defaultRange.slice();
        }
        return null;
    });
};

const normalizeCoords = (coords, ranges) =>
    coords.map((value, index) => {
        if (Number.isFinite(value)) {
            return value;
        }
        const range = ranges[index];
        if (range) {
            return (range[0] + range[1]) / 2;
        }
        return 0;
    });

const ensureColorInSpace = (color, config, _distanceOptions, { context = 'color', silent = false } = {}) => {
    const { colorSpace } = config;
    if (!colorSpace || !colorSpace.mode) {
        return color;
    }
    const mode = colorSpace.mode;
    const ranges = resolveRanges(mode, colorSpace.ranges);
    // Auto-detect wrap from culori's mode definition if not explicitly provided
    const wrap = colorSpace.wrap || ranges.map((range, index) => getChannelWrap(mode, index, range));

    const paletteColor = createColor(color);
    const originalHex = typeof paletteColor.toString === 'function' ? paletteColor.toString() : '#000000';
    const fixedColor = paletteColor.fixedColor;
    const fixedOrder = paletteColor.fixedOrder;

    let workingColor = paletteColor;
    let gamutAdjusted = false;

    if (!inGamut(mode)(paletteColor)) {
        gamutAdjusted = true;
        try {
            const clamped = clampGamut(mode)(paletteColor);
            if (clamped) {
                workingColor = createColor(clamped);
            }
        } catch (error) {
            if (!silent) {
                console.warn(
                    `[colorSpace] ${context}: gamut clamp failed (${error.message}).`
                );
            }
        }
    }

    const conversion = workingColor.to(mode);
    let coords = normalizeCoords(conversion.coords.slice(), ranges);

    let rangeAdjusted = false;
    coords = coords.map((value, index) => {
        const range = ranges[index];
        const wrapped = clampChannelToRange(value, range, wrap[index]);
        if (wrapped !== value) {
            rangeAdjusted = true;
        }
        return wrapped;
    });

    if (!silent && gamutAdjusted) {
        console.warn(
            `[colorSpace] ${context}: color ${originalHex} adjusted to fit ${mode} gamut.`
        );
    }

    const adjusted = createColor(mode, coords);
    adjusted.fixedColor = fixedColor;
    adjusted.fixedOrder = fixedOrder;
    return adjusted;
};

const randomColorInSpace = (config, distanceOptions) => {
    const { colorSpace } = config;
    if (!colorSpace || !colorSpace.mode) {
        return createColor('#000000');
    }
    const mode = colorSpace.mode;
    const ranges = resolveRanges(mode, colorSpace.ranges);

    // Build constraints object for culori's random() function
    const constraints = {};
    const channels = culori.getMode(mode)?.channels || [];

    channels.forEach((channel, index) => {
        if (channel !== 'alpha' && ranges[index]) {
            constraints[channel] = ranges[index];
        }
    });

    // Use culori's random() function with mode and constraints
    const randomColor = random(mode, Object.keys(constraints).length > 0 ? constraints : undefined);
    const color = createColor(randomColor);
    return ensureColorInSpace(color, config, distanceOptions, { context: 'random color', silent: true });
};

const mutateColorInSpace = (color, distance, config, distanceOptions) => {
    const { colorSpace } = config;
    const mode = colorSpace.mode;
    const ranges = resolveRanges(mode, colorSpace.ranges);
    // Auto-detect wrap from culori's mode definition if not explicitly provided
    const wrap = colorSpace.wrap || ranges.map((range, index) => getChannelWrap(mode, index, range));

    const coords = normalizeCoords(color.to(mode).coords.slice(), ranges);
    const dimensions = coords.length;
    const mutation = randomVector(dimensions, distance);
    const mutated = coords.map((value, index) => {
        const range = ranges[index];
        const span = getChannelSpan(range, wrap[index]);
        const delta = mutation[index] * span;
        return clampChannelToRange(value + delta, range, wrap[index]);
    });
    const mutatedColor = createColor(mode, mutated);
    mutatedColor.fixedColor = color.fixedColor;
    mutatedColor.fixedOrder = color.fixedOrder;
    return ensureColorInSpace(mutatedColor, config, distanceOptions, { context: 'mutation', silent: true });
};

const sanitizePalette = (colors, config, distanceOptions, contextPrefix = 'color', silent = false) =>
    colors.map((color, index) => {
        // Ensure the color is a color object (handles strings, objects, etc.)
        const paletteColor = createColor(color);
        return ensureColorInSpace(paletteColor, config, distanceOptions, {
            context: `${contextPrefix}[${index}]`,
            silent,
        });
    });

module.exports = {
    ensureColorInSpace,
    randomColorInSpace,
    mutateColorInSpace,
    sanitizePalette,
};
