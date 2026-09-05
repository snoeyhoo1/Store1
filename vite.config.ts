import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Capacitor는 상대 경로 base를 요구합니다 (file:// 로 로드되는 android asset).
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
