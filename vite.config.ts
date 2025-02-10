import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

const aliases: {[key: string]: string} = {
  '@': resolve(__dirname, './app'),
};

// Workaround for issue with running react router in a production build
//
// See: https://github.com/remix-run/react-router/issues/12568#issuecomment-2629986004
if (process.env.NODE_ENV == 'production') {
  aliases['react-dom/server'] = 'react-dom/server.node';
}

export default defineConfig({
  resolve: {
    alias: aliases,
  },
  ssr: {
    optimizeDeps: {
      include: ['react-dom/server.node'],
    },
  },
  assetsInclude: ['**/*.woff2'], // Add font formats you're using
  plugins: [reactRouter(), tsconfigPaths()],
})
