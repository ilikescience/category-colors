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
        };
        METRICS.set(key, metric);
    }
    return metric;
};

// A distance is stored on the newer of the two colors' memos, keyed by the
// older one's id, so a rejected candidate takes its distances with it and a
// surviving color only holds entries for the few colors it was compared
// against. An edited color gets a new memo and id, so nothing computed from
// its old value is reused. The two directions are kept apart because culori's
// CIEDE2000 is not symmetric to the last bit, and merging them changes seeded
// output.
const distanceBetween = (colorA, colorB, memoA, memoB, metric) => {
    const { diff, space, slot } = metric;
    if (!memoA || !memoB) {
        return diff(convertMemoized(colorA, memoA, space), convertMemoized(colorB, memoB, space));
    }
    const aIsNewer = memoA.id > memoB.id;
    const newer = aIsNewer ? memoA : memoB;
    const olderId = aIsNewer ? memoB.id : memoA.id;
    const byDirection = ((newer.distances ??= [])[slot] ??= [null, null]);
    const distances = (byDirection[aIsNewer ? 0 : 1] ??= new Map());
    let distance = distances.get(olderId);
    if (distance === undefined) {
        distance = diff(convertMemoized(colorA, memoA, space), convertMemoized(colorB, memoB, space));
        distances.set(olderId, distance);
    }
    return distance;
};

const deltaE = (colorA, colorB, options = {}) =>
    distanceBetween(colorA, colorB, memoFor(colorA), memoFor(colorB), metricFor(options));

// Each annealing step scores a palette that differs from a recently scored
// one in a single color, and scores it once per evaluator and CVD condition.
// The last few palettes measured against themselves are kept, identified by
// their memos, with their distance matrix and the per-pair terms evaluators
// derived from it. A new palette copies the entry of the one it shares the
// most colors with and fills in only the rows and columns of the colors that
// differ. A value is stored as colors[i] against colors[j], so a copied value
// is the one the pair would compute again.
const PALETTE_CACHE_SIZE = 12;

// Every index, as the list of ones still to fill.
const ALL = null;

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

const clearRowAndColumn = (matrix, n, i) => {
    matrix.fill(NaN, i * n, i * n + n);
    for (let j = 0; j < n; j++) matrix[j * n + i] = NaN;
};

// `memos` is kept as passed and must not be reused by the caller.
const entryFor = (metric, memos) => {
    const cache = (metric.palettes ??= []);
    const n = memos.length;
    let best = null;
    let bestShared = 0;
    for (let k = 0; k < cache.length; k++) {
        const entry = cache[k];
        const theirs = entry.memos;
        // Palettes from another CVD condition share no color at all, and a
        // palette worth copying from shares all but one or two, so two
        // mismatches at the front rule an entry out.
        if (theirs.length !== n || (theirs[0] !== memos[0] && theirs[1] !== memos[1])) continue;
        let shared = 0;
        for (let i = 0; i < n; i++) {
            if (theirs[i] === memos[i]) shared++;
        }
        if (shared === n) {
            if (k !== 0) {
                cache.copyWithin(1, 0, k);
                cache[0] = entry;
            }
            return entry;
        }
        if (shared > bestShared) {
            bestShared = shared;
            best = entry;
            // One color apart is as close as another palette gets.
            if (shared === n - 1) break;
        }
    }
    if (best) {
        // The palette copied from is the one being varied, so it stays
        // ahead of the rejected variations that would otherwise age it out.
        const k = cache.indexOf(best);
        cache.copyWithin(1, 0, k);
        cache[0] = best;
    }
    if (cache.length === PALETTE_CACHE_SIZE) {
        const evicted = cache.pop();
        POOL.push(evicted.distances);
        for (let t = 0; t < evicted.terms.length; t++) POOL.push(evicted.terms[t].matrix);
        if (POOL.length > 4 * PALETTE_CACHE_SIZE) POOL.length = 4 * PALETTE_CACHE_SIZE;
    }
    const entry = { memos, distances: null, both: false, stale: ALL, terms: [] };
    if (best) {
        const stale = [];
        for (let i = 0; i < n; i++) {
            if (best.memos[i] !== memos[i]) stale.push(i);
        }
        entry.distances = inherit(best.distances, n, stale);
        entry.both = best.both;
        entry.stale = stale;
        for (let t = 0; t < best.terms.length; t++) {
            const { term, parameter, both, matrix } = best.terms[t];
            entry.terms.push({ term, parameter, both, matrix: inherit(matrix, n, stale) });
        }
    } else {
        entry.distances = takeMatrix(n).fill(NaN);
    }
    cache.unshift(entry);
    return entry;
};

const inherit = (matrix, n, stale) => {
    const copy = takeMatrix(n);
    copy.set(matrix);
    for (let s = 0; s < stale.length; s++) clearRowAndColumn(copy, n, stale[s]);
    return copy;
};

// Fills the NaN entries in the rows and columns of `indices` (every row when
// ALL) of a matrix: the pairs i < j, and the pairs i > j when `both`.
const fillFrom = (matrix, n, indices, both, compute) => {
    const count = indices === ALL ? n : indices.length;
    for (let s = 0; s < count; s++) {
        const i = indices === ALL ? s : indices[s];
        for (let j = i + 1; j < n; j++) {
            if (matrix[i * n + j] !== matrix[i * n + j]) matrix[i * n + j] = compute(i, j);
        }
        for (let j = 0; j < i; j++) {
            if (matrix[j * n + i] !== matrix[j * n + i]) matrix[j * n + i] = compute(j, i);
        }
        if (both) {
            for (let j = 0; j < i; j++) {
                if (matrix[i * n + j] !== matrix[i * n + j]) matrix[i * n + j] = compute(i, j);
            }
            for (let j = i + 1; j < n; j++) {
                if (matrix[j * n + i] !== matrix[j * n + i]) matrix[j * n + i] = compute(j, i);
            }
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
 * An n×n Float64Array holding `term(deltaE, parameter)` for each pair of
 * `colors`, at index i * n + j, for the pairs with i < j, or every pair with
 * i ≠ j when `both` is set. A null `term` gives the distances themselves.
 * The diagonal is NaN. The matrix is cached, and a palette one color away
 * from a cached one recomputes only that color's row and column, so `term`
 * must be pure, and is cached by identity: define it once at module level.
 * The returned array is only valid until the next call.
 */
const pairwiseTerms = (colors, options, term, parameter, both = false) => {
    const metric = metricFor(options);
    const memos = colors.map(memoFor);
    const n = colors.length;
    // Straight from the converted coordinates: the entry keeps the result,
    // so the per-memo store distanceBetween maintains would only be written.
    const { diff, space } = metric;
    const measure = (i, j) =>
        diff(convertMemoized(colors[i], memos[i], space), convertMemoized(colors[j], memos[j], space));

    if (!memos.every(Boolean)) {
        const distances = new Float64Array(n * n).fill(NaN);
        fillFrom(distances, n, ALL, both, measure);
        if (!term) return distances;
        const terms = new Float64Array(n * n).fill(NaN);
        fillFrom(terms, n, ALL, both, (i, j) => term(distances[i * n + j], parameter));
        return terms;
    }

    // Once a matrix has been asked for both directions it is kept complete
    // both ways, by every later fill and by the palettes that inherit it, so
    // a copied matrix never has a hole outside the rows marked stale.
    const entry = entryFor(metric, memos);
    const { distances } = entry;
    if (both && !entry.both) {
        fillFrom(distances, n, ALL, true, measure);
        entry.both = true;
    } else {
        fillFrom(distances, n, entry.stale, entry.both, measure);
    }
    if (!term) return distances;

    const derive = (i, j) => term(distances[i * n + j], parameter);
    let record = null;
    for (let t = 0; t < entry.terms.length; t++) {
        const candidate = entry.terms[t];
        if (candidate.term === term && candidate.parameter === parameter) {
            record = candidate;
            break;
        }
    }
    if (!record) {
        record = { term, parameter, both, matrix: takeMatrix(n).fill(NaN) };
        entry.terms.push(record);
        fillFrom(record.matrix, n, ALL, both, derive);
    } else if (both && !record.both) {
        fillFrom(record.matrix, n, ALL, true, derive);
        record.both = true;
    } else {
        fillFrom(record.matrix, n, entry.stale, record.both, derive);
    }
    return record.matrix;
};

export { deltaE, pairwiseDeltaE, pairwiseTerms, metricFor };
