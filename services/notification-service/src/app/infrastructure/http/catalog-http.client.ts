import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ArtistDetail {
  id: string;
  name: string;
  userId: string;
}

@Injectable()
export class CatalogHttpClient {
  private readonly logger = new Logger(CatalogHttpClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('catalogServiceUrl')!;
  }

  async getArtist(artistId: string): Promise<ArtistDetail | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<ArtistDetail>(`${this.baseUrl}/api/v1/artists/${artistId}`),
      );
      return data;
    } catch (err) {
      this.logger.warn(`Failed to fetch artist ${artistId}: ${String(err)}`);
      return null;
    }
  }
}
