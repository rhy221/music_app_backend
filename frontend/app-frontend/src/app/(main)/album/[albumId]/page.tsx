'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Disc3, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackRow } from '@/components/tracks/track-row';
import { getAlbum } from '@/lib/api/albums';
import { usePlayer } from '@/hooks/use-player';

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m >= 60) return `${Math.floor(m / 60)} hr ${m % 60} min`;
  return `${m} min ${s} sec`;
}

export default function AlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = use(params);
  const { play } = usePlayer();

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => getAlbum(albumId),
  });

  if (isLoading) {
    return (
      <div className="flex gap-6">
        <Skeleton className="h-48 w-48 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!album) return <div className="text-muted-foreground">Album not found.</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg shadow-2xl">
          {album.coverUrl ? (
            <Image src={album.coverUrl} alt={album.title} fill className="object-cover" sizes="192px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Disc3 className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Album</p>
          <h1 className="mt-1 text-4xl font-black">{album.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/artist/${album.artist.id}`} className="font-medium text-foreground hover:underline">
              {album.artist.name}
            </Link>
            {album.releaseDate && (
              <>
                <span>·</span>
                <span>{new Date(album.releaseDate).getFullYear()}</span>
              </>
            )}
            <span>·</span>
            <span>{album.tracks.length} tracks</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatMs(album.totalDurationMs)}
            </span>
          </div>
          <div className="mt-4">
            <Button onClick={() => play(album.tracks, 0)} className="gap-2" size="lg">
              <Play className="h-5 w-5 fill-current" />
              Play all
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {album.tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            queue={album.tracks}
            queueIndex={i}
          />
        ))}
      </div>
    </div>
  );
}
