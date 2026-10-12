import { converter, getMode } from 'culori';

// Values derived from a color, such as its Lab coordinates, its CVD
// simulations and its distances to other colors, are what the annealing loop
// spends its time recomputing. Each step changes one color and leaves the rest
// as the same objects, so keying derived values by object identity makes every
// unchanged color free.
//
// Identity alone would trust a color that was edited in place, so each memo
// also records the channel values it was derived from and is replaced when
// they no longer match. That check is a few comparisons, far cheaper than any
// conversion, and it keeps a stale value from ever being returned.
//
// The memo lives on the color under a non-enumerable symbol rather than in a
// WeakMap. The loop creates and discards several colors per step, and keeping
// them in a WeakMap cost about a quarter of the run in hash and GC work. A
// non-enumerable symbol is skipped by spread, Object.assign, JSON and
// structuredClone, so copies never carry it; and if one did, the value check
// would still reject it unless the values were identical, in which case the
// memo is correct for the copy too.
const MEMO = Symbol('category-colors memo');

// Creation order, so any two memos can agree which of them is newer.
let nextId = 0;

const matchesAny = (color, channels, values) => {
    for (let i = 0; i < channels.length; i++) {
        if (color[channels[i]] !== values[i]) {
            return false;
        }
    }
    return true;
};

// The loop above reads channels by computed key, which costs more than the
// rest of a cache hit combined. The layouts the working spaces use get checks
// that name their properties instead.
const LAYOUT_CHECKS = {
    'h,s,l,alpha': (c, v) => c.h === v[0] && c.s === v[1] && c.l === v[2] && c.alpha === v[3],
    'l,c,h,alpha': (c, v) => c.l === v[0] && c.c === v[1] && c.h === v[2] && c.alpha === v[3],
    'l,a,b,alpha': (c, v) => c.l === v[0] && c.a === v[1] && c.b === v[2] && c.alpha === v[3],
    'r,g,b,alpha': (c, v) => c.r === v[0] && c.g === v[1] && c.b === v[2] && c.alpha === v[3],
};

const LAYOUTS = new Map();

const layoutFor = (mode) => {
    let layout = LAYOUTS.get(mode);
    if (!layout) {
        const channels = getMode(mode)?.channels ?? [];
        layout = {
            channels,
            check:
                LAYOUT_CHECKS[channels.join(',')] ??
                ((color, values) => matchesAny(color, channels, values)),
        };
        LAYOUTS.set(mode, layout);
    }
    return layout;
};

/**
 * The memo for a color object: a plain object callers store derived values
 * on. Returns null for anything that cannot hold one (CSS strings, frozen
 * objects), which callers treat as "compute without caching".
 */
const memoFor = (color) => {
    if (color === null || typeof color !== 'object') {
        return null;
    }
    const existing = color[MEMO];
    if (existing && existing.mode === color.mode && existing.check(color, existing.values)) {
        return existing;
    }
    if (!Object.isExtensible(color)) {
        return null;
    }
    const { channels, check } = layoutFor(color.mode);
    const memo = {
        id: nextId++,
        mode: color.mode,
        check,
        values: channels.map((channel) => color[channel]),
        converted: null,
        cvd: null,
        distances: null,
    };
    Object.defineProperty(color, MEMO, { value: memo, writable: true, configurable: true });
    return memo;
};

const CONVERTERS = new Map();

const converterTo = (mode) => {
    let convert = CONVERTERS.get(mode);
    if (!convert) {
        convert = converter(mode);
        CONVERTERS.set(mode, convert);
    }
    return convert;
};

// Whether culori converts between two modes directly. When it doesn't, its
// converter goes through rgb, and doing that step here lets every target that
// needs it share one rgb conversion, which in the cylindrical spaces is the
// expensive half.
const hasDirectConversion = (from, to) =>
    Boolean(getMode(from)?.toMode?.[to] || getMode(to)?.fromMode?.[from]);

/**
 * converter(mode)(color), computed once per color value. Takes the same steps
 * culori's converter would, so the result is identical to calling it
 * directly. Without a memo the conversion simply isn't cached.
 */
const convertMemoized = (color, memo, mode) => {
    if (!memo || color.mode === mode) {
        return converterTo(mode)(color);
    }
    const converted = (memo.converted ??= {});
    let result = converted[mode];
    if (result === undefined) {
        result =
            mode === 'rgb' || hasDirectConversion(color.mode, mode)
                ? converterTo(mode)(color)
                : converterTo(mode)(convertMemoized(color, memo, 'rgb'));
        converted[mode] = result;
    }
    return result;
};

export { memoFor, convertMemoized };
