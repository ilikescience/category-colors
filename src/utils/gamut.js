import * as culori from 'culori';
import { clamp } from './utils.js';

const { clampChroma, clampGamut, converter, formatHex, getMode } = culori;

// config.colorSpace.gamut names the colors a palette may use, separately from
// the mode it moves and is measured in. Names are CSS's predefined RGB spaces;
// values are the culori modes that define them. null means no limit.
const GAMUTS = {
    srgb: 'rgb',
    'display-p3': 'p3',
    rec2020: 'rec2020',
    'a98-rgb': 'a98',
    'prophoto-rgb': 'prophoto',
};

const DEFAULT_GAMUT = 'srgb';

const assertGamut = (name) => {
    if (!Object.hasOwn(GAMUTS, name)) {
        throw new Error(`Unknown gamut: ${name}. Expected ${Object.keys(GAMUTS).join(', ')} or null.`);
    }
};

// Exact gamut tests fail colors that were converted out of an RGB space and
// back, which land a hair past 0 or 1 (#009919 in oklch, for one). Output
// rounds that away, so allow it rather than clamp and warn about a color that
// was fine.
const GAMUT_EPSILON = 1e-6;
const LOW = -GAMUT_EPSILON;
const HIGH = 1 + GAMUT_EPSILON;

const inGamut = (gamutMode) => {
    const toGamut = converter(gamutMode);
    return (color) => {
        const { r, g, b } = toGamut(color);
        return r >= LOW && r <= HIGH && g >= LOW && g <= HIGH && b >= LOW && b <= HIGH;
    };
};

// The RGB space a mode's channels are bounded to, or null for a mode culori
// gives no gamut (oklch, lab…). culori marks the sRGB-derived modes (okhsl,
// hsl…) with 'rgb' and each RGB space with true; lrgb is sRGB, linearized.
const boundedTo = (mode) => {
    const own = getMode(mode)?.gamut;
    if (own === true) {
        return mode === 'lrgb' ? 'rgb' : mode;
    }
    return own || null;
};

const resolve = (mode, name) => {
    if (name === null) {
        return null;
    }
    assertGamut(name);
    const gamutMode = GAMUTS[name];
    const own = boundedTo(mode);
    // A mode bounded to its own RGB space keeps culori's check and clamp when
    // that space is the gamut asked for, so its runs reproduce earlier
    // releases.
    if (own === gamutMode) {
        return { name, mode: gamutMode, native: true, contains: culori.inGamut(mode), clamp: clampGamut(mode) };
    }
    // A wider gamut would silently do nothing: the mode's channel ranges can
    // only reach its own space.
    if (own && name !== DEFAULT_GAMUT) {
        throw new Error(
            `config.colorSpace.gamut '${name}' is wider than ${mode} can describe: ${mode} only covers ${own === 'rgb' ? 'sRGB' : own}. Use a mode such as oklch.`
        );
    }
    // Anything else, such as oklch, is held to the gamut by reducing chroma in
    // OKLCh: lightness and hue are kept exactly, so the clamp never undoes the
    // optimizer's moves in the other two channels. Clipping each RGB channel
    // would shift both.
    return {
        name,
        mode: gamutMode,
        native: false,
        contains: inGamut(gamutMode),
        clamp: (color) => clampChroma(color, 'oklch', gamutMode),
    };
};

const resolved = new WeakMap();

/**
 * The gamut a colorSpace config asks for, or null for no limit:
 * `{ name, mode, native, contains, clamp }`. Throws on an unknown name, and on
 * a gamut wider than the mode can describe. Resolved once per colorSpace, as
 * this runs on every mutation; a later change to its mode or gamut is noticed.
 */
const resolveGamut = (colorSpace = {}) => {
    const { mode } = colorSpace;
    const name = colorSpace.gamut === undefined ? DEFAULT_GAMUT : colorSpace.gamut;
    const cached = resolved.get(colorSpace);
    if (cached && cached.mode === mode && cached.name === name) {
        return cached.gamut;
    }
    const gamut = resolve(mode, name);
    resolved.set(colorSpace, { mode, name, gamut });
    return gamut;
};

const round = (value) => {
    const rounded = Number(value.toFixed(4));
    return Object.is(rounded, -0) ? 0 : rounded;
};

/**
 * A color as a CSS string that keeps it in the gamut: hex for sRGB,
 * `color(display-p3 …)` and the like for wider gamuts, and `oklch(…)` when
 * there is no limit. Hex is sRGB only, so hex for a wider gamut would clip the
 * very colors the gamut was chosen for.
 */
const formatColor = (color, gamut = DEFAULT_GAMUT) => {
    if (gamut === null) {
        const { l, c, h } = converter('oklch')(color);
        return `oklch(${round(l)} ${round(c)} ${round(h ?? 0)})`;
    }
    assertGamut(gamut);
    if (gamut === DEFAULT_GAMUT) {
        return formatHex(color);
    }
    const { r, g, b } = converter(GAMUTS[gamut])(color);
    const channel = (v) => round(clamp(v, 0, 1));
    return `color(${gamut} ${channel(r)} ${channel(g)} ${channel(b)})`;
};

const formatPalette = (colors, gamut = DEFAULT_GAMUT) => colors.map((color) => formatColor(color, gamut));

export { GAMUTS, resolveGamut, inGamut, formatColor, formatPalette };
