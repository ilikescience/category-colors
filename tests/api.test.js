import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';

import * as api from '../src/index.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('public entry point exposes the documented flat API', () => {
    for (const name of [
        'prepareInitialState',
        'runSimulatedAnnealing',
        'runWithOrderOptimization',
        'cost',
        'costBreakdown',
        'simulateCvd',
        'createDefaultConfig',
        'createDefaultState',
        'deltaE',
        'createColor',
        'getChannels',
        'reportJndIssues',
    ]) {
        assert.equal(typeof api[name], 'function', `${name} should be exported as a function`);
    }

    assert.equal(typeof api.evaluators, 'object', 'evaluators object should be exported');
    assert.equal(typeof api.palettes, 'object', 'palettes object should be exported');
});

test('evaluators object holds every evaluator', () => {
    assert.deepEqual(
        Object.keys(api.evaluators).sort(),
        ['avoid', 'contrast', 'energy', 'jnd', 'range', 'saliency', 'similarity']
    );
    for (const [name, evaluator] of Object.entries(api.evaluators)) {
        assert.equal(typeof evaluator, 'function', `${name} should be a function`);
    }
});

// package.json declares which modules a bundler may NOT drop. If a module grows
// a top-level side effect and is missing from that list, tree-shaking silently
// removes it — paletteColor.js registers every culori mode this way, and losing
// it breaks color parsing rather than erroring.
test('sideEffects lists exactly the modules with top-level effects', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const declared = new Set(pkg.sideEffects.map((p) => p.replace(/^\.\//, '')));

    // A side effect at module scope shows up as a statement starting in column
    // zero that invokes something — an IIFE `(() => {...})()` or a bare
    // `register(...)` call — rather than declaring, importing, or exporting.
    const TOP_LEVEL_CALL = /^(?:\(|[A-Za-z_$][\w$.]*\()/;

    const { files } = walkImports(path.join(projectRoot, 'src/index.js'));
    const observed = new Set();
    for (const file of files) {
        const hasEffect = fs
            .readFileSync(file, 'utf8')
            .split('\n')
            .some((line) => TOP_LEVEL_CALL.test(line));
        if (hasEffect) {
            observed.add(path.relative(projectRoot, file));
        }
    }

    assert.deepEqual(
        [...observed].sort(),
        [...declared].sort(),
        'package.json sideEffects is out of sync with the modules that have them'
    );
});

test('saliency is reachable from its own subpath', async () => {
    const mod = await import('../src/evaluators/saliency/saliency.js');
    assert.equal(typeof mod.default, 'function');
    const value = mod.default({ colors: [api.createColor('#ff0000')] });
    assert.ok(Number.isFinite(value) && value >= 0, 'saliency should score a real color');
});

test('every exports subpath resolves to a file that exists', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    for (const [subpath, entry] of Object.entries(pkg.exports)) {
        const targets = typeof entry === 'string' ? [entry] : Object.values(entry);
        for (const target of targets) {
            assert.ok(
                fs.existsSync(path.join(projectRoot, target)),
                `exports["${subpath}"] points at missing file ${target}`
            );
        }
    }
});

// Matches every specifier form the source uses: `from '...'` / `from "..."`,
// bare `import '...'`, and dynamic `import('...')`. Anchoring on the quote
// rather than on `from` alone matters — a missed relative import would prune
// that whole subtree from the walk and quietly shrink the audit.
const SPECIFIER = /(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g;

const NODE_BUILTINS = new Set([
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`),
]);

const walkImports = (entry) => {
    const seen = new Set();
    const edges = [];

    const visit = (file) => {
        if (seen.has(file)) return;
        seen.add(file);
        const source = fs.readFileSync(file, 'utf8');
        for (const [, spec] of source.matchAll(SPECIFIER)) {
            edges.push({ file, spec });
            if (spec.startsWith('.')) {
                visit(path.resolve(path.dirname(file), spec));
            }
        }
    };

    visit(entry);
    return { files: seen, edges };
};

// The app and any other browser consumer import the main entry directly, so
// nothing reachable from it may touch a Node builtin. The CLI helpers that do
// are only reachable through the 'category-colors/cli' subpath.
test('main entry graph is browser-safe', () => {
    const { files, edges } = walkImports(path.join(projectRoot, 'src/index.js'));

    const offenders = edges
        .filter(({ spec }) => NODE_BUILTINS.has(spec))
        .map(({ file, spec }) => `${path.relative(projectRoot, file)} imports ${spec}`);

    assert.deepEqual(offenders, []);
    // Guards the guard: if the walk silently stopped resolving imports, the
    // assertion above would pass over an almost-empty graph.
    assert.ok(files.size > 15, `expected to walk the whole graph, saw ${files.size} files`);
});

// The audit is only as good as its specifier matching, so exercise the forms
// that would otherwise slip through.
test('browser-safety walk recognizes every import form', () => {
    const source = [
        "import fs from 'node:fs';",
        'import os from "node:os";',
        "import { createRequire } from 'node:module';",
        'import path from "path";',
        "import './side-effect.js';",
        'const m = await import("node:child_process");',
        "export { x } from './re-export.js';",
    ].join('\n');

    const found = [...source.matchAll(SPECIFIER)].map(([, spec]) => spec);

    assert.deepEqual(found, [
        'node:fs',
        'node:os',
        'node:module',
        'path',
        './side-effect.js',
        'node:child_process',
        './re-export.js',
    ]);
    assert.ok(NODE_BUILTINS.has('path') && NODE_BUILTINS.has('node:child_process'));
});
