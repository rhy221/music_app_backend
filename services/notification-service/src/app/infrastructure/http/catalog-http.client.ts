import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IPolicy } from 'cockatiel';
import { createResiliencePolicy } from './resilience';

export interface ArtistDetail {
  id: string;
  name: string;
  userId: string;
}

@Injectable()
export class CatalogHttpClient implements OnModuleInit {
  private readonly logger = new Logger(CatalogHttpClient.name);
  private readonly baseUrl: string;
  private policy!: IPolicy;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('catalogServiceUrl')!;
  }

  onModuleInit() {
    const { policy } = createResiliencePolicy('CatalogService');
    this.policy = policy;
  }

  async getArtist(artistId: string): Promise<ArtistDetail | null> {
    try {
      return await this.policy.execute(async () => {
        const { data } = await firstValueFrom(
          this.http.get<ArtistDetail>(
            `${this.baseUrl}/api/v1/artists/${artistId}`,
          ),
        );
        return data;
      });
    } catch (err) {
      this.logger.warn(`Failed to fetch artist ${artistId}: ${String(err)}`);
      return null;
    }
  }
}
