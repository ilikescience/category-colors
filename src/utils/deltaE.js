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

export { deltaE, pairwiseDeltaE, metricFor };
