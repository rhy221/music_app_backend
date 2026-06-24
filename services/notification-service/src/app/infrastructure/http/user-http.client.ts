import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IPolicy } from 'cockatiel';
import { createResiliencePolicy } from './resilience';

export interface PublicUserProfile {
  id: string;
  displayName: string;
  email?: string;
}

interface PaginatedUsers {
  content: PublicUserProfile[];
  totalPages: number;
}

@Injectable()
export class UserHttpClient implements OnModuleInit {
  private readonly logger = new Logger(UserHttpClient.name);
  private readonly baseUrl: string;
  private policy!: IPolicy;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('userServiceUrl')!;
  }

  onModuleInit() {
    const { policy } = createResiliencePolicy('UserService');
    this.policy = policy;
  }

  async getFollowers(userId: string): Promise<PublicUserProfile[]> {
    const all: PublicUserProfile[] = [];
    let page = 0;
    try {
      while (true) {
        const { data } = await this.policy.execute(async () =>
          firstValueFrom(
            this.http.get<PaginatedUsers>(
              `${this.baseUrl}/api/v1/users/${userId}/followers`,
              { params: { page, size: 100 } },
            ),
          ),
        );
        all.push(...data.content);
        if (page >= data.totalPages - 1) break;
        page++;
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch followers for user ${userId}: ${String(err)}`,
      );
    }
    return all;
  }
}
