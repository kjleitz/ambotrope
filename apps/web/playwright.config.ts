import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5174",
  },
  webServer: [
    {
      command: "PORT=3002 pnpm --filter @ambotrope/server start",
      port: 3002,
      cwd: "../..",
      reuseExistingServer: true,
    },
    {
      command:
        "VITE_API_PROXY_TARGET=http://localhost:3002 VITE_WS_PROXY_TARGET=ws://localhost:3002 npx vite --port 5174",
      port: 5174,
      reuseExistingServer: true,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
