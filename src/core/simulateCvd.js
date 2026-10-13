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
import { convertMemoized, converterTo, memoFor } from '../utils/colorMemo.js';
import {
    filterDeficiencyProt,
    filterDeficiencyDeuter,
    filterDeficiencyTrit,
    filterGrayscale,
} from 'culori';

// Normal vision passes each color through unchanged, as it always has.
const withFlagsOf = (color) => {
    const newColor = createColor(color);
    newColor.fixedColor = color.fixedColor;
    newColor.fixedOrder = color.fixedOrder;
    return newColor;
};

const getCvdFilter = (cvdType, severity) => {
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

// Building a filter computes its matrix, so build each one once. Severity is
// caller-supplied and continuous, so a long-lived process could otherwise
// collect one entry per value it has ever seen.
const FILTERS = new Map();
const MAX_FILTERS = 64;

const getCachedCvdFilter = (key, cvdType, severity) => {
    let filter = FILTERS.get(key);
    if (!filter) {
        if (FILTERS.size >= MAX_FILTERS) {
            FILTERS.clear();
        }
        filter = getCvdFilter(cvdType, severity);
        FILTERS.set(key, filter);
    }
    return filter;
};

// A simulation depends only on the color's value, so it is computed once per
// color and condition and reused while that color is unchanged; returning the
// same object also lets distances to it stay cached. The flags are copied on
// each call because they are not part of the value.
//
// culori's filters work in rgb, so the result is returned in rgb rather than
// converted back to the input's mode: the evaluators only measure it, which
// means converting it to Lab, and a round trip through a cylindrical space
// first is the most expensive step of simulating a palette.
const simulateColor = (color, filter, key) => {
    const memo = memoFor(color);
    let newColor = memo?.cvd?.get(key);
    if (!newColor) {
        newColor = createColor(filter(memo ? convertMemoized(color, memo, 'rgb') : converterTo('rgb')(color)));
        if (memo) {
            (memo.cvd ??= new Map()).set(key, newColor);
        }
    }
    newColor.fixedColor = color.fixedColor;
    newColor.fixedOrder = color.fixedOrder;
    return newColor;
};

const simulateCvd = (state, cvdType, severity) => {
    if (cvdType === 'Normal') {
        return { ...state, colors: state.colors.map(withFlagsOf) };
    }
    const key = `${cvdType}|${severity}`;
    const filter = getCachedCvdFilter(key, cvdType, severity);
    return { ...state, colors: state.colors.map((color) => simulateColor(color, filter, key)) };
};

export default simulateCvd;
