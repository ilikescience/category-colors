const culori = require('culori');

const { converter, formatHex, useMode, parse, getMode } = culori;

// Register all color modes from Culori
(() => {
    Object.keys(culori)
        .filter((key) => key.startsWith('mode') && key.length > 4)
        .forEach((key) => {
            const def = culori[key];
            if (def && typeof def === 'object' && def.mode) {
                useMode(def);
            }
        });
})();

const getChannels = (mode) => {
    const modeDef = getMode(mode);
    if (modeDef && Array.isArray(modeDef.channels)) {
        return modeDef.channels.filter((channel) => channel !== 'alpha');
    }
    return null;
};

const getChannelWrap = (mode, channelIndex, configRange) => {
    const modeDef = getMode(mode);
    const channels = getChannels(mode);
    if (!modeDef || !channels || !channels[channelIndex]) {
        return null;
    }
    const channel = channels[channelIndex];
    const fixupName = modeDef.interpolate?.[channel]?.fixup?.name;

    // Channels with hue fixup functions should wrap
    if (fixupName && fixupName.toLowerCase().includes('hue')) {
        // Use the config range if provided, otherwise use the mode's default range
        if (configRange && Array.isArray(configRange)) {
            return configRange[1] - configRange[0];
        }
        const range = modeDef.ranges?.[channel];
        return range ? range[1] - range[0] : null;
    }
    return null;
};

const extractCoords = (color) => {
    const mode = color.mode || 'rgb';
    const channels = getChannels(mode);
    if (channels) {
        return channels.map((channel) => color[channel] ?? 0);
    }
    return [];
};

const toModeObject = (mode, coords) => {
    const channels = getChannels(mode);
    if (channels) {
        const colorObj = { mode };
        channels.forEach((channel, index) => {
            colorObj[channel] = coords[index] ?? 0;
        });
        return colorObj;
    }
    return { mode };
};

const createColor = (input, coords) => {
    let colorObj;

    // If input is already a color object with our custom properties, return it
    if (input && typeof input === 'object' && 'mode' in input && 'fixedColor' in input) {
        return input;
    }

    if (typeof input === 'string' && coords === undefined) {
        // Hex string or CSS color string
        colorObj = parse(input);
    } else if (typeof input === 'string' && Array.isArray(coords)) {
        // Mode + coords array: createColor('rgb', [1, 0, 0])
        colorObj = toModeObject(input, coords);
    } else if (input && typeof input === 'object') {
        // Already a Culori object or similar
        colorObj = { ...input };
        if (!colorObj.mode) {
            colorObj.mode = 'rgb';
        }
    } else {
        throw new Error('Unsupported color input');
    }

    if (!colorObj || !colorObj.mode) {
        throw new Error('Invalid color value');
    }

    // Add custom properties directly to the color object
    colorObj.fixedColor = false;
    colorObj.fixedOrder = false;

    // Add utility methods
    colorObj.to = function(space) {
        const convert = converter(space);
        const converted = convert(this);
        return { space, coords: extractCoords(converted) };
    };

    colorObj.toString = function() {
        return formatHex(this);
    };

    return colorObj;
};

module.exports = {
    createColor,
    extractCoords,
    toModeObject,
    getChannels,
    getChannelWrap,
};
