const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.resolve(projectRoot, 'bin', 'category-colors.js');
const configFixture = path.resolve(__dirname, 'fixtures', 'cliConfig.js');

const runCli = (args) => spawnSync('node', [cliPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
});

test('CLI outputs JSON when requested', () => {
    const result = runCli(['run', '--format', 'json', '--quiet', '--config', configFixture]);
    assert.strictEqual(result.status, 0, result.stderr);
    const output = result.stdout.trim();
    assert.ok(output.length > 0, 'Expected JSON output from CLI.');
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.palette), 'JSON output should include a palette array.');
    assert.ok(parsed.palette.length > 0, 'Palette array should not be empty.');
});

test('CLI writes palette format to file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'category-colors-cli-'));
    const outputPath = path.join(tempDir, 'palette.txt');
    const result = runCli([
        'run',
        '--format',
        'palette',
        '--quiet',
        '--config',
        configFixture,
        '--output',
        outputPath,
    ]);
    try {
        assert.strictEqual(result.status, 0, result.stderr);
        const contents = fs.readFileSync(outputPath, 'utf8').trim().split('\n');
        assert.ok(contents.length > 0, 'Palette file should contain at least one color.');
        contents.forEach((line) => {
            assert.match(line, /^#?[0-9a-f]{6}$/i, 'Palette lines should look like hex colors.');
        });
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
