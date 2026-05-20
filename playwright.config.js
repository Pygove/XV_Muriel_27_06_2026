const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5500',
    headless: true,
  },
  // Un solo worker: los tests corren en secuencia para no solapar el estado del formulario
  workers: 1,
  // Levanta el server estático automáticamente (reusa Live Server si ya está corriendo en 5500)
  webServer: {
    command: 'npx --yes http-server@14 . -p 5500 -s -c-1',
    port: 5500,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
