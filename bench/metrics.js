// Measurements used to compare palettes. Every metric here is a property of a
// finished palette, computed independently of how it was produced, so a
// generated palette and a hand-designed one are scored the same way.

import { wcagContrast } from 'culori';
import { createColor, deltaE, simulateCvd } from '../src/index.js';
import { nameDifference } from '../src/evaluators/names/names.js';

/**
 * The conditions each palette is scored under. The five deficiencies use
 * culori's filters, which implement Machado et al. (2009); grayscale is a
 * luminance projection standing in for print, not a model of anyone's vision.
 * Every CVD number here is relative to those models and should be reported
 * with them named.
 */
export const CVD_CONDITIONS = [
    { label: 'deuteranomaly-0.5', type: 'deuteranomaly', severity: 0.5 },
    { label: 'deuteranopia', type: 'deuteranopia', severity: 1 },
    { label: 'protanomaly-0.5', type: 'protanomaly', severity: 0.5 },
    { label: 'protanopia', type: 'protanopia', severity: 1 },
    { label: 'tritanopia', type: 'tritanopia', severity: 1 },
    { label: 'grayscale', type: 'grayscale', severity: 1 },
];

const DISTANCE = { method: 'ciede2000', space: 'lab65' };

const pairwise = (colors, measure) => {
    const values = [];
    for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
            values.push(measure(colors[i], colors[j]));
        }
    }
    return values;
};

const pairwiseDistances = (colors) =>
    pairwise(colors, (a, b) => deltaE(a, b, DISTANCE));

const summarize = (values) => {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
        values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return { min: Math.min(...values), mean, sd: Math.sqrt(variance) };
};

/**
 * Scores one palette.
 *
 * `minDeltaE` is the headline number: a categorical palette is only as good as
 * its closest pair, since that pair is what a reader actually confuses. The
 * CVD variants are the same statistic measured after simulation, and
 * `uniformity` is the coefficient of variation of all pairwise distances —
 * lower means no pair is disproportionately close or far.
 *
 * `minNameDifference` and `meanNameDifference` are Heer & Stone name difference
 * (1 - cosine of the colors' naming vectors), the term Colorgorical and
 * Palettailor both optimize; 0 means two colors get the same name.
 */
export const scorePalette = (input) => {
    const colors = input.map((color) => createColor(color));
    const distances = pairwiseDistances(colors);
    const { min, mean, sd } = summarize(distances);

    const cvd = {};
    for (const condition of CVD_CONDITIONS) {
        const simulated = simulateCvd({ colors }, condition.type, condition.severity);
        cvd[condition.label] = Math.min(...pairwiseDistances(simulated.colors));
    }

    const names = summarize(pairwise(colors, nameDifference));
    const contrasts = colors.map((color) => String(color));
    return {
        colorCount: colors.length,
        minDeltaE: min,
        meanDeltaE: mean,
        // Coefficient of variation; 0 would mean every pair is equidistant.
        uniformity: sd / mean,
        cvd,
        minCvdDeltaE: Math.min(...Object.values(cvd)),
        minNameDifference: names.min,
        meanNameDifference: names.mean,
        minContrastWhite: Math.min(...contrasts.map((c) => wcagContrast(c, '#ffffff'))),
        minContrastBlack: Math.min(...contrasts.map((c) => wcagContrast(c, '#000000'))),
    };
};

/** Mean of a metric across trials, with its standard deviation. */
export const aggregate = (scores, pick) => {
    const values = scores.map(pick);
    const { mean, sd } = summarize(values);
    return { mean, sd, min: Math.min(...values), max: Math.max(...values) };
};
