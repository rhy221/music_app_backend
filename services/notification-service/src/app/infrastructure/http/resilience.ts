import {
  CircuitBreakerPolicy,
  ConsecutiveBreaker,
  ExponentialBackoff,
  IPolicy,
  circuitBreaker,
  handleAll,
  retry,
  wrap,
} from 'cockatiel';
import { Logger } from '@nestjs/common';

export interface ResiliencePolicy {
  policy: IPolicy;
  circuitBreaker: CircuitBreakerPolicy;
}

export function createResiliencePolicy(serviceName: string): ResiliencePolicy {
  const logger = new Logger(`Resilience:${serviceName}`);

  const retryPolicy = retry(handleAll, {
    maxAttempts: 2,
    backoff: new ExponentialBackoff({ initialDelay: 500, maxDelay: 2000 }),
  });

  retryPolicy.onRetry(({ attempt }) => {
    logger.debug(`Retry attempt ${attempt} for ${serviceName}`);
  });

  const cb = circuitBreaker(handleAll, {
    halfOpenAfter: 30_000,
    breaker: new ConsecutiveBreaker(5),
  });

  cb.onStateChange((state) => {
    logger.warn(`Circuit breaker state changed to: ${state}`);
  });

  return { policy: wrap(retryPolicy, cb), circuitBreaker: cb };
}
