// Algorithm for simulating a color as it may appear to a person with color deficiency
// Uses Culori's built-in deficiency filters based on Machado et al. (2009)
// "A Physiologically-based Model for Simulation of Color Vision Deficiency"

const { createColor } = require('../utils/paletteColor');
const {
    filterDeficiencyProt,
    filterDeficiencyDeuter,
    filterDeficiencyTrit,
    converter
} = require('culori');

const toRgb = converter('rgb');

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
        default:
            throw new Error(`Unknown CVD type: ${cvdType}`);
    }
};

const applyCvdToColor = (color, cvdType, severity) => {
    const filter = getCvdFilter(cvdType, severity);
    const rgbColor = toRgb(color);
    const simulated = filter(rgbColor);
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

module.exports = simulateCvd;
