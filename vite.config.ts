// vite.config.js
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import cesium from 'vite-plugin-cesium'; // 1. 导入插件

export default defineConfig({
  base: './', // 纯相对路径，彻底规避子路径404问题
  plugins: [
    vue(),
    cesium()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});