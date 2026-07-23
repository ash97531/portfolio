import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

// Self-contained build for the island experiment. Bundles three.js (bare
// imports resolved from node_modules) into a single file next to index.html,
// keeping it independent of the main portfolio bundle.
export default {
  input: 'experiments/island/main.js',
  output: {
    format: 'iife',
    file: 'experiments/island/bundle.js',
  },
  plugins: [resolve(), terser()],
};
