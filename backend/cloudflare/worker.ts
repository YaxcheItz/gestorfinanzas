import { DurableObject } from 'cloudflare:workers';

interface Env {
  BACKEND: DurableObjectNamespace<KaptalBackendContainer>;
  SPRING_DATASOURCE_URL: string;
  SPRING_DATASOURCE_USERNAME: string;
  SPRING_DATASOURCE_PASSWORD: string;
  SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA: string;
  JWT_SECRET: string;
  JWT_EXPIRATION_MS?: string;
  JWT_REFRESH_EXPIRATION_MS?: string;
  JWT_REFRESH_COOKIE_NAME?: string;
  JWT_REFRESH_SAME_SITE?: string;
  JWT_REFRESH_SECURE?: string;
  GOOGLE_CLIENT_ID?: string;
  APP_ADMIN_EMAILS?: string;
  FRONTEND_URL?: string;
  CORS_ORIGINS?: string;
  WEB_PUSH_PUBLIC_KEY?: string;
  WEB_PUSH_PRIVATE_KEY?: string;
  WEB_PUSH_SUBJECT?: string;
  GEMINI_API_KEY?: string;
  GEMINI_API_URL?: string;
  GROQ_API_KEY?: string;
  GROQ_API_URL?: string;
  GROQ_MODEL?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  AI_FALLBACK_MODEL?: string;
  MAIL_HOST?: string;
  MAIL_PORT?: string;
  MAIL_USERNAME?: string;
  MAIL_PASSWORD?: string;
  MAIL_SMTP_AUTH?: string;
  MAIL_SMTP_STARTTLS?: string;
  MAIL_ENABLED?: string;
  MAIL_PROVIDER?: string;
  MAIL_FROM?: string;
  RESEND_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_NUMBER?: string;
}

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export class KaptalBackendContainer extends DurableObject<Env> {
  private starting?: Promise<void>;

  async fetch(request: Request): Promise<Response> {
    this.starting ??= this.startAndWaitForHealth().finally(() => {
      this.starting = undefined;
    });
    await this.starting;

    const url = new URL(request.url);
    url.protocol = 'http:';
    url.hostname = 'container';
    url.port = '8080';
    const forwarded = new Request(url, request);
    forwarded.headers.delete('host');
    return this.ctx.container!.getTcpPort(8080).fetch(forwarded);
  }

  private async startAndWaitForHealth(): Promise<void> {
    const container = this.ctx.container!;
    if (!container.running) {
      const required = [
        this.env.SPRING_DATASOURCE_URL,
        this.env.SPRING_DATASOURCE_USERNAME,
        this.env.SPRING_DATASOURCE_PASSWORD,
        this.env.SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA,
        this.env.JWT_SECRET
      ];
      if (required.some(value => !value)) {
        throw new Error('Configure the required database and JWT Worker secrets before starting Kaptal.');
      }

      const values = Object.fromEntries(Object.entries({
        PORT: '8080',
        SPRING_DATASOURCE_URL: this.env.SPRING_DATASOURCE_URL,
        SPRING_DATASOURCE_USERNAME: this.env.SPRING_DATASOURCE_USERNAME,
        SPRING_DATASOURCE_PASSWORD: this.env.SPRING_DATASOURCE_PASSWORD,
        SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA: this.env.SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA,
        JWT_SECRET: this.env.JWT_SECRET,
        JWT_EXPIRATION_MS: this.env.JWT_EXPIRATION_MS,
        JWT_REFRESH_EXPIRATION_MS: this.env.JWT_REFRESH_EXPIRATION_MS,
        JWT_REFRESH_COOKIE_NAME: this.env.JWT_REFRESH_COOKIE_NAME,
        JWT_REFRESH_SAME_SITE: this.env.JWT_REFRESH_SAME_SITE,
        JWT_REFRESH_SECURE: this.env.JWT_REFRESH_SECURE,
        GOOGLE_CLIENT_ID: this.env.GOOGLE_CLIENT_ID,
        APP_ADMIN_EMAILS: this.env.APP_ADMIN_EMAILS,
        FRONTEND_URL: this.env.FRONTEND_URL,
        CORS_ORIGINS: this.env.CORS_ORIGINS,
        WEB_PUSH_PUBLIC_KEY: this.env.WEB_PUSH_PUBLIC_KEY,
        WEB_PUSH_PRIVATE_KEY: this.env.WEB_PUSH_PRIVATE_KEY,
        WEB_PUSH_SUBJECT: this.env.WEB_PUSH_SUBJECT,
        GEMINI_API_KEY: this.env.GEMINI_API_KEY,
        GEMINI_API_URL: this.env.GEMINI_API_URL,
        GROQ_API_KEY: this.env.GROQ_API_KEY,
        GROQ_API_URL: this.env.GROQ_API_URL,
        GROQ_MODEL: this.env.GROQ_MODEL,
        AI_PROVIDER: this.env.AI_PROVIDER,
        AI_MODEL: this.env.AI_MODEL,
        AI_FALLBACK_MODEL: this.env.AI_FALLBACK_MODEL,
        MAIL_HOST: this.env.MAIL_HOST,
        MAIL_PORT: this.env.MAIL_PORT,
        MAIL_USERNAME: this.env.MAIL_USERNAME,
        MAIL_PASSWORD: this.env.MAIL_PASSWORD,
        MAIL_SMTP_AUTH: this.env.MAIL_SMTP_AUTH,
        MAIL_SMTP_STARTTLS: this.env.MAIL_SMTP_STARTTLS,
        MAIL_ENABLED: this.env.MAIL_ENABLED,
        MAIL_PROVIDER: this.env.MAIL_PROVIDER,
        MAIL_FROM: this.env.MAIL_FROM,
        RESEND_API_KEY: this.env.RESEND_API_KEY,
        TWILIO_ACCOUNT_SID: this.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: this.env.TWILIO_AUTH_TOKEN,
        TWILIO_WHATSAPP_NUMBER: this.env.TWILIO_WHATSAPP_NUMBER
      }).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));

      container.start({
        image: container.images.base,
        instance: 'lite',
        enableInternet: true,
        env: values
      });
    }
    await container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);

    const port = container.getTcpPort(8080);
    let lastError: unknown;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const response = await port.fetch('http://container:8080/api/health', {
          signal: AbortSignal.timeout(1000)
        });
        await response.body?.cancel();
        if (response.ok) return;
        lastError = new Error(`Backend health check returned ${response.status}.`);
      } catch (error) {
        lastError = error;
      }
      await scheduler.wait(300);
    }
    throw new Error('Kaptal backend did not become healthy on port 8080.', { cause: lastError });
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.BACKEND.getByName('kaptal-backend').fetch(request);
  }
};
