'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Disc3, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackRow } from '@/components/tracks/track-row';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { PageGradient } from '@/components/common/page-gradient';
import { getAlbum } from '@/lib/api/albums';
import { usePlayer } from '@/hooks/use-player';
import { usePlayerStore } from '@/stores/player-store';
import { storageUrl } from '@/lib/constants';
import type { TrackSummaryDto } from '@/lib/api/types';

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m >= 60) return `${Math.floor(m / 60)} hr ${m % 60} min`;
  return `${m} min ${s} sec`;
}

export default function AlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = use(params);
  const { play, togglePlay } = usePlayer();
  const [addTarget, setAddTarget] = useState<TrackSummaryDto | null>(null);
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id);
  const isGlobalPlaying = usePlayerStore((s) => s.isPlaying);

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

  const coverSrc = storageUrl(album.coverUrl);
  const isContextActive = album.tracks.some((t) => t.id === currentTrackId);
  const isContextPlaying = isContextActive && isGlobalPlaying;

  const handlePlayPause = () => {
    if (isContextActive) {
      togglePlay();
    } else {
      play(album.tracks, 0);
    }
  };

  return (
    <PageGradient src={coverSrc}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg shadow-2xl">
          {coverSrc ? (
            <Image src={coverSrc} alt={album.title} fill className="object-cover" sizes="192px" />
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
            <Button onClick={handlePlayPause} className="gap-2" size="lg">
              {isContextPlaying ? (
                <><Pause className="h-5 w-5 fill-current" />Pause</>
              ) : (
                <><Play className="h-5 w-5 fill-current" />Play all</>
              )}
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
            onAddToPlaylist={setAddTarget}
          />
        ))}
      </div>

      <AddToPlaylistDialog track={addTarget} onClose={() => setAddTarget(null)} />
    </PageGradient>
  );
}
