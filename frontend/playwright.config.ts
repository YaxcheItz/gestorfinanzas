import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  retries: 0,
  use: {
    baseURL: 'http://localhost:14200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command: '.\\mvnw.cmd spring-boot:run "-Dspring-boot.run.useTestClasspath=true"',
      cwd: '../backend',
      url: 'http://localhost:18080/api/health',
      reuseExistingServer: false,
      env: {
        FINANZAS_E2E: 'true',
        SPRING_PROFILES_ACTIVE: 'test',
        SPRING_DATASOURCE_URL: 'jdbc:h2:mem:gestionfinanzas-e2e;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE',
        SPRING_DATASOURCE_USERNAME: 'sa',
        SPRING_DATASOURCE_PASSWORD: '',
        SPRING_DATASOURCE_DRIVER_CLASS_NAME: 'org.h2.Driver',
        SPRING_JPA_HIBERNATE_DDL_AUTO: 'create-drop',
        SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA: 'PUBLIC',
        JWT_SECRET: '0123456789abcdef0123456789abcdef',
        SERVER_PORT: '18080',
        APP_CORS_ALLOWED_ORIGINS: 'http://localhost:14200'
      },
      timeout: 120_000
    },
    {
      command: 'npm run start -- --host localhost --port 14200',
      url: 'http://localhost:14200',
      reuseExistingServer: false,
      timeout: 120_000
    }
  ]
});
