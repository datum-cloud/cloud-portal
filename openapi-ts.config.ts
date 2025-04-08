import { defineConfig, defaultPlugins } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './gateway.json',
  output: './app/modules/control-plane/gateway',
  plugins: [
    ...defaultPlugins,
    '@hey-api/client-axios',
    '@hey-api/schemas',
    {
      dates: true,
      name: '@hey-api/transformers',
    },
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
  ],
})
