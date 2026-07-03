const test = require('node:test');
const assert = require('node:assert/strict');
const { mutateColorInSpace } = require('../src/utils/colorSpaceTools');
const { resolveDistanceOptions } = require('../src/utils/distanceOptions');
const { createColor } = require('../src/utils/paletteColor');

test('lockedChannels property is preserved on color objects', () => {
    const color = createColor({ color: '#ff0000', lockedChannels: [0, 1] });

    assert.deepEqual(color.lockedChannels, [0, 1], 'lockedChannels should be preserved');
    assert.equal(color.mode, 'rgb', 'color mode should be rgb');
});

test('mutateColorInSpace respects locked channels', () => {
    const config = {
        colorSpace: {
            mode: 'okhsl',
            ranges: [
                [0, 360],   // hue
                [0, 1],     // saturation
                [0, 1],     // lightness
            ],
        },
    };
    const distanceOptions = resolveDistanceOptions(config);

    // Create a color with locked hue (channel 0)
    const baseColor = createColor('#ff0000');
    baseColor.lockedChannels = [0]; // Lock hue

    const baseOkhsl = baseColor.to('okhsl');
    const baseHue = baseOkhsl.coords[0];

    // Mutate the color multiple times
    for (let i = 0; i < 10; i++) {
        const mutated = mutateColorInSpace(baseColor, 0.5, config, distanceOptions);
        const mutatedOkhsl = mutated.to('okhsl');
        const mutatedHue = mutatedOkhsl.coords[0];

        // Allow small floating point differences
        const hueDiff = Math.abs(mutatedHue - baseHue);
        assert.ok(
            hueDiff < 0.1,
            `Hue should remain locked (expected ~${baseHue}, got ${mutatedHue}, diff: ${hueDiff})`
        );

        // Verify lockedChannels is preserved
        assert.deepEqual(
            mutated.lockedChannels,
            [0],
            'lockedChannels should be preserved after mutation'
        );
    }
});

test('mutateColorInSpace allows unlocked channels to change', () => {
    const config = {
        colorSpace: {
            mode: 'okhsl',
            ranges: [
                [0, 360],   // hue
                [0, 1],     // saturation
                [0, 1],     // lightness
            ],
        },
    };
    const distanceOptions = resolveDistanceOptions(config);

    // Create a color with locked hue but unlocked saturation and lightness
    const baseColor = createColor('#ff0000');
    baseColor.lockedChannels = [0]; // Lock hue only

    const baseOkhsl = baseColor.to('okhsl');
    const baseSaturation = baseOkhsl.coords[1];
    const baseLightness = baseOkhsl.coords[2];

    // Mutate the color multiple times and check if at least one mutation changes S or L
    let saturationChanged = false;
    let lightnessChanged = false;

    for (let i = 0; i < 50; i++) {
        const mutated = mutateColorInSpace(baseColor, 0.5, config, distanceOptions);
        const mutatedOkhsl = mutated.to('okhsl');

        const satDiff = Math.abs(mutatedOkhsl.coords[1] - baseSaturation);
        const lightDiff = Math.abs(mutatedOkhsl.coords[2] - baseLightness);

        if (satDiff > 0.01) saturationChanged = true;
        if (lightDiff > 0.01) lightnessChanged = true;

        if (saturationChanged && lightnessChanged) break;
    }

    assert.ok(
        saturationChanged || lightnessChanged,
        'At least one unlocked channel should change during mutations'
    );
});

test('multiple locked channels are respected', () => {
    const config = {
        colorSpace: {
            mode: 'okhsl',
            ranges: [
                [0, 360],   // hue
                [0, 1],     // saturation
                [0, 1],     // lightness
            ],
        },
    };
    const distanceOptions = resolveDistanceOptions(config);

    // Create a color with locked hue and saturation
    const baseColor = createColor('#ff0000');
    baseColor.lockedChannels = [0, 1]; // Lock hue and saturation

    const baseOkhsl = baseColor.to('okhsl');
    const baseHue = baseOkhsl.coords[0];
    const baseSaturation = baseOkhsl.coords[1];

    // Mutate the color multiple times
    for (let i = 0; i < 10; i++) {
        const mutated = mutateColorInSpace(baseColor, 0.5, config, distanceOptions);
        const mutatedOkhsl = mutated.to('okhsl');

        const hueDiff = Math.abs(mutatedOkhsl.coords[0] - baseHue);
        const satDiff = Math.abs(mutatedOkhsl.coords[1] - baseSaturation);

        assert.ok(
            hueDiff < 0.1,
            `Hue should remain locked (diff: ${hueDiff})`
        );
        assert.ok(
            satDiff < 0.01,
            `Saturation should remain locked (diff: ${satDiff})`
        );
    }
});

test('empty lockedChannels array allows all channels to mutate', () => {
    const config = {
        colorSpace: {
            mode: 'okhsl',
            ranges: [
                [0, 360],   // hue
                [0, 1],     // saturation
                [0, 1],     // lightness
            ],
        },
    };
    const distanceOptions = resolveDistanceOptions(config);

    const baseColor = createColor('#ff0000');
    baseColor.lockedChannels = []; // No locked channels

    const baseOkhsl = baseColor.to('okhsl');

    // Mutate many times to ensure at least one mutation changes something
    let anyChanged = false;
    for (let i = 0; i < 50; i++) {
        const mutated = mutateColorInSpace(baseColor, 0.5, config, distanceOptions);
        const mutatedOkhsl = mutated.to('okhsl');

        if (Math.abs(mutatedOkhsl.coords[0] - baseOkhsl.coords[0]) > 0.1 ||
            Math.abs(mutatedOkhsl.coords[1] - baseOkhsl.coords[1]) > 0.01 ||
            Math.abs(mutatedOkhsl.coords[2] - baseOkhsl.coords[2]) > 0.01) {
            anyChanged = true;
            break;
        }
    }

    assert.ok(anyChanged, 'At least one channel should change when none are locked');
});
