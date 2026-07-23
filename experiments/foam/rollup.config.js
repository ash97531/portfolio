import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

// Self-contained build for the foam-water experiment.
export default {
  input: 'experiments/foam/main.js',
  output: {
    format: 'iife',
    file: 'experiments/foam/bundle.js',
  },
  plugins: [resolve(), terser()],
};
