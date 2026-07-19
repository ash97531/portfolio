import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['build/', 'node_modules/', 'app/', 'models/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'rollup_config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
