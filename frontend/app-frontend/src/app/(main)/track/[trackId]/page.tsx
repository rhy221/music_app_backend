'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Music2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackRow } from '@/components/tracks/track-row';
import { getTrack } from '@/lib/api/tracks';
import { getSimilarTracks } from '@/lib/api/recommendations';
import { usePlayer } from '@/hooks/use-player';
import type { TrackSummaryDto } from '@/lib/api/types';

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function TrackPage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = use(params);
  const { play } = usePlayer();

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => getTrack(trackId),
  });

  const { data: similar } = useQuery({
    queryKey: ['similar', trackId],
    queryFn: () => getSimilarTracks(trackId, 10),
    enabled: !!track,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-6">
          <Skeleton className="h-48 w-48 rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!track) return <div className="text-muted-foreground">Track not found.</div>;

  const trackAsSummary: TrackSummaryDto = {
    id: track.id,
    title: track.title,
    durationMs: track.durationMs,
    genre: track.genre,
    coverUrl: track.coverUrl,
    playCount: track.playCount,
    status: track.status,
    releaseDate: track.releaseDate,
    artist: track.artist,
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg shadow-2xl">
          {track.coverUrl ? (
            <Image src={track.coverUrl} alt={track.title} fill className="object-cover" sizes="192px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Music2 className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Track</p>
          <h1 className="mt-1 text-4xl font-black">{track.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/artist/${track.artist.id}`} className="font-medium text-foreground hover:underline">
              {track.artist.name}
            </Link>
            {track.album && (
              <>
                <span>·</span>
                <Link href={`/album/${track.album.id}`} className="hover:underline">
                  {track.album.title}
                </Link>
              </>
            )}
            {track.releaseDate && (
              <>
                <span>·</span>
                <span>{new Date(track.releaseDate).getFullYear()}</span>
              </>
            )}
            {track.genre && (
              <>
                <span>·</span>
                <Badge variant="secondary">{track.genre}</Badge>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatMs(track.durationMs)}
            </span>
            <span>{track.playCount.toLocaleString()} plays</span>
          </div>
          <div className="mt-4">
            <Button
              onClick={() => play([trackAsSummary], 0)}
              className="gap-2"
              size="lg"
            >
              <Play className="h-5 w-5 fill-current" />
              Play
            </Button>
          </div>
        </div>
      </div>

      {/* Audio quality */}
      {track.assets.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Available quality</h2>
          <div className="flex gap-2">
            {track.assets.map((a) => (
              <Badge key={a.bitrate} variant="outline">
                {a.bitrate} kbps
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Similar tracks */}
      {similar && similar.items.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Similar tracks</h2>
          <div className="space-y-1">
            {similar.items.map((item, i) => (
              <TrackRow
                key={item.trackId}
                track={{
                  id: item.trackId,
                  title: item.title,
                  durationMs: 0,
                  genre: item.genre,
                  coverUrl: item.coverUrl,
                  playCount: item.playCount,
                  status: 'PUBLISHED',
                  releaseDate: null,
                  artist: { id: '', name: '', avatarUrl: null },
                }}
                index={i}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
