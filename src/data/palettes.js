import { createColor } from '../utils/paletteColor.js';

const observable10 = [
    createColor('#4269d0'),
    createColor('#efb118'),
    createColor('#ff725c'),
    createColor('#6cc5b0'),
    createColor('#3ca951'),
    createColor('#ff8ab7'),
    createColor('#a463f2'),
    createColor('#97bbf5'),
    createColor('#9c6b4e'),
    createColor('#9498a0'),
];

const d3category10 = [
    createColor('#1f77b4'),
    createColor('#ff7f0e'),
    createColor('#2ca02c'),
    createColor('#d62728'),
    createColor('#9467bd'),
    createColor('#8c564b'),
    createColor('#e377c2'),
    createColor('#7f7f7f'),
    createColor('#bcbd22'),
    createColor('#17becf'),
];

const carbon = [
    createColor('#6929c4'),
    createColor('#1192e8'),
    createColor('#005d5d'),
    createColor('#9f1853'),
    createColor('#fa4d56'),
    createColor('#570408'),
    createColor('#198038'),
    createColor('#002d9c'),
    createColor('#ee538b'),
    createColor('#b28600'),
    createColor('#009d9a'),
    createColor('#012749'),
    createColor('#8a3800'),
    createColor('#a56eff'),
];

// Tableau's own definition, via ggthemes' data-raw/theme-data/tableau.yml,
// which carries Tableau's internal swatch names alongside the hexes. Tableau
// publishes no hex list, so every implementation differs slightly: d3's
// Tableau10 differs in four positions (including #edc949 for the yellow), and
// Vega's `tableau10` is an entirely different palette. Don't "correct" these
// against either.
const tableau10 = [
    createColor('#4e79a7'),
    createColor('#f28e2b'),
    createColor('#e15759'),
    createColor('#76b7b2'),
    createColor('#59a14f'),
    createColor('#edc948'),
    createColor('#b07aa1'),
    createColor('#ff9da7'),
    createColor('#9c755f'),
    createColor('#bab0ac'),
];

const tableau20 = [
    createColor('#4e79a7'),
    createColor('#a0cbe8'),
    createColor('#f28e2b'),
    createColor('#ffbe7d'),
    createColor('#59a14f'),
    createColor('#8cd17d'),
    createColor('#b6992d'),
    createColor('#f1ce63'),
    createColor('#499894'),
    createColor('#86bcb6'),
    createColor('#e15759'),
    createColor('#ff9d9a'),
    createColor('#79706e'),
    createColor('#bab0ac'),
    createColor('#d37295'),
    createColor('#fabfd2'),
    createColor('#b07aa1'),
    createColor('#d4a6c8'),
    createColor('#9d7660'),
    createColor('#d7b5a6'),
];

const colorBrewer3_10 = [
    createColor('#8dd3c7'),
    createColor('#ffffb3'),
    createColor('#bebada'),
    createColor('#fb8072'),
    createColor('#80b1d3'),
    createColor('#fdb462'),
    createColor('#b3de69'),
    createColor('#fccde5'),
    createColor('#d9d9d9'),
    createColor('#bc80bd'),
];

// Okabe & Ito's "Color Universal Design" set, the reference palette designed
// specifically to stay distinguishable under color vision deficiency. Their
// paper publishes the swatches as an image rather than as values, so these hex
// codes are the community's digitisation; they are identical in Claus Wilke's
// colorblindr (palette_OkabeIto) and in ggokabeito, which is the order used
// here. The first eight are exactly colorblindr's eight-colour variant.
//
//   Okabe, M. and Ito, K. "Color Universal Design (CUD): How to Make Figures
//   and Presentations That Are Friendly to Colorblind People." 2008.
//   https://jfly.uni-koeln.de/color/
const okabeIto = [
    createColor('#e69f00'), // orange
    createColor('#56b4e9'), // sky blue
    createColor('#009e73'), // bluish green
    createColor('#f0e442'), // yellow
    createColor('#0072b2'), // blue
    createColor('#d55e00'), // vermillion
    createColor('#cc79a7'), // reddish purple
    createColor('#999999'), // gray
    createColor('#000000'), // black
];

// Petroff's accessible colour cycles: minimum-perceptual-distance constraints
// under simulated CVD, a minimum *lightness* separation for grayscale, and an
// aesthetic-preference model trained on a survey. The nearest work to this
// library's objective, and the only other palette here with an explicit
// grayscale constraint.
//
// Unlike every other reference here, each length is optimized separately --
// petroff8 is not the first eight of petroff10 -- so truncating one to compare
// at another length measures a palette Petroff did not design. Use the entry
// matching the colour count.
//
//   Petroff, M. A. "Accessible Color Sequences for Data Visualization." 2021.
//   arXiv:2107.02270. Values quoted from the "Final results" section of
//   github.com/mpetroff/accessible-color-cycles (MIT).
const petroff6 = [
    createColor('#5790fc'),
    createColor('#f89c20'),
    createColor('#e42536'),
    createColor('#964a8b'),
    createColor('#9c9ca1'),
    createColor('#7a21dd'),
];

const petroff8 = [
    createColor('#1845fb'),
    createColor('#ff5e02'),
    createColor('#c91f16'),
    createColor('#c849a9'),
    createColor('#adad7d'),
    createColor('#86c8dd'),
    createColor('#578dff'),
    createColor('#656364'),
];

const petroff10 = [
    createColor('#3f90da'),
    createColor('#ffa90e'),
    createColor('#bd1f01'),
    createColor('#94a4a2'),
    createColor('#832db6'),
    createColor('#a96b59'),
    createColor('#e76300'),
    createColor('#b9ac70'),
    createColor('#717581'),
    createColor('#92dadd'),
];

export {
    observable10, d3category10, carbon, tableau10, tableau20, colorBrewer3_10,
    okabeIto, petroff6, petroff8, petroff10,
};
