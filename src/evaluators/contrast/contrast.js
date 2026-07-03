const culori = require('culori');
const { createColor } = require('../../utils/paletteColor');

const { wcagContrast } = culori;

// WCAG contrast evaluator
// Optimizes for WCAG contrast requirements (3:1 for non-text, 4.5:1 for text)
const evaluateContrast = (state, config, descriptor = {}) => {
    const { colors } = state;
    const {
        background = '#ffffff',
        ratio = 3,
        checkAdjacent = false,
    } = descriptor;

    let cost = 0;
    let numChecks = 0;

    // Convert background color to palette color
    const backgroundCol = createColor(background);

    // Check contrast of each color against the background
    for (let i = 0; i < colors.length; i++) {
        const contrast = wcagContrast(colors[i], backgroundCol);

        // Penalize if contrast is below the required ratio
        // Similar to JND evaluator: exponential penalty when below threshold
        if (contrast < ratio) {
            cost += Math.pow(ratio / contrast, 4);
        } else {
            // Small cost even when above threshold to encourage higher contrast
            cost += Math.pow(ratio / contrast, 0.5);
        }
        numChecks++;
    }

    // Optionally check contrast with adjacent colors
    if (checkAdjacent) {
        for (let i = 0; i < colors.length - 1; i++) {
            const contrast = wcagContrast(colors[i], colors[i + 1]);

            // Apply a gentler penalty for adjacent colors since perfect contrast
            // between all adjacent pairs may be impossible
            if (contrast < ratio) {
                cost += Math.pow(ratio / contrast, 2);
            }
            numChecks++;
        }
    }

    // Normalize by number of checks to keep cost contribution consistent
    return cost / numChecks;
};

module.exports = evaluateContrast;
