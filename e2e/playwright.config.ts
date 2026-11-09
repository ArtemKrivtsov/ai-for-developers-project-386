import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  // One server for the whole run: the tests share its storage, so they go one at a time.
  workers: 1,
  use: {
    // Set by `webServer.wait` below. The config is loaded again in the worker, after the server has started.
    baseURL: process.env.E2E_BASE_URL,
    // A browser far from Moscow: the pages must show Moscow time anyway.
    timezoneId: 'America/Los_Angeles',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The server serves `frontend/dist` as it was at startup, so the build comes first.
    // Its output goes to stderr, which Playwright shows, so a failed build explains itself.
    command: 'pnpm --dir ../frontend build >&2 && node ../backend/src/server.ts',
    // Port 0 lets the system pick a free port: other checkouts may run the tests at the same time.
    env: { PORT: '0', HOST: '127.0.0.1' },
    // The named group lands in `process.env.E2E_BASE_URL`.
    wait: { stdout: /Server listening at (?<e2e_base_url>http:\/\/[\d.]+:\d+)/ },
    timeout: 120_000,
  },
});
