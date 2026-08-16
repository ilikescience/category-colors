import type { Config, State, StateInput, ColorInput } from '../index.js';

export interface GeneratePaletteOptions {
  /** Path to a module exporting config overrides or a factory. */
  configPath?: string;
  config?: Partial<Config>;
  /** Path to a module exporting a colors array or state overrides. */
  statePath?: string;
  state?: ColorInput[] | Partial<StateInput>;
  /** Reorder the palette after annealing. Defaults to true. */
  orderOptimization?: boolean;
  logProgress?: boolean;
}

export interface GeneratePaletteResult {
  config: Config;
  initialState: State;
  finalState: State;
}

/**
 * Builds config and state from the given options, then runs the optimizer.
 * Node only — reads config and state files from disk.
 */
export function generatePalette(
  options?: GeneratePaletteOptions
): GeneratePaletteResult;

export function buildConfig(options?: {
  configPath?: string;
  inlineConfig?: Partial<Config>;
  logProgress?: boolean;
}): Config;

export function buildState(options?: {
  statePath?: string;
  inlineState?: ColorInput[] | Partial<StateInput>;
  config?: Config;
}): StateInput;

/** Loads a config or state file, unwrapping a default export if present. */
export function resolveModule(inputPath: string): unknown;

export function toHexPalette(colors: State['colors']): string[];
export function formatTextSummary(initialState: State, finalState: State): string;
export function buildJsonSummary(
  initialState: State,
  finalState: State
): {
  palette: string[];
  cost: number;
  iterations: number;
  temperature: number;
  initial: { palette: string[]; cost: number };
  costDifference: number;
};
