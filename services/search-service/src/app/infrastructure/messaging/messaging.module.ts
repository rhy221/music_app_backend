import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { CatalogEventConsumer } from './catalog-event.consumer';

@Module({
  imports: [ElasticsearchModule],
  providers: [CatalogEventConsumer],
})
export class MessagingModule {}
