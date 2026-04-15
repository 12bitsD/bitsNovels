import { defineConfig, devices } from '@playwright/test';

const localBypassHosts = ['127.0.0.1', 'localhost'];
const noProxyValue = [process.env.NO_PROXY, process.env.no_proxy, ...localBypassHosts]
  .filter(Boolean)
  .join(',');

process.env.NO_PROXY = noProxyValue;
process.env.no_proxy = noProxyValue;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run ensure:python && node scripts/run_python.mjs -m uvicorn server.main:app --host 127.0.0.1 --port 8000',
      url: 'http://127.0.0.1:8000/api/health',
      reuseExistingServer: false,
      cwd: '.',
      timeout: 120000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      cwd: './apps/web',
      timeout: 120000,
    },
  ],
});
