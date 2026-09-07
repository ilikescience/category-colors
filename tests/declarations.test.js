import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDefaultConfig } from '../src/config/defaultConfig.js';

const projectRoot = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const read = (p) => fs.readFileSync(path.join(projectRoot, p), 'utf8');

// 2.0.0 shipped a `grayscale` simulation and a default config that used it,
// while index.d.ts still listed only the six deficiencies. Runtime was fine and
// every TypeScript consumer got TS2322. These tests read the declarations as
// text, so they cost no toolchain, and they only have to catch drift.
const unionMembers = (source, name) => {
    const declaration = new RegExp(`export type ${name}\\s*=([^;]+);`).exec(source);
    assert.ok(declaration, `${name} should be declared`);
    return new Set([...declaration[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
};

test('every simulation the runtime switches on is declared', () => {
    const source = read('src/core/simulateCvd.js');
    const cases = new Set([...source.matchAll(/case '([^']+)':/g)].map((m) => m[1]));
    assert.ok(cases.size > 0, 'should find the switch cases');

    const declared = unionMembers(read('index.d.ts'), 'SimulationType');
    const cvd = unionMembers(read('index.d.ts'), 'CvdType');
    for (const member of cvd) declared.add(member);

    const missing = [...cases].filter((c) => !declared.has(c));
    assert.deepEqual(missing, [], 'simulateCvd accepts these but the types omit them');
});

test('every cvd type the default config ships is declared', () => {
    const used = createDefaultConfig()
        .evalFunctions.filter((entry) => entry.cvd)
        .map((entry) => entry.cvd.type);
    assert.ok(used.length > 0, 'the default config should carry CVD terms');

    const declared = unionMembers(read('index.d.ts'), 'SimulationType');
    for (const member of unionMembers(read('index.d.ts'), 'CvdType')) declared.add(member);

    const missing = used.filter((type) => !declared.has(type));
    assert.deepEqual(missing, [], 'the shipped default config must typecheck against its own types');
});

// grayscale is a luminance projection, not a deficiency. Keeping it out of
// CvdType is deliberate; a future edit that "tidies" it in would make the name
// lie, which is the mistake this repository has already fixed twice.
test('grayscale is a simulation but not a deficiency', () => {
    const source = read('index.d.ts');
    assert.ok(unionMembers(source, 'SimulationType').has('grayscale'));
    assert.ok(!unionMembers(source, 'CvdType').has('grayscale'));
});

test('every type re-exported by a subpath exists in the main declarations', () => {
    const main = read('index.d.ts');
    for (const file of ['types/report.d.ts', 'types/names.d.ts', 'types/saliency.d.ts', 'types/evaluators.d.ts', 'types/cli.d.ts']) {
        const source = read(file);
        const block = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*'\.\.\/index\.js'/.exec(source);
        if (!block) continue;
        for (const raw of block[1].split(',')) {
            const name = raw.replace(/\btype\b/, '').trim();
            if (!name) continue;
            assert.ok(
                new RegExp(`export (?:type|interface|function|const) ${name}\\b`).test(main),
                `${file} imports ${name}, which index.d.ts does not export`
            );
        }
    }
});
