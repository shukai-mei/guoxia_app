import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080'
  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/admin/api': { target: proxyTarget, changeOrigin: true },
        '/api': { target: proxyTarget, changeOrigin: true }
      }
    },
    test: {
      environment: 'jsdom'
    }
  }
})
