// Seeded randomness. The optimizer draws from `randomFrom(config)` everywhere
// it would otherwise call Math.random, so a `config.seed` makes a run repeat
// exactly and an absent seed leaves Math.random in charge.

// mulberry32: 32-bit state, fast, and plenty for retracing a search path.
const mulberry32 = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// A fresh generator per call: each entry point (prepareInitialState, a run)
// restarts the stream from the seed, so repeating either call repeats its result.
const randomFrom = (config) => {
    const { seed } = config;
    if (seed === undefined || seed === null) {
        return Math.random;
    }
    // Rejected rather than coerced: mulberry32 truncates to 32-bit integers,
    // so 1.5 would silently reproduce seed 1.
    if (!Number.isInteger(seed)) {
        throw new Error(`config.seed must be an integer; received ${seed}.`);
    }
    return mulberry32(seed);
};

export { mulberry32, randomFrom };
