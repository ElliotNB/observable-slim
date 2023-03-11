// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

const input = 'observable-slim.js';
const plugins = [
  resolve(),
  commonjs(),
  babel({
    babelHelpers: 'bundled',
    presets: [['@babel/preset-env', { targets: '>0.25%, not dead' }]],
  }),
];

export default [
  // CJS
  {
    input,
    output: { file: 'dist/observable-slim.cjs', format: 'cjs', exports: 'auto' },
    plugins,
  },
  // ESM
  {
    input,
    output: { file: 'dist/observable-slim.mjs', format: 'esm', exports: 'named' },
    plugins,
  },
  // UMD (minified)
  {
    input,
    output: {
      file: 'dist/observable-slim.umd.min.js',
      format: 'umd',
      name: 'ObservableSlim',
      exports: 'auto',
    },
    plugins: [...plugins, terser()],
  },
];
