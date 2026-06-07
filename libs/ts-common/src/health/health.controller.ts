import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

/**
 * Exposes GET /health endpoint using NestJS Terminus health checks.
 * Services can add their own health indicators (MongoDB, Elasticsearch, etc.)
 * by extending this controller or adding custom Terminus indicators.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
