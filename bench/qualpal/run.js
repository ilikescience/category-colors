// Headless runner for QualPal (Larsson), so its palettes can be scored by
// bench/metrics.js alongside everything else.
//
//   node bench/qualpal/run.js --colors 8
//   node bench/qualpal/run.js --colors 8 --no-cvd
//
// QualPal is a C++ library with a Python package on PyPI. It is installed into
// a virtualenv under .cache/ on first use rather than vendored, and pinned to
// one version because the option plumbing has changed between releases (see
// readme.md). Unlike the other generators here it takes no seed and is fully
// deterministic: one configuration yields one palette, not a distribution.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultConfig } from '../../src/index.js';

const VERSION = '1.1.0';
const CACHE = new URL('.cache/', import.meta.url);
const VENV = new URL('venv/', CACHE);
const PYTHON = fileURLToPath(new URL('bin/python', VENV));
const SCRIPT = fileURLToPath(new URL('generate.py', import.meta.url));

// The Python package's actual default: the whole HSL cube. Taken from the
// installed source (qualpal/qualpal.py, the `colorspace is None` branch of
// __init__), not from documentation — the R package documents a different
// default, and an earlier version of this file benchmarked a narrow pastel box
// from those docs as though it were the tool's default. That understated
// QualPal badly, which is the one direction a comparison must never err in.
export const QUALPAL_DEFAULT_BOX = { h: [0, 360], c: [0, 1], l: [0, 1] };

// A box matched to this library's own working range, so a comparison is not
// silently a comparison of search spaces. It is only an approximate match:
// QualPal samples HSL and this library samples okhsl, so equal numbers do not
// describe equal regions. Matching the extent is the closest fair thing
// available without reimplementing one tool inside the other's space. Not
// exported: it is the control behind --matched-box, not part of the runner's
// interface, and bench/run.js deliberately reports QualPal's own box.
const matchedBox = () => {
    const [h, s, l] = createDefaultConfig().colorSpace.ranges;
    return { h: [...h], c: [...s], l: [...l] };
};

// Full dichromacy on all three, matching the conditions this library's default
// config optimizes. QualPal has no grayscale or luminance term, so print is the
// one condition it cannot be asked to protect.
export const ALL_CVD = { protan: 1, deutan: 1, tritan: 1 };

const ensureInstalled = () => {
    if (fs.existsSync(PYTHON)) return;
    fs.mkdirSync(CACHE, { recursive: true });
    const venv = spawnSync('python3', ['-m', 'venv', fileURLToPath(VENV)], { stdio: 'inherit' });
    if (venv.status !== 0) {
        throw new Error('Could not create a virtualenv for qualpal; is python3 installed?');
    }
    const pip = spawnSync(PYTHON, ['-m', 'pip', 'install', '--quiet', `qualpal==${VERSION}`], {
        stdio: 'inherit',
    });
    if (pip.status !== 0) {
        throw new Error(`Could not install qualpal==${VERSION} from PyPI.`);
    }
};

/**
 * One QualPal palette. Deterministic: the same arguments always return the
 * same colors, so there is nothing to average over.
 */
export const generateQualpal = ({
    colorCount,
    cvd = ALL_CVD,
    colorspace = QUALPAL_DEFAULT_BOX,
    metric = 'ciede2000',
} = {}) => {
    ensureInstalled();
    const request = JSON.stringify({ n: colorCount, ...colorspace, cvd, metric });
    const result = spawnSync(PYTHON, [SCRIPT], { input: request, encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`qualpal failed: ${(result.stderr || '').trim() || result.status}`);
    }
    return JSON.parse(result.stdout);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    // Same shape as bench/palettailor/run.js: a bad flag is a one-line message
    // and exit 1, not a stack trace.
    try {
        const argv = process.argv.slice(2);
        const at = (flag) => argv.indexOf(flag);
        const rawColors = at('--colors') >= 0 ? argv[at('--colors') + 1] : '8';
        const colorCount = Number(rawColors);
        if (!Number.isInteger(colorCount) || colorCount < 2) {
            throw new Error(`--colors needs an integer >= 2; received "${rawColors}".`);
        }
        // Box and CVD vary independently. They were once coupled to one flag,
        // which made the two reported configurations differ in two variables at
        // once and credited the search box's effect to CVD.
        const colors = generateQualpal({
            colorCount,
            cvd: at('--no-cvd') >= 0 ? null : ALL_CVD,
            colorspace: at('--matched-box') >= 0 ? matchedBox() : QUALPAL_DEFAULT_BOX,
        });
        process.stdout.write(`${JSON.stringify(colors)}\n`);
    } catch (error) {
        console.error(`qualpal: ${error.message}`);
        process.exitCode = 1;
    }
}
