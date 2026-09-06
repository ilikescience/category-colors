// Type declarations for category-colors.
//
// Hand-written rather than generated: the source is plain JavaScript and
// keeping these by hand avoids a build step and a TypeScript dependency.
// Anything added to src/index.js should be added here too — the
// `exports subpath resolves` test only checks that this file exists, not
// that it is complete.

/** A color-space identifier culori understands, e.g. 'okhsl', 'lab65', 'rgb'. */
export type ColorMode = string;

/** Anything createColor accepts: a CSS/hex string, a culori object, or a spec. */
export type ColorInput = string | ColorObject | ColorSpec;

/**
 * A culori color in an input position. Declared as a union so both forms work:
 * the bare member accepts culori's own color interfaces, which carry no index
 * signature, and the indexed member lets an inline object literal name its
 * channels without tripping excess-property checking.
 */
export type ColorObject =
  | { mode: ColorMode }
  | { mode: ColorMode; [channel: string]: unknown };

/** A culori color in a return position: `mode` plus that mode's channels. */
export interface CulorMap {
  mode: ColorMode;
  [channel: string]: unknown;
}

/** A color plus the constraints the optimizer should respect for it. */
export interface ColorSpec {
  color: string | ColorObject;
  /** Exclude this color from mutation entirely. */
  fixedColor?: boolean;
  /** Pin this color to its current index during order optimization. */
  fixedOrder?: boolean;
  /** Channel indices held constant while mutating, e.g. [0] to lock hue. */
  lockedChannels?: number[];
}

/** The constraints and helpers createColor attaches to a culori color. */
export interface ColorMeta {
  fixedColor: boolean;
  fixedOrder: boolean;
  lockedChannels: number[];
  /** Formats as a hex string. */
  toString(): string;
  /** Converts to `mode` and returns its channel values in channel order. */
  to(mode: ColorMode): { space: ColorMode; coords: number[] };
}

/**
 * A culori color carrying the optimizer's per-color constraints. Declared as an
 * intersection rather than an interface because CulorMap's channel index
 * signature cannot cover ColorMeta's members, and intersections are exempt from
 * that rule.
 */
export type Color = CulorMap & ColorMeta;

export type CvdType =
  | 'protanomaly'
  | 'protanopia'
  | 'deuteranomaly'
  | 'deuteranopia'
  | 'tritanomaly'
  | 'tritanopia';

export interface CvdSimulation {
  type: CvdType;
  /** 0 (unaffected) to 1 (full dichromacy). */
  severity: number;
}

export type DistanceMethod =
  | 'ciede2000'
  | 'cie76'
  | 'cie94'
  | 'cmc'
  | 'euclidean';

export interface ColorDistance {
  method?: DistanceMethod;
  /** Space the distance is measured in. Defaults to 'lab65'. */
  space?: ColorMode;
  cmc?: { l: number; c: number };
  /**
   * Normalizing maximum. Defaults to the largest distance among eight
   * reference primaries, computed once per method/space pair.
   */
  maxDistance?: number;
}

/**
 * One entry in `config.evalFunctions`. Evaluator-specific options live on this
 * descriptor rather than on the top-level config, so the same evaluator can
 * appear several times with different settings.
 */
export interface EvalFunction {
  function: Evaluator;
  /** Relative weight. Weights are normalized against their sum, not to 1. */
  weight: number;
  /** Score this evaluator against a CVD-simulated copy of the palette. */
  cvd?: CvdSimulation;
  [option: string]: unknown;
}

export interface Config {
  evalFunctions: EvalFunction[];
  /** Temperature multiplier applied each iteration; closer to 1 cools slower. */
  coolingRate: number;
  /** Temperature at which the run stops. */
  cutoff: number;
  maxIterations: number;
  colorDistance?: ColorDistance;
  colorSpace?: {
    mode: ColorMode;
    /** Per-channel [min, max], in the channel order of `mode`. */
    ranges?: number[][];
    /** Overrides automatic cyclic-channel detection. Rarely needed. */
    wrap?: (number | boolean)[];
  };
  /** Distance below which two colors count as confusable. */
  jnd?: number;
  maxMutationDistance?: number;
  minMutationDistance?: number;
  similarityTarget?: ColorInput[];
  initialTemperatureSamples?: number;
  initialAcceptanceRate?: number;
  colorCount?: number;
  /** Set false to silence progress logging. */
  logProgress?: boolean;
  /** Record a [iteration, cost] trace on the returned state. */
  recordHistory?: boolean;
  /** Iterations between history samples. Defaults to maxIterations / 250. */
  historyInterval?: number;
  [option: string]: unknown;
}

export interface State {
  colors: Color[];
  temperature: number;
  iterations: number;
  cost: number;
  /** Present only when `config.recordHistory` is true. */
  costHistory?: [iteration: number, cost: number][];
}

/** The state passed in before prepareInitialState fills in the rest. */
export interface StateInput {
  colors: ColorInput[];
  temperature?: number;
  iterations?: number;
  cost?: number;
}

export type Evaluator = (
  state: State,
  config: Config,
  descriptor?: EvalFunction
) => number;

export interface EvaluatorCost {
  weight: number;
  /** The evaluator's raw score. */
  cost: number;
  /** The raw score times its share of the total weight. */
  weightedCost: number;
}

// ── Core ────────────────────────────────────────────────────────────────────

/**
 * Fills the palette to `config.colorCount`, clamps colors into the working
 * space, scores the result, and picks a starting temperature by sampling
 * random mutations.
 */
export function prepareInitialState(state: StateInput, config: Config): State;

export function runSimulatedAnnealing(state: State, config: Config): State;

/** Anneals, then reorders the palette so adjacent distances are even. */
export function runWithOrderOptimization(state: State, config: Config): State;

/** The weighted average of every evaluator's score. */
export function cost(state: State, config: Config): number;

/** Same computation as `cost`, itemized in `config.evalFunctions` order. */
export function costBreakdown(state: State, config: Config): EvaluatorCost[];

/** Returns a copy of `state` with each color passed through a CVD filter. */
export function simulateCvd(state: State, type: CvdType, severity: number): State;

// ── Configuration ───────────────────────────────────────────────────────────

export function createDefaultConfig(): Config;
export function createDefaultState(): StateInput;

// ── Color utilities ─────────────────────────────────────────────────────────

export function deltaE(a: ColorInput, b: ColorInput, options?: ColorDistance): number;
export function createColor(input: ColorInput, coords?: number[]): Color;
/** The channel names of `mode`, in order, or undefined if unknown. */
export function getChannels(mode: ColorMode): string[] | undefined;

// ── Evaluators ──────────────────────────────────────────────────────────────

export const energy: Evaluator;
export const range: Evaluator;
export const similarity: Evaluator;
export const avoid: Evaluator;
export const jnd: Evaluator;
export const contrast: Evaluator;
/** Nameability cost: `1 - mean saliency`, low for colors people name consistently. Carries a ~150 kB lookup table. */
export const saliency: Evaluator;

/**
 * Every evaluator, keyed by name, for building `evalFunctions` dynamically.
 * Referencing this object defeats tree-shaking — a bundler cannot know which
 * keys you index — so it pulls in saliency's lookup table too. Import the
 * evaluators you name individually to avoid that.
 */
export const evaluators: Record<string, Evaluator>;

// ── Data ────────────────────────────────────────────────────────────────────

/** Established categorical palettes, for comparison or as starting points. */
export const palettes: Record<string, Color[]>;

// ── Reporting ───────────────────────────────────────────────────────────────

export interface JndPair {
  indexA: number;
  indexB: number;
  /** Distance between the pair, rounded to three decimals. */
  deltaE: number;
  /** The two colors, formatted per `paletteSpace`. */
  colors: [string, string];
}

export interface JndTest {
  /** 'normal', or `${cvdType}:${severity}`. */
  label: string;
  description: string;
  /** Every pair in the palette. Omitted when `includePairs` is false. */
  pairs?: JndPair[];
  /**
   * The pairs falling below the threshold. When `pairs` is present these are
   * the same objects, as with any Array#filter — mutating one view mutates
   * the other.
   */
  issues: JndPair[];
  issueCount: number;
}

export interface JndReport {
  /** Issues summed across all tests, so a pair failing under two CVD
   *  simulations counts twice. */
  totalIssues: number;
  tests: JndTest[];
}

export interface JndReportOptions {
  distanceMethod?: DistanceMethod;
  distanceSpace?: ColorMode;
  cmc?: { l: number; c: number };
  /** Pairs below this distance are flagged. Defaults to 25. */
  jndThreshold?: number;
  cvdSimulations?: CvdSimulation[];
  /** Format reported colors in this space instead of hex. */
  paletteSpace?: ColorMode | null;
  /**
   * Include every pair on each test, not just the failing ones. Defaults to
   * true. The pair list is O(n^2) per test and dominates a serialized report,
   * so set false when you only need the issues.
   */
  includePairs?: boolean;
}

/** Audits a palette for pairs too close to tell apart. Needs two or more colors. */
export function reportJndIssues(
  palette: ColorInput[],
  options?: JndReportOptions
): JndReport;
