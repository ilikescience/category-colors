const { isInRange } = require('../utils/utils');
const { toOkhsl01, fromOkhsl01 } = require('../utils/colorSpace');

const closestInArray = (n, array) => {
    return array.reduce((prev, curr) => (Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev));
};

// Clips a channel to a range, with an optional wrapping behavior.
// Wrap represents the total range of a channel that "wraps around",
// like hue. For example, if the wrap value is 1, the range is [0, 0.5]
// and the channel is 0.9, the result should be 0.
const clipChannelToRange = (channel, range, wrap = false) => {
    if (isInRange(channel, range)) {
        return channel;
    }
    const flatRange = range.flat();
    // if wrap is true, a value like 0.1 will be closer to 1 than 0.5
    if (wrap) {
        // put a copy of the range on either side of the original range
        const extendedRange = flatRange.concat(
            flatRange.map((value) => value + wrap).concat(flatRange.map((value) => value - wrap))
        );
        return closestInArray(channel, extendedRange) % wrap;
    } else {
        return closestInArray(channel, flatRange);
    }
};

const clipColorToOkhslRange = (color, hueRange, saturationRange, luminosityRange) => {
    const okhsl = toOkhsl01(color);
    const h = clipChannelToRange(okhsl[0], hueRange, 1);
    const s = clipChannelToRange(okhsl[1], saturationRange);
    const l = clipChannelToRange(okhsl[2], luminosityRange);
    const newColor = fromOkhsl01([h, s, l]);
    newColor.fixedColor = color.fixedColor;
    newColor.fixedOrder = color.fixedOrder;
    return newColor;
};

const randomColorInOkhslRange = (hueRange, saturationRange, luminosityRange) => {
    let h, s, l;
    do {
        h = Math.random();
    } while (!isInRange(h, hueRange));
    do {
        s = Math.random();
    } while (!isInRange(s, saturationRange));
    do {
        l = Math.random();
    } while (!isInRange(l, luminosityRange));
    return fromOkhsl01([h, s, l]);
};

const initializeColors = (state, config) => {
    const initializedState = {
        ...state,
        colors: Array.from({ length: config.colorCount }, (_, i) => state.colors?.[i]),
    };
    for (let i = 0; i < config.colorCount; i++) {
        if (state.colors[i]?.fixedColor) {
            initializedState.colors[i] = state.colors[i];
            continue;
        }
        initializedState.colors[i] = state.colors[i]
            ? clipColorToOkhslRange(
                  state.colors[i],
                  config.hueRange,
                  config.saturationRange,
                  config.luminosityRange
              )
            : randomColorInOkhslRange(
                  config.hueRange,
                  config.saturationRange,
                  config.luminosityRange
              );
    }
    return initializedState;
};

module.exports = {
    randomColorInOkhslRange,
    initializeColors,
};
