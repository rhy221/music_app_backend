export interface AppConfig {
  port: number;
  elasticsearch: {
    node: string;
    username?: string;
    password?: string;
  };
  rabbitmq: {
    url: string;
    prefetchCount: number;
    retryAttempts: number;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env['PORT'] ?? '8085', 10),
  elasticsearch: {
    node: process.env['ELASTICSEARCH_NODE'] ?? 'http://localhost:9200',
    username: process.env['ELASTICSEARCH_USERNAME'],
    password: process.env['ELASTICSEARCH_PASSWORD'],
  },
  rabbitmq: {
    url: process.env['RABBITMQ_URL'] ?? 'amqp://music_admin:music_pass@localhost:5672/music',
    prefetchCount: parseInt(process.env['RABBITMQ_PREFETCH'] ?? '10', 10),
    retryAttempts: parseInt(process.env['RABBITMQ_RETRY_ATTEMPTS'] ?? '3', 10),
  },
});
