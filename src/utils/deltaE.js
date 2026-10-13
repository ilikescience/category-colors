import { differenceCiede2000, differenceCie76, differenceCie94, differenceCmc, differenceEuclidean, } from 'culori';
import { convertMemoized, memoFor } from './colorMemo.js';

const normalizeMethod = (method = 'ciede2000') => {
    if (method === 'ciede2000') {
        return method; // the default, and asked for on every evaluation
    }
    const value = method.toLowerCase();
    switch (value) {
        case '2000':
            return 'ciede2000';
        case '76':
        case 'cie76':
            return 'cie76';
        case '94':
        case 'cie94':
            return 'cie94';
        case 'cmc':
            return 'cmc';
        case 'euclidean':
            return 'euclidean';
        case 'ciede2000':
            return 'ciede2000';
        default:
            return value;
    }
};

const createDifferenceFunction = (method, space, options) => {
    switch (method) {
        case 'ciede2000':
            return differenceCiede2000();
        case 'cie76':
            return differenceCie76();
        case 'cie94':
            return differenceCie94();
        case 'cmc':
            return differenceCmc(options.cmc);
        case 'euclidean':
            return differenceEuclidean(space);
        default:
            throw new Error(`Unsupported deltaE method: ${method}`);
    }
};

// One record per metric: its culori function, the space that function
// converts its inputs into, and a slot for its cached distances. Handing the
// function colors already in that space makes culori's converter return them
// untouched, so distances come from exactly the same coordinates; only the
// conversion is skipped. Only the options a method reads go into its key, so
// the common case builds no string.
const METRICS = new Map();

const metricFor = (options = {}) => {
    const method = normalizeMethod(options.method);
    const space = method === 'euclidean' ? options.space || 'lab65' : 'lab65';
    const key =
        method === 'euclidean'
            ? `euclidean|${space}`
            : method === 'cmc'
              ? `cmc|${options.cmc ? JSON.stringify(options.cmc) : ''}`
              : method;
    let metric = METRICS.get(key);
    if (!metric) {
        metric = {
            diff: createDifferenceFunction(method, space, options),
            space,
            slot: METRICS.size,
            maxDistance: undefined,
            palettes: [],
        };
        METRICS.set(key, metric);
    }
    return metric;
};

// A distance is stored on the newer of the two colors' memos, keyed by the
// older one's id, so a rejected candidate takes its distances with it and a
// surviving color only holds entries for the few colors it was compared
// against. An edited color gets a new memo and id, so nothing computed from
// its old value is reused. culori's CIEDE2000 differs between the two orders
// of a pair only in its last bits, so a pair is stored once.
const measure = (colorA, colorB, memoA, memoB, { diff, space }) =>
    diff(convertMemoized(colorA, memoA, space), convertMemoized(colorB, memoB, space));

const distanceBetween = (colorA, colorB, memoA, memoB, metric) => {
    if (!memoA || !memoB) {
        return measure(colorA, colorB, memoA, memoB, metric);
    }
    const aIsNewer = memoA.id > memoB.id;
    const newer = aIsNewer ? memoA : memoB;
    const olderId = aIsNewer ? memoB.id : memoA.id;
    const distances = ((newer.distances ??= [])[metric.slot] ??= new Map());
    let distance = distances.get(olderId);
    if (distance === undefined) {
        distance = measure(colorA, colorB, memoA, memoB, metric);
        distances.set(olderId, distance);
    }
    return distance;
};

const deltaE = (colorA, colorB, options = {}) =>
    distanceBetween(colorA, colorB, memoFor(colorA), memoFor(colorB), metricFor(options));

// Each annealing step scores a palette that differs from a recently scored
// one in a single color, and scores it once per evaluator and CVD condition.
// The last few palettes measured against themselves keep their distance
// matrix, identified by their memos. A new palette copies the matrix of the
// one it shares the most colors with and fills in only the rows and columns
// of the colors that differ.
const PALETTE_CACHE_SIZE = 12;

// [0, 1, ..., n - 1], one shared array per size: the stale list of a palette
// that inherited nothing.
const RANGES = [];
const rangeOf = (n) => (RANGES[n] ??= Array.from({ length: n }, (_, i) => i));

// Matrices from evicted entries, reused at the same palette size so a run
// allocates none after its first few steps.
const POOL = [];

const takeMatrix = (n) => {
    for (let k = POOL.length - 1; k >= 0; k--) {
        if (POOL[k].length === n * n) {
            const matrix = POOL[k];
            POOL[k] = POOL[POOL.length - 1];
            POOL.pop();
            return matrix;
        }
    }
    return new Float64Array(n * n);
};

const moveToFront = (cache, k) => {
    const entry = cache[k];
    cache.copyWithin(1, 0, k);
    cache[0] = entry;
};

// `memos` is kept as passed and must not be reused by the caller.
const entryFor = (metric, memos) => {
    const cache = metric.palettes;
    const n = memos.length;
    let best = -1;
    let bestShared = 0;
    for (let k = 0; k < cache.length; k++) {
        const theirs = cache[k].memos;
        // A palette worth copying from is the one being varied one color at
        // a time, so it differs in at most one or two places; two mismatches
        // at the front rule an entry out without counting.
        if (theirs.length !== n || (theirs[0] !== memos[0] && theirs[1] !== memos[1])) continue;
        let shared = 0;
        for (let i = 0; i < n; i++) {
            if (theirs[i] === memos[i]) shared++;
        }
        if (shared === n) {
            moveToFront(cache, k);
            return cache[0];
        }
        if (shared > bestShared) {
            bestShared = shared;
            best = k;
            if (shared === n - 1) break;
        }
    }
    const entry = { memos, matrix: null, stale: rangeOf(n) };
    if (best >= 0) {
        // The palette copied from is the one being varied, so it stays
        // ahead of the rejected variations that would otherwise age it out.
        moveToFront(cache, best);
        const parent = cache[0];
        const stale = [];
        for (let i = 0; i < n; i++) {
            if (parent.memos[i] !== memos[i]) stale.push(i);
        }
        entry.matrix = takeMatrix(n);
        entry.matrix.set(parent.matrix);
        for (let s = 0; s < stale.length; s++) {
            const i = stale[s];
            entry.matrix.fill(NaN, i * n, i * n + n);
            for (let j = 0; j < n; j++) entry.matrix[j * n + i] = NaN;
        }
        entry.stale = stale;
    } else {
        entry.matrix = takeMatrix(n).fill(NaN);
    }
    if (cache.length === PALETTE_CACHE_SIZE) {
        POOL.push(cache.pop().matrix);
        if (POOL.length > 4 * PALETTE_CACHE_SIZE) POOL.length = 4 * PALETTE_CACHE_SIZE;
    }
    cache.unshift(entry);
    return entry;
};

// Fills the NaN entries above the diagonal in the rows and columns of
// `indices`.
const fillFrom = (matrix, n, indices, compute) => {
    for (let s = 0; s < indices.length; s++) {
        const i = indices[s];
        for (let j = 0; j < n; j++) {
            if (j === i) continue;
            const lo = i < j ? i : j;
            const hi = i < j ? j : i;
            if (matrix[lo * n + hi] !== matrix[lo * n + hi]) matrix[lo * n + hi] = compute(lo, hi);
        }
    }
};

/**
 * deltaE from each of `rows` to each of `cols`, by index, for callers that
 * measure many pairs. The metric and each color's memo are resolved once here
 * rather than once per pair, which is most of the cost of a cached distance.
 * Neither list may be edited while the returned function is in use.
 */
const pairwiseDeltaE = (rows, cols, options = {}) => {
    const metric = metricFor(options);
    const rowMemos = rows.map(memoFor);
    const colMemos = cols === rows ? rowMemos : cols.map(memoFor);
    return (i, j) => distanceBetween(rows[i], cols[j], rowMemos[i], colMemos[j], metric);
};

/**
 * An n×n Float64Array of the deltaE between each pair of `colors`, at index
 * i * n + j for i < j; the rest is NaN. The matrix is cached, and a palette
 * one color away from a cached one recomputes only that color's row and
 * column. The returned array is only valid until the next call. A pair whose
 * distance is itself NaN is recomputed on every call, which is correct, only
 * slower.
 */
const pairwiseDistances = (colors, options) => {
    const metric = metricFor(options);
    const memos = colors.map(memoFor);
    const n = colors.length;
    const compute = (i, j) => measure(colors[i], colors[j], memos[i], memos[j], metric);
    const entry = memos.every(Boolean)
        ? entryFor(metric, memos)
        : { matrix: new Float64Array(n * n).fill(NaN), stale: rangeOf(n) };
    fillFrom(entry.matrix, n, entry.stale, compute);
    return entry.matrix;
};

export { deltaE, pairwiseDeltaE, pairwiseDistances, metricFor };
