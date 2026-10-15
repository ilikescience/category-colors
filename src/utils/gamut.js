import * as culori from 'culori';

const { clampChroma, converter, formatHex, getMode } = culori;

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

/**
 * The gamut a colorSpace config asks for, as `{ name, mode }`, or null for no
 * limit. Throws on an unknown name, and on a gamut wider than sRGB for a mode
 * that can only describe sRGB colors (rgb, okhsl, hsl, hsv…), where it would
 * silently do nothing.
 */
const resolveGamut = (colorSpace = {}) => {
    const name = colorSpace.gamut === undefined ? DEFAULT_GAMUT : colorSpace.gamut;
    if (name === null) {
        return null;
    }
    if (!Object.hasOwn(GAMUTS, name)) {
        throw new Error(
            `config.colorSpace.gamut must be one of ${Object.keys(GAMUTS).join(', ')} or null; received ${name}.`
        );
    }
    // culori marks the sRGB-derived modes with gamut 'rgb' and rgb itself with true.
    const modeGamut = getMode(colorSpace.mode)?.gamut;
    if (name !== DEFAULT_GAMUT && (modeGamut === 'rgb' || (modeGamut === true && colorSpace.mode === 'rgb'))) {
        throw new Error(
            `config.colorSpace.gamut '${name}' is wider than ${colorSpace.mode} can describe: ${colorSpace.mode} only covers sRGB. Use a mode such as oklch.`
        );
    }
    return { name, mode: GAMUTS[name] };
};

// Exact gamut tests fail colors that were converted out of an RGB space and
// back, which land a hair past 0 or 1 (#009919 in oklch, for one). Output
// rounds that away, so allow it rather than clamp and warn about a color that
// was fine.
const GAMUT_EPSILON = 1e-6;

const inGamut = (gamutMode) => {
    const toGamut = converter(gamutMode);
    return (color) => {
        const { r, g, b } = toGamut(color);
        return [r, g, b].every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);
    };
};

// Chroma reduction in OKLCh: lightness and hue are kept exactly and only
// chroma gives way, so the clamp never undoes the optimizer's moves in the
// other two channels. Clipping each RGB channel would shift both.
const clampToGamut = (gamutMode) => (color) => clampChroma(color, 'oklch', gamutMode);

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
    const resolved = gamut !== null && Object.hasOwn(GAMUTS, gamut) ? GAMUTS[gamut] : null;
    if (resolved === 'rgb') {
        return formatHex(color);
    }
    if (resolved) {
        const { r, g, b } = converter(resolved)(color);
        const channel = (v) => round(Math.min(1, Math.max(0, v)));
        return `color(${gamut} ${channel(r)} ${channel(g)} ${channel(b)})`;
    }
    if (gamut !== null) {
        throw new Error(`Unknown gamut: ${gamut}.`);
    }
    const { l, c, h } = converter('oklch')(color);
    return `oklch(${round(l)} ${round(c)} ${round(h ?? 0)})`;
};

const formatPalette = (colors, gamut = DEFAULT_GAMUT) => colors.map((color) => formatColor(color, gamut));

export { GAMUTS, DEFAULT_GAMUT, resolveGamut, inGamut, clampToGamut, formatColor, formatPalette };
