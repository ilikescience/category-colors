const createDefaultState = () => {
    const colors = [
        '#F1781E',
        '#D83F41',
        '#8F4CB3',
        '#215BEF',
        '#009919'
    ]

    // To lock specific channels during optimization, use the lockedChannels property:
    // colors[0] = { color: '#F1781E', lockedChannels: [0] }  // Lock hue (channel 0 in okhsl)
    // colors[1] = { color: '#D83F41', lockedChannels: [0, 1] }  // Lock hue and saturation
    // Channel indices depend on the color space mode:
    // - okhsl/hsl: [0]=hue, [1]=saturation, [2]=lightness
    // - oklab/lab: [0]=lightness, [1]=a, [2]=b
    // - rgb: [0]=red, [1]=green, [2]=blue

    return {
        colors,
        temperature: 1,
        iterations: 0,
        cost: Infinity,
    };
};

export { createDefaultState };
