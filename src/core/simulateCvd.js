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
// collect one entry per value it has ever seen. Each filter gets a slot that
// the colors' memos index their simulations by.
const FILTERS = new Map();
const MAX_FILTERS = 64;
let filterCount = 0;

const getCachedCvdFilter = (cvdType, severity) => {
    let bySeverity = FILTERS.get(cvdType);
    if (!bySeverity) FILTERS.set(cvdType, (bySeverity = new Map()));
    let entry = bySeverity.get(severity);
    if (!entry) {
        if (filterCount >= MAX_FILTERS) {
            FILTERS.clear();
            FILTERS.set(cvdType, bySeverity);
            bySeverity.clear();
        }
        entry = { filter: getCvdFilter(cvdType, severity), slot: filterCount++ };
        bySeverity.set(severity, entry);
    }
    return entry;
};

// A simulation depends only on the color's value, so it is computed once per
// color and condition and reused while that color is unchanged; returning the
// same object also lets distances to it stay cached. The flags are copied on
// each call because they are not part of the value.
//
// culori's filters convert to rgb, transform there, and convert back to the
// input's mode. Handing them the memoized rgb skips the first step, which
// deltaE needs too; the result goes back the way culori would take it.
const simulateColor = (color, { filter, slot }) => {
    const memo = memoFor(color);
    let newColor = memo?.cvd?.[slot];
    if (!newColor) {
        newColor = createColor(
            memo ? converterTo(color.mode)(filter(convertMemoized(color, memo, 'rgb'))) : filter(color)
        );
        if (memo) {
            (memo.cvd ??= [])[slot] = newColor;
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
    const entry = getCachedCvdFilter(cvdType, severity);
    return { ...state, colors: state.colors.map((color) => simulateColor(color, entry)) };
};

export default simulateCvd;
