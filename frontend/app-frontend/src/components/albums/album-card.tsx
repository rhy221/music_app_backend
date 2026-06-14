'use client';

import { useRouter } from 'next/navigation';
import { CoverImage } from '@/components/common/cover-image';
import type { AlbumSummaryDto } from '@/lib/api/types';

export function AlbumCard({ album }: { album: AlbumSummaryDto }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/album/${album.id}`)}
      className="group block cursor-pointer rounded-lg p-3 hover:bg-accent transition-colors"
    >
      <CoverImage
        src={album.coverUrl}
        alt={album.title}
        className="aspect-square w-full rounded-md"
      />
      <p className="mt-2 truncate text-sm font-medium group-hover:underline">{album.title}</p>
      <a
        href={`/artist/${album.artist.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block truncate text-xs text-muted-foreground hover:underline"
      >
        {album.artist.name}
      </a>
      {album.releaseDate && (
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(album.releaseDate).getFullYear()}
        </p>
      )}
    </div>
  );
}
