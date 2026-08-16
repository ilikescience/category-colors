import type { Color, ColorInput, Evaluator } from '../index.js';

/** Looks up a single color's saliency on the 5-unit lab65 sample grid. */
export function saliency(color: Color | ColorInput): number;

/** Mean saliency across the palette. Unknown grid cells score 0. */
declare const evaluateSaliency: Evaluator;
export default evaluateSaliency;
