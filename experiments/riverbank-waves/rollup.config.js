import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

// Self-contained build for the riverbank rolling-waves experiment.
export default {
  input: 'experiments/riverbank-waves/main.js',
  output: {
    format: 'iife',
    file: 'experiments/riverbank-waves/bundle.js',
  },
  plugins: [resolve(), terser()],
};
