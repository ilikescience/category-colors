// Seeded randomness shared by the benchmark runners. Copied from bench/run.js
// so the third-party runners can seed their own contexts without importing
// the harness.

// mulberry32: small, fast, and good enough for reproducing a search path.
export const mulberry32 = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const withSeed = (seed, fn) => {
    const original = Math.random;
    Math.random = mulberry32(seed);
    try {
        return fn();
    } finally {
        Math.random = original;
    }
};
