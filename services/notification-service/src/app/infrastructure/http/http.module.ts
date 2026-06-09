import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CatalogHttpClient } from './catalog-http.client';
import { UserHttpClient } from './user-http.client';

@Module({
  imports: [HttpModule.register({ timeout: 5000 })],
  providers: [CatalogHttpClient, UserHttpClient],
  exports: [CatalogHttpClient, UserHttpClient],
})
export class HttpClientModule {}
