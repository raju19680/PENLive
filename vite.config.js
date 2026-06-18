import { defineConfig } from 'vite';

// When building only the frontend (without Tauri), externalize Tauri imports
// so they don't break the build. The Tauri bundler handles them at runtime.
const isTauriBuild = process.env.TAURI_ENV_PLATFORM !== undefined;

export default defineConfig({
  root: 'src',
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      external: isTauriBuild ? [] : [
        '@tauri-apps/api/core',
        '@tauri-apps/api/window',
        '@tauri-apps/plugin-shell',
        '@tauri-apps/plugin-dialog',
        '@tauri-apps/plugin-fs',
      ],
    },
  },
});
