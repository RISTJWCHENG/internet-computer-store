import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
const site = JSON.parse(readFileSync(new URL('./config/site.json', import.meta.url), 'utf8'))
export default defineConfig({
  root: 'web',
  plugins: [{ name: 'site-brand', transformIndexHtml: html => html.replaceAll('%SITE_NAME%', site.name) }],
  base: process.env.PUBLIC_BASE_PATH || (process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/'),
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2020' },
  server: { proxy: { '/api': { target: 'https://icp-api.io', changeOrigin: true, secure: true } } }
})
