import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '../infrastructure/elasticsearch/elasticsearch.module';
import { SearchService } from '../application/search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ElasticsearchModule],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
