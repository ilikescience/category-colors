import { converter, getMode } from 'culori';

// Each annealing step changes one color and leaves the rest as the same
// objects, so whatever is derived from a color (its Lab and rgb coordinates,
// its CVD simulations, its distances to other colors) is memoized on the
// object. Each memo records the channel values it was derived from and is
// replaced when they no longer match, so a color edited in place is never
// served stale values.
//
// The memo sits under a non-enumerable symbol rather than in a WeakMap: the
// loop creates and discards several colors per step, and a WeakMap cost about
// a quarter of the run in hashing and GC. Spread, Object.assign, JSON and
// structuredClone all skip the symbol.
const MEMO = Symbol('category-colors memo');

// Creation order, so any two memos can agree which of them is newer.
let nextId = 0;

// Off, every caller takes culori's own path with nothing cached. That is the
// reference the caches must reproduce exactly, so tests compare against it.
let enabled = true;
const setMemoization = (on) => {
    enabled = on;
};

const matchesAll = (color, channels, values) => {
    for (let i = 0; i < channels.length; i++) {
        if (color[channels[i]] !== values[i]) {
            return false;
        }
    }
    return true;
};

// The loop above reads channels by computed key, which costs more than the
// rest of a cache hit combined. The layouts the working spaces use get checks
// that name their properties instead; one generated closure per layout would
// share a call site's feedback across modes and run about seven times slower.
const LAYOUT_CHECKS = {
    'h,s,l,alpha': (c, v) => c.h === v[0] && c.s === v[1] && c.l === v[2] && c.alpha === v[3],
    'l,c,h,alpha': (c, v) => c.l === v[0] && c.c === v[1] && c.h === v[2] && c.alpha === v[3],
    'l,a,b,alpha': (c, v) => c.l === v[0] && c.a === v[1] && c.b === v[2] && c.alpha === v[3],
    'r,g,b,alpha': (c, v) => c.r === v[0] && c.g === v[1] && c.b === v[2] && c.alpha === v[3],
};

const LAYOUTS = new Map();

// Null for a missing or unregistered mode: with no channels to compare, a
// memo could never notice an edit. culori also reads a mode-less object as
// being in whatever space it is converted to, which a memo can't express.
const layoutFor = (mode) => {
    let layout = LAYOUTS.get(mode);
    if (layout === undefined) {
        const channels = getMode(mode)?.channels;
        layout = channels
            ? {
                  channels,
                  check:
                      LAYOUT_CHECKS[channels.join(',')] ??
                      ((color, values) => matchesAll(color, channels, values)),
              }
            : null;
        LAYOUTS.set(mode, layout);
    }
    return layout;
};

/**
 * The memo for a color object: a plain object callers store derived values
 * on. Returns null for anything that cannot hold one (CSS strings, frozen
 * objects, unknown modes, NaN channels, which never compare equal to
 * themselves), and callers then compute without caching.
 */
const memoFor = (color) => {
    if (!enabled || color === null || typeof color !== 'object') {
        return null;
    }
    const existing = color[MEMO];
    if (existing && existing.mode === color.mode && existing.check(color, existing.values)) {
        return existing;
    }
    const layout = layoutFor(color.mode);
    if (!layout || !Object.isExtensible(color)) {
        return null;
    }
    const values = layout.channels.map((channel) => color[channel]);
    if (values.some(Number.isNaN)) {
        return null;
    }
    const memo = {
        id: nextId++,
        mode: color.mode,
        check: layout.check,
        values,
        lab65: undefined,
        rgb: undefined,
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
    // The two targets every run needs get their own fields; a lookup by
    // computed key costs several times a named one.
    if (mode === 'lab65') {
        return (memo.lab65 ??= convertVia(color, memo, mode));
    }
    if (mode === 'rgb') {
        return (memo.rgb ??= converterTo(mode)(color));
    }
    const converted = (memo.converted ??= {});
    return (converted[mode] ??= convertVia(color, memo, mode));
};

// The steps culori's converter takes: directly, or through rgb.
const convertVia = (color, memo, mode) =>
    hasDirectConversion(color.mode, mode)
        ? converterTo(mode)(color)
        : converterTo(mode)(convertMemoized(color, memo, 'rgb'));

export { memoFor, convertMemoized, converterTo, setMemoization };
