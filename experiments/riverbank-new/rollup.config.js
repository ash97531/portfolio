import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

// Self-contained build for the Riverbank calm-wave experiment.
export default {
  input: 'experiments/riverbank-new/main.js',
  output: {
    format: 'iife',
    file: 'experiments/riverbank-new/bundle.js',
  },
  plugins: [resolve(), terser()],
};
