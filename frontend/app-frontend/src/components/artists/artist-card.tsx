import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import type { ArtistSummaryDto } from '@/lib/api/types';

export function ArtistCard({ artist }: { artist: ArtistSummaryDto }) {
  return (
    <Link href={`/artist/${artist.id}`} className="group block rounded-lg p-3 text-center hover:bg-accent transition-colors">
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-muted">
        {artist.avatarUrl ? (
          <Image src={artist.avatarUrl} alt={artist.name} fill className="object-cover" sizes="200px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-1/3 w-1/3 text-muted-foreground" />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium group-hover:underline">{artist.name}</p>
      <p className="text-xs text-muted-foreground">{artist.trackCount} tracks</p>
    </Link>
  );
}
