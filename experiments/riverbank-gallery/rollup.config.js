import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

// Self-contained build for the riverbank foam animation gallery.
export default {
  input: 'experiments/riverbank-gallery/main.js',
  output: {
    format: 'iife',
    file: 'experiments/riverbank-gallery/bundle.js',
  },
  plugins: [resolve(), terser()],
};
