export interface AppConfig {
  port: number;
  mongodb: { uri: string };
  rabbitmq: { url: string; prefetchCount: number; retryAttempts: number };
  jwt: { secret: string };
  catalogServiceUrl: string;
  userServiceUrl: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env['PORT'] ?? '8087', 10),
  mongodb: {
    uri: process.env['MONGODB_URI'] ?? 'mongodb://music_admin:music_pass@localhost:27017/notifications?authSource=admin',
  },
  rabbitmq: {
    url: process.env['RABBITMQ_URL'] ?? 'amqp://music_admin:music_pass@localhost:5672/music',
    prefetchCount: parseInt(process.env['RABBITMQ_PREFETCH'] ?? '10', 10),
    retryAttempts: parseInt(process.env['RABBITMQ_RETRY_ATTEMPTS'] ?? '3', 10),
  },
  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'change-me-in-production-min-32-chars',
  },
  catalogServiceUrl: process.env['CATALOG_SERVICE_URL'] ?? 'http://localhost:8082',
  userServiceUrl: process.env['USER_SERVICE_URL'] ?? 'http://localhost:8081',
  smtp: {
    host: process.env['SMTP_HOST'] ?? 'smtp.mailtrap.io',
    port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
    user: process.env['SMTP_USER'] ?? '',
    pass: process.env['SMTP_PASS'] ?? '',
    from: process.env['SMTP_FROM'] ?? 'no-reply@musicapp.com',
  },
});
