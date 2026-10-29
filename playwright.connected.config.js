import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'connected.spec.js', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true, launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {} },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: false,
    env: { ...process.env, VITE_APP_MODE: 'api', VITE_API_BASE_URL: 'https://api.example.test', VITE_FIREBASE_API_KEY: 'teste', VITE_FIREBASE_PROJECT_ID: 'demo-vamo' }
  }
});
