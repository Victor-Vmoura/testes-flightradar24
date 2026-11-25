import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // Roda 1 por vez para o site não bloquear por excesso de requisições
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'on',
    // Simula um navegador Chrome real no Windows
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled', // Esconde que é um robô (webdriver)
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});