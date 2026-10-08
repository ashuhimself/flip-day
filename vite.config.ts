import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative asset paths, so the same build works at a domain root (Vercel)
  // and in a subfolder (GitHub Pages: username.github.io/repo/).
  base: './',
  plugins: [react(), tailwindcss()],
})
