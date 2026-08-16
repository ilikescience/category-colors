import * as paletteModule from './palettes.js';

// Spread into a plain object rather than re-exporting the namespace directly:
// `import * as` yields a module namespace object, which is non-extensible with
// read-only properties, so `palettes.mine = [...]` would throw at runtime while
// typechecking fine against the declared Record type.
export const palettes = { ...paletteModule };

export default { palettes };
