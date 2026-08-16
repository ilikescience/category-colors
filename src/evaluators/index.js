import energy from './energy/energy.js';
import range from './range/range.js';
import similarity from './similarity/similarity.js';
import avoid from './avoid/avoid.js';
import jnd from './jnd/jnd.js';
import contrast from './contrast/contrast.js';
import saliency from './saliency/saliency.js';

// Referencing this object pulls in every evaluator, saliency's ~150 kB lookup
// table included, because a bundler cannot prove which keys you will index.
// Import the evaluators you name individually if you want that dropped, or
// reach saliency through 'category-colors/evaluators/saliency' to load the
// table on demand.
const evaluators = { energy, range, similarity, avoid, jnd, contrast, saliency };

export { energy, range, similarity, avoid, jnd, contrast, saliency, evaluators };
export default evaluators;
