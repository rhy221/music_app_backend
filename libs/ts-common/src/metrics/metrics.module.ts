import { Controller, Get, Module, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Controller('metrics')
class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async metrics(@Res() res: Response): Promise<void> {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(await this.metricsService.getMetrics());
  }
}

/**
 * Provides Prometheus metrics collection and exposes the /metrics endpoint.
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsInterceptor],
  exports: [MetricsService, MetricsInterceptor],
})
export class MetricsModule {}
