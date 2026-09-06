import type { Color, ColorInput, Evaluator } from '../index.js';

/** Looks up a single color's saliency on the 5-unit lab65 sample grid; higher means more consistently named. */
export function saliency(color: Color | ColorInput): number;

/** The color's cell on that grid, as an `"L,a,b"` key. Shared with the names evaluator. */
export function voxelKey(color: Color | ColorInput): string;

/**
 * Cost of the palette's nameability: `1 - mean saliency`, so consistently named
 * colors score near 0. Colors off the model's grid score the maximum 1.
 */
declare const evaluateSaliency: Evaluator;
export default evaluateSaliency;
