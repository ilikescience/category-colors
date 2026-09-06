import type { Color, ColorInput, Evaluator } from '../index.js';

/** The 153 color terms of the Heer & Stone naming model, in vector order. */
export const terms: readonly string[];

/** The terms people use for a color, most common first, with each term's share of the answers. */
export function nameTerms(color: Color | ColorInput): { term: string; share: number }[];

/** 1 - cosine similarity of two colors' name vectors: 0 means the same name, 1 means no term in common. */
export function nameDifference(a: Color | ColorInput, b: Color | ColorInput): number;

/** Mean pairwise name similarity across the palette, in [0, 1]. Carries a ~260 kB lookup table. */
declare const evaluateNames: Evaluator;
export default evaluateNames;
