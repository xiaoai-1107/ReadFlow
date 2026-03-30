import { defineConfig, devices } from '@playwright/test'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.e2e\.ts$/,
  timeout: 90_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: edgePath
    }
  },
  projects: [
    {
      name: 'desktop-edge',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 1024 }
      }
    },
    {
      name: 'iphone-edge',
      use: {
        browserName: 'chromium',
        ...devices['iPhone 13']
      }
    },
    {
      name: 'android-edge',
      use: {
        browserName: 'chromium',
        ...devices['Pixel 7']
      }
    }
  ],
  webServer: {
    command: 'node tests/static-server.cjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30_000
  }
})
