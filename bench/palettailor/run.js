// Headless runner for Palettailor (Lu et al. 2021), so its palettes can be
// scored by bench/metrics.js alongside everything else.
//
//   node bench/palettailor/run.js --colors 8 --trials 3 --seed 1
//
// Palettailor is a browser script with no module system: it expects d3 v4 and
// a CIEDE2000 helper as globals, fetches the Heer & Stone colour-name data with
// a synchronous XMLHttpRequest at load time, and calls alert() on failure. The
// three scripts are evaluated in one node:vm context with just enough of that
// environment shimmed. Its repository has no licence, so nothing is vendored:
// the files are downloaded from the pinned commit into .cache/ when missing.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { mulberry32 } from '../seed.js';

const COMMIT = 'e18e334eef53f69efe9c591468c6bb5e1561524f';
const BASE = `https://raw.githubusercontent.com/IAMkecheng/palettailor-library/${COMMIT}/`;
const SCRIPTS = ['d3.v4.min.js', 'd3.color.min.js', 'palettailor.js'];
const DATA = 'c3_data.json';
const CACHE = new URL('.cache/', import.meta.url);

// Palettailor weights class pairs by how often their points are Voronoi
// neighbours closer than ~35px. Points are spread uniformly over a 400×400
// area and labelled round-robin, so every class borders every other and no
// pair is privileged; 50 points per class keeps that true as the count grows.
const AREA = 400;
const POINTS_PER_CLASS = 50;

const ensureCached = async () => {
    fs.mkdirSync(CACHE, { recursive: true });
    for (const name of [...SCRIPTS, DATA]) {
        const target = new URL(name, CACHE);
        if (fs.existsSync(target)) continue;
        const response = await fetch(BASE + name);
        if (!response.ok) {
            throw new Error(`Failed to download ${name}: HTTP ${response.status}`);
        }
        fs.writeFileSync(target, await response.text());
    }
};

let context;

const loadContext = async () => {
    if (context) return context;
    await ensureCached();

    const sandbox = {
        console,
        alert: (message) => {
            throw new Error(`Palettailor called alert(): ${message}`);
        },
        // c3.load does a synchronous GET of ./c3_data.json at script load.
        XMLHttpRequest: class {
            open() {}
            send() {
                this.readyState = 4;
                this.status = 200;
                this.responseText = fs.readFileSync(new URL(DATA, CACHE), 'utf8');
            }
        },
    };
    context = vm.createContext(sandbox);
    for (const name of SCRIPTS) {
        const source = fs.readFileSync(new URL(name, CACHE), 'utf8');
        vm.runInContext(source, context, { filename: name });
    }
    return context;
};

// The vm context has its own Math object, so seeding the host's Math.random
// would leave Palettailor's calls untouched.
const seedContext = (ctx, random) => {
    vm.runInContext('Math', ctx).random = random;
};

const syntheticData = (colorCount, random) =>
    Array.from({ length: POINTS_PER_CLASS * colorCount }, (_, i) => ({
        x: random() * AREA,
        y: random() * AREA,
        label: i % colorCount,
    }));

// The palette comes back as d3 rgb objects. Channels can be fractional, and
// the min-ΔE repair loop writes hcl→rgb results without clamping, so a colour
// can sit slightly outside sRGB; clamp on the way to hex.
const toHex = ({ r, g, b }) =>
    '#' +
    [r, g, b]
        .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
        .join('');

/**
 * Runs Palettailor once and returns its palette as hex strings, indexed by
 * class. The same seed reproduces the same palette.
 */
export const generatePalettailor = async ({
    colorCount,
    seed,
    weights = [1, 1, 1],
    background = '#ffffff',
}) => {
    const ctx = await loadContext();
    const random = mulberry32(seed);
    const data = syntheticData(colorCount, random);
    seedContext(ctx, random);
    const calc = vm.runInContext(
        '(data, weights, size, bg) => new Palettailor(data, weights, size, size, bg).calc()',
        ctx
    );
    const palette = calc(data, weights, AREA, background);
    return Array.from({ length: colorCount }, (_, i) => toHex(palette[i]));
};

// ── CLI ─────────────────────────────────────────────────────────────────────

const parseArgs = (argv) => {
    const options = { colors: 8, trials: 1, seed: 1 };
    for (let i = 0; i < argv.length; i += 1) {
        const value = Number(argv[i + 1]);
        if (!Number.isInteger(value)) throw new Error(`${argv[i]} needs an integer value.`);
        if (argv[i] === '--colors') options.colors = value;
        else if (argv[i] === '--trials') options.trials = value;
        else if (argv[i] === '--seed') options.seed = value;
        else throw new Error(`Unknown option: ${argv[i]}`);
        i += 1;
    }
    return options;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const { colors, trials, seed } = parseArgs(process.argv.slice(2));
        const palettes = [];
        for (let i = 0; i < trials; i += 1) {
            const start = performance.now();
            palettes.push(await generatePalettailor({ colorCount: colors, seed: seed + i }));
            console.error(`seed ${seed + i}: ${(performance.now() - start).toFixed(0)} ms`);
        }
        console.log(JSON.stringify(palettes));
    } catch (error) {
        console.error(`palettailor: ${error.message}`);
        process.exitCode = 1;
    }
}
