import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index:         'src/index.ts',
    plugin:        'src/plugin.ts',
    'types/index': 'src/types/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
})
