import * as culori from 'culori';
import { randomVector } from './utils.js';
import { createColor, getChannelWrap, getChannels, toModeObject } from './paletteColor.js';
import { clampToGamut, formatColor, inGamut, resolveGamut } from './gamut.js';

const { clampGamut, converter } = culori;

// A channel's constraint is a list of windows, each a sorted [min, max]. The
// config may give one window or several per channel; on a cyclic channel such
// as hue a window with min > max is the arc crossing zero ([300, 60] is the
// 120° arc through 0) and is split at the seam here, so nothing downstream has
// to know about wrapped windows.
const resolveWindows = (entry, period, domainStart) => {
    if (!entry) {
        return null;
    }
    const list = Array.isArray(entry[0]) ? entry : [entry];
    const windows = [];
    list.forEach(([a, b]) => {
        if (period && a > b) {
            windows.push([a, domainStart + period], [domainStart, b]);
        } else {
            windows.push(a <= b ? [a, b] : [b, a]);
        }
    });
    windows.sort((x, y) => x[0] - y[0]);
    const merged = [];
    windows.forEach((window) => {
        const last = merged[merged.length - 1];
        if (last && window[0] <= last[1]) {
            last[1] = Math.max(last[1], window[1]);
        } else {
            merged.push([window[0], window[1]]);
        }
    });
    return merged;
};

const windowsSpan = (windows) => windows.reduce((sum, [min, max]) => sum + (max - min), 0);

// One uniform draw over the combined width lands in each window with
// probability proportional to its width, and uniformly inside it. For a single
// window this is exactly min + random() * (max - min).
const drawInWindows = (windows, random) => {
    let offset = random() * windowsSpan(windows);
    for (let i = 0; i < windows.length; i++) {
        const [min, max] = windows[i];
        if (offset <= max - min || i === windows.length - 1) {
            return min + offset;
        }
        offset -= max - min;
    }
    return windows[0][0];
};

// Brings a value inside the windows: cyclic channels are reduced modulo their
// period first, and a value outside every window moves to the nearest window
// edge (around the circle, for a cyclic channel).
const snapToWindows = (value, windows, period, domainStart) => {
    if (!windows || windows.length === 0) {
        return value;
    }
    let result = value;
    if (period) {
        result = ((((result - domainStart) % period) + period) % period) + domainStart;
    }
    if (windows.some(([min, max]) => min <= result && result <= max)) {
        return result;
    }
    let nearest = result;
    let nearestDistance = Infinity;
    windows.forEach((window) => {
        window.forEach((edge) => {
            let distance = Math.abs(result - edge);
            if (period) {
                distance = Math.min(distance, period - distance);
            }
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = edge;
            }
        });
    });
    return nearest;
};

const resolveRanges = (mode, configRanges) => {
    const modeDefinition = culori.getMode(mode);
    const channels = getChannels(mode) || [];
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

// Per channel: the windows a value may sit in, the channel's period if it is
// cyclic (else null), where the cycle starts, and the width that scales a
// mutation step — the total width of the windows.
const resolveChannels = (colorSpace) => {
    const { mode } = colorSpace;
    const ranges = resolveRanges(mode, colorSpace.ranges);
    const modeRanges = culori.getMode(mode)?.ranges || {};
    const channels = getChannels(mode) || [];
    return channels.map((channel, index) => {
        const defaultRange = modeRanges[channel];
        const domainStart = Array.isArray(defaultRange) ? defaultRange[0] : 0;
        const override = colorSpace.wrap ? colorSpace.wrap[index] : undefined;
        let period = null;
        if (colorSpace.wrap) {
            if (typeof override === 'number' && override > 0) period = override;
            else if (override) period = getChannelWrap(mode, index);
        } else {
            period = getChannelWrap(mode, index);
        }
        const windows = resolveWindows(ranges[index], period, domainStart);
        const span = windows ? windowsSpan(windows) : 0;
        return { windows, period, domainStart, span: span > 0 ? span : 1 };
    });
};

const normalizeCoords = (color, channels, channelInfo) =>
    channels.map((channel, index) => {
        const value = color[channel];
        if (Number.isFinite(value)) {
            return value;
        }
        const { windows } = channelInfo[index];
        if (windows && windows.length > 0) {
            return (windows[0][0] + windows[0][1]) / 2;
        }
        return 0;
    });

const ensureColorInSpace = (color, config, _distanceOptions, { context = 'color', silent = false } = {}) => {
    const { colorSpace } = config;
    if (!colorSpace || !colorSpace.mode) {
        return color;
    }
    const mode = colorSpace.mode;
    const channelInfo = resolveChannels(colorSpace);

    const paletteColor = createColor(color);
    // Value-fixed colors keep their exact value; coercing them into the working
    // space would silently change what the user pinned. This is the single
    // place coercion happens, so honoring the flag here covers every caller.
    if (paletteColor.fixedColor) {
        return paletteColor;
    }
    const fixedColor = paletteColor.fixedColor;
    const fixedOrder = paletteColor.fixedOrder;
    const lockedChannels = paletteColor.lockedChannels || [];

    let workingColor = paletteColor;
    let gamutAdjusted = false;

    // config.colorSpace.gamut (sRGB by default) bounds the colors, apart from
    // the mode they move in. A mode whose own gamut is the one asked for
    // (okhsl, hsl or rgb under sRGB) keeps culori's check and clamp, so its
    // runs reproduce earlier releases. Any other pairing, such as oklch, which
    // culori gives no gamut at all, is checked against the gamut and clamped by
    // reducing chroma in OKLCh, keeping lightness and hue.
    const gamut = resolveGamut(colorSpace);
    const modeGamut = culori.getMode(mode)?.gamut;
    const native = gamut !== null && (modeGamut === true ? mode : modeGamut) === gamut.mode;
    const isInGamut = gamut === null ? () => true : native ? culori.inGamut(mode) : inGamut(gamut.mode);
    const clamp = native ? clampGamut(mode) : clampToGamut(gamut?.mode);

    if (!isInGamut(paletteColor)) {
        gamutAdjusted = true;
        try {
            const clamped = clamp(paletteColor);
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

    const channels = getChannels(mode) || [];
    const snap = (source) =>
        normalizeCoords(converter(mode)(source), channels, channelInfo).map((value, index) => {
            const { windows, period, domainStart } = channelInfo[index];
            return snapToWindows(value, windows, period, domainStart);
        });
    let coords = snap(workingColor);
    // Snapping can push a clamped color back out: a chroma window whose minimum
    // is above what the gamut can show at that hue and lightness. The gamut
    // wins, since output in it would clip the color anyway, so clamp once more
    // without snapping. Lightness and hue are kept, so only a chroma (or a/b)
    // window gives way.
    if (gamut !== null && !native) {
        const snapped = toModeObject(mode, coords);
        if (!isInGamut(snapped)) {
            gamutAdjusted = true;
            coords = normalizeCoords(converter(mode)(clamp(snapped)), channels, channelInfo);
        }
    }

    if (!silent && gamutAdjusted) {
        // Formatting converts, so it waits until there is a warning. oklch()
        // shows the color as given, where hex would clip it.
        const original = formatColor(paletteColor, null);
        console.warn(
            `[colorSpace] ${context}: color ${original} adjusted to fit the ${gamut.name} gamut.`
        );
    }

    const adjusted = createColor(toModeObject(mode, coords));
    adjusted.fixedColor = fixedColor;
    adjusted.fixedOrder = fixedOrder;
    adjusted.lockedChannels = lockedChannels;
    return adjusted;
};

const randomColorInSpace = (config, distanceOptions, random = Math.random) => {
    const { colorSpace } = config;
    if (!colorSpace || !colorSpace.mode) {
        return createColor('#000000');
    }
    const mode = colorSpace.mode;
    // One uniform draw per channel, in channel order, over that channel's
    // windows (or [0, 1] for a channel with no range at all).
    const coords = resolveChannels(colorSpace).map(({ windows }) =>
        drawInWindows(windows && windows.length > 0 ? windows : [[0, 1]], random)
    );
    const color = createColor(toModeObject(mode, coords));
    return ensureColorInSpace(color, config, distanceOptions, { context: 'random color', silent: true });
};

const mutateColorInSpace = (color, distance, config, distanceOptions, random = Math.random) => {
    const { colorSpace } = config;
    const mode = colorSpace.mode;
    const channelInfo = resolveChannels(colorSpace);

    const converted = converter(mode)(color);
    const channels = getChannels(mode) || [];
    const coords = normalizeCoords(converted, channels, channelInfo);
    const lockedChannels = color.lockedChannels || [];
    const freeChannels = coords
        .map((_, index) => index)
        .filter((index) => !lockedChannels.includes(index));
    if (freeChannels.length === 0) {
        return color;
    }
    // Generate the mutation vector over the free channels only, so locking
    // channels doesn't shrink the effective step size.
    const mutation = randomVector(freeChannels.length, distance, random);
    const deltas = new Array(coords.length).fill(0);
    freeChannels.forEach((channelIndex, i) => {
        deltas[channelIndex] = mutation[i];
    });
    const mutated = coords.map((value, index) => {
        const { windows, period, domainStart, span } = channelInfo[index];
        return snapToWindows(value + deltas[index] * span, windows, period, domainStart);
    });
    const mutatedColor = createColor(toModeObject(mode, mutated));
    mutatedColor.fixedColor = color.fixedColor;
    mutatedColor.fixedOrder = color.fixedOrder;
    mutatedColor.lockedChannels = color.lockedChannels || [];
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

export { ensureColorInSpace, randomColorInSpace, mutateColorInSpace, sanitizePalette, resolveChannels };
