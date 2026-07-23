import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

// Self-contained build for the riverbank swash-foam experiment.
export default {
  input: 'experiments/riverbank/main.js',
  output: {
    format: 'iife',
    file: 'experiments/riverbank/bundle.js',
  },
  plugins: [resolve(), terser()],
};
