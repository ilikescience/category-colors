// Simulates a color as it may appear under a color vision deficiency.
//
// The three dichromacy filters are culori's, which implement Machado, Oliveira
// and Fernandes (2009), "A Physiologically-based Model for Simulation of Color
// Vision Deficiency". Any claim about CVD is relative to the model that
// produced it, so name this one wherever the numbers are reported.
//
// 'grayscale' is deliberately not one of them. It is culori's luminance
// projection, the same matrix CSS `filter: grayscale()` uses, and it stands in
// for printing or photocopying rather than for a person's vision. It is not a
// physiological model of achromatopsia and must not be described as one.

import { createColor } from '../utils/paletteColor.js';
import { convertMemoized, memoFor } from '../utils/colorMemo.js';
import {
    filterDeficiencyProt,
    filterDeficiencyDeuter,
    filterDeficiencyTrit,
    filterGrayscale,
} from 'culori';

const getCvdFilter = (cvdType, severity) => {
    if (cvdType === "Normal") {
        return (color) => color; // No transformation for normal vision
    }

    // Extract the base type from cvdType (e.g., "protanomaly" from "protanomaly_0.5")
    const baseType = cvdType.split(/_/)[0].toLowerCase();

    switch (baseType) {
        case 'protanomaly':
        case 'protanopia':
            return filterDeficiencyProt(severity);
        case 'deuteranomaly':
        case 'deuteranopia':
            return filterDeficiencyDeuter(severity);
        case 'tritanomaly':
        case 'tritanopia':
            return filterDeficiencyTrit(severity);
        case 'grayscale':
            return filterGrayscale(severity);
        default:
            throw new Error(`Unknown CVD type: ${cvdType}`);
    }
};

// Building a filter computes its matrix, so build each one once.
const FILTERS = new Map();

const getCachedCvdFilter = (key, cvdType, severity) => {
    let filter = FILTERS.get(key);
    if (!filter) {
        filter = getCvdFilter(cvdType, severity);
        FILTERS.set(key, filter);
    }
    return filter;
};

// A simulation depends only on the color's value, so it is computed once per
// color and condition and reused while that color is unchanged. Returning the
// same object each time also lets the memoized distances in deltaE.js hit for
// it. The flags are copied on every call because they are not part of the
// value and may have changed since.
//
// culori's filters convert to rgb, transform there, and convert back to the
// input's mode. Handing them the memoized rgb skips the first step, which
// deltaE.js needs too; the result goes back the way culori would take it.
const simulateColor = (color, filter, key, isNormal) => {
    const memo = memoFor(color);
    let newColor = memo?.cvd?.get(key);
    if (!newColor) {
        const simulated =
            isNormal || !memo
                ? filter(color)
                : convertMemoized(filter(convertMemoized(color, memo, 'rgb')), null, color.mode);
        newColor = createColor(simulated);
        if (memo) {
            (memo.cvd ??= new Map()).set(key, newColor);
        }
    }
    newColor.fixedColor = color.fixedColor;
    newColor.fixedOrder = color.fixedOrder;
    return newColor;
};

const simulateCvd = (state, cvdType, severity) => {
    const key = `${cvdType}|${severity}`;
    const filter = getCachedCvdFilter(key, cvdType, severity);
    const isNormal = cvdType === 'Normal';
    const cvdColors = state.colors.map((color) => simulateColor(color, filter, key, isNormal));
    return { ...state, colors: cvdColors };
}

export default simulateCvd;
