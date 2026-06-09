import Link from 'next/link';
import { CoverImage } from '@/components/common/cover-image';
import type { AlbumSummaryDto } from '@/lib/api/types';

export function AlbumCard({ album }: { album: AlbumSummaryDto }) {
  return (
    <Link href={`/album/${album.id}`} className="group block rounded-lg p-3 hover:bg-accent transition-colors">
      <CoverImage
        src={album.coverUrl}
        alt={album.title}
        className="aspect-square w-full rounded-md"
      />
      <p className="mt-2 truncate text-sm font-medium group-hover:underline">{album.title}</p>
      <Link
        href={`/artist/${album.artist.id}`}
        className="block truncate text-xs text-muted-foreground hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {album.artist.name}
      </Link>
      {album.releaseDate && (
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(album.releaseDate).getFullYear()}
        </p>
      )}
    </Link>
  );
}
