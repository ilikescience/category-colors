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

const applyCvdToColor = (color, cvdType, severity) => {
    const filter = getCvdFilter(cvdType, severity);
    const simulated = filter(color);
    const newColor = createColor(simulated);
    newColor.fixedColor = color.fixedColor;
    newColor.fixedOrder = color.fixedOrder;
    return newColor;
}

const simulateCvd = (state, cvdType, severity) => {
    const { colors } = state;
    const cvdColors = colors.map((color) => applyCvdToColor(color, cvdType, severity));
    return { ...state, colors: cvdColors };
}

export default simulateCvd;
