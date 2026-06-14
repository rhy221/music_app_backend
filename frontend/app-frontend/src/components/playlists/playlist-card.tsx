'use client';

import { useRouter } from 'next/navigation';
import { Music2 } from 'lucide-react';
import { CoverImage } from '@/components/common/cover-image';
import type { PlaylistSummaryDto } from '@/lib/api/types';

export function PlaylistCard({ playlist }: { playlist: PlaylistSummaryDto }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/playlists/${playlist.id}`)}
      className="group block cursor-pointer rounded-lg p-3 hover:bg-accent transition-colors"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-primary/10">
        {playlist.coverUrl ? (
          <CoverImage
            src={playlist.coverUrl}
            alt={playlist.name}
            className="h-full w-full"
            sizes="200px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 className="h-1/3 w-1/3 text-primary/60" />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium group-hover:underline">{playlist.name}</p>
      {playlist.description ? (
        <p className="truncate text-xs text-muted-foreground">{playlist.description}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{playlist.trackCount} tracks</p>
      )}
    </div>
  );
}
