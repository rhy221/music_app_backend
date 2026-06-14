import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchAllQueryDto {
  @IsString()
  q = '';

  @IsOptional()
  @IsString({ each: true })
  type?: string[];

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size = 20;
}

export class SearchTracksQueryDto {
  @IsString()
  q = '';

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  artistId?: string;

  @IsOptional()
  @IsIn(['relevance', 'newest', 'popular'])
  sort: 'relevance' | 'newest' | 'popular' = 'relevance';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size = 20;
}

export class SearchArtistsQueryDto {
  @IsString()
  q = '';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size = 20;
}

export class SearchAlbumsQueryDto {
  @IsString()
  q = '';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size = 20;
}

export class AutocompleteQueryDto {
  @IsString()
  q = '';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 5;
}
