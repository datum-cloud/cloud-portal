import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './app'),
			'react-dom/server': 'react-dom/server.node',
		},
  },
  assetsInclude: ['**/*.woff2'], // Add font formats you're using
  plugins: [reactRouter(), tsconfigPaths()],
})
