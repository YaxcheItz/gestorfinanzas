import { defineConfig, devices } from '@playwright/test';

const postgres = process.env['E2E_DATABASE_URL'];
const backendCommand = process.platform === 'win32' ? '.\\mvnw.cmd' : 'sh ./mvnw';

export default defineConfig({
  testDir: './e2e',
  // La suite histórica conserva expectativas del diseño anterior; queda como referencia.
  // La suite vigente prueba flujos financieros contra el backend real y el esquema migrado.
  testIgnore: '**/finanzas.spec.ts',
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
      command: `${backendCommand} spring-boot:run "-Dspring-boot.run.useTestClasspath=true"`,
      cwd: '../backend',
      url: 'http://localhost:18080/api/health',
      reuseExistingServer: false,
      env: {
        FINANZAS_E2E: 'true',
        SPRING_PROFILES_ACTIVE: 'test',
        SPRING_DATASOURCE_URL: postgres ?? 'jdbc:h2:mem:gestionfinanzas-e2e;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE',
        SPRING_DATASOURCE_USERNAME: process.env['E2E_DATABASE_USERNAME'] ?? 'sa',
        SPRING_DATASOURCE_PASSWORD: process.env['E2E_DATABASE_PASSWORD'] ?? '',
        SPRING_DATASOURCE_DRIVER_CLASS_NAME: postgres ? 'org.postgresql.Driver' : 'org.h2.Driver',
        SPRING_JPA_HIBERNATE_DDL_AUTO: postgres ? 'validate' : 'create-drop',
        SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA: postgres ? 'finanzas' : 'PUBLIC',
        SPRING_FLYWAY_ENABLED: postgres ? 'true' : 'false',
        SPRING_FLYWAY_DEFAULT_SCHEMA: postgres ? 'finanzas' : 'PUBLIC',
        SPRING_FLYWAY_SCHEMAS: postgres ? 'finanzas' : 'PUBLIC',
        JWT_SECRET: '0123456789abcdef0123456789abcdef',
        SERVER_PORT: '18080',
        APP_CORS_ALLOWED_ORIGINS: 'http://localhost:14200'
      },
      timeout: 120_000
    },
    {
      command: 'npm run start:e2e -- --host localhost --port 14200',
      url: 'http://localhost:14200',
      reuseExistingServer: false,
      timeout: 120_000
    }
  ]
});
