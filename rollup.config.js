const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');

module.exports = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: `dist/index.cjs.js`,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: `dist/index.esm.js`,
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' }), resolve(), commonjs()],
  },
  {
    input: 'src/browser/index.ts',
    output: [
      {
        file: `dist/index.iife.js`,
        format: 'iife',
        sourcemap: true,
      },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' }), resolve(), commonjs()],
  },
  {
    input: 'src/browser/index.ts',
    output: [
      {
        file: `dist/index.iife.min.js`,
        format: 'iife',
        sourcemap: true,
      },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' }), resolve(), terser({ keep_classnames: true })],
  },
];
