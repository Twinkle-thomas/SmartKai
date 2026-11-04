import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], test: { environment: 'jsdom', maxWorkers: 4, include: ['tests/**/*.ui.test.jsx', 'tests/**/*.service.test.js'], setupFiles: ['./tests/setup.js'] } });
