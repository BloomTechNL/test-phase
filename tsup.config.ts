import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/eslint-plugin.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  // Makes `require('test-phase/eslint-plugin')` return the plugin itself instead of `{ default }`.
  cjsInterop: true,
  splitting: true,
});
