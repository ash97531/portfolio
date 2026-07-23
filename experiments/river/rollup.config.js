import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

// Self-contained build for the river wave gallery experiment.
export default {
  input: 'experiments/river/main.js',
  output: {
    format: 'iife',
    file: 'experiments/river/bundle.js',
  },
  plugins: [resolve(), terser()],
};
