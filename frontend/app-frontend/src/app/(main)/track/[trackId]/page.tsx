'use client';

import { use, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Music2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackRow } from '@/components/tracks/track-row';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { usePageGradient } from '@/components/common/page-gradient';
import { getTrack, getPopularTracks } from '@/lib/api/tracks';
import { getSimilarTracks } from '@/lib/api/recommendations';
import { usePlayer } from '@/hooks/use-player';
import { usePlayerStore } from '@/stores/player-store';
import { storageUrl } from '@/lib/constants';
import type { TrackSummaryDto } from '@/lib/api/types';

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function TrackPage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = use(params);
  const { play, togglePlay } = usePlayer();
  const [addTarget, setAddTarget] = useState<TrackSummaryDto | null>(null);
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id);
  const isGlobalPlaying = usePlayerStore((s) => s.isPlaying);
  const { setSrc } = usePageGradient();

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => getTrack(trackId),
  });

  const { data: similar } = useQuery({
    queryKey: ['similar', trackId],
    queryFn: () => getSimilarTracks(trackId, 10),
    enabled: !!track,
  });

  const filteredSimilar = (similar?.items ?? []).filter((item) => item.trackId !== trackId);
  const hasSimilar = filteredSimilar.length > 0;

  const { data: popular } = useQuery({
    queryKey: ['tracks', 'popular'],
    queryFn: () => getPopularTracks({ limit: 10, period: 'week' }),
    enabled: !!similar && !hasSimilar,
  });

  const filteredPopular = (popular ?? []).filter((t) => t.id !== trackId);

  const coverSrc = track ? storageUrl(track.coverUrl) : null;

  useEffect(() => {
    setSrc(coverSrc);
    return () => setSrc(null);
  }, [coverSrc, setSrc]);

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

  const isThisActive = currentTrackId === track.id;
  const isThisPlaying = isThisActive && isGlobalPlaying;

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

  const handlePlayPause = () => {
    if (isThisActive) togglePlay();
    else play([trackAsSummary], 0);
  };

  return (
    <div className="space-y-8 h-full">
      {/* Hero */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end p-6">
        <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-lg shadow-2xl">
          {coverSrc ? (
            <Image src={coverSrc} alt={track.title} fill className="object-cover" sizes="192px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Music2 className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Track</p>
          <h1 className="mt-1 text-7xl font-black tracking-tight leading-none">{track.title}</h1>
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
            <Button onClick={handlePlayPause} className="gap-2" size="lg">
              {isThisPlaying ? (
                <><Pause className="h-5 w-5 fill-current" />Pause</>
              ) : (
                <><Play className="h-5 w-5 fill-current" />Play</>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="space-y-8 p-6 h-full"
       style={{
                background: `linear-gradient(to bottom, rgba(31,31,31,0.3) 0%, rgba(31,31,31,0.4) 20%, rgba(31,31,31,0.65) 60%, rgba(31,31,31,1) 100%)`,
              }}>

        {/* From the album */}
      {track.album && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">From the album</h2>
          <a
            href={`/album/${track.album.id}`}
            className="flex items-center gap-4 rounded-lg p-3 hover:bg-accent transition-colors"
          >
            {track.album.coverUrl ? (
              <img src={storageUrl(track.album.coverUrl) ?? undefined} alt={track.album.title} className="h-14 w-14 shrink-0 rounded object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{track.album.title}</p>
              <p className="text-sm text-muted-foreground">Album</p>
            </div>
          </a>
        </div>
      )}

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

      {/* Similar tracks — fallback to popular if none */}
      {(hasSimilar || filteredPopular.length > 0) && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">
            {hasSimilar ? 'Similar tracks' : 'Popular this week'}
          </h2>
          <div className="space-y-1">
            {hasSimilar
              ? filteredSimilar.map((item, i) => {
                  const t: TrackSummaryDto = {
                    id: item.trackId,
                    title: item.title,
                    durationMs: 0,
                    genre: item.genre,
                    coverUrl: item.coverUrl,
                    playCount: item.playCount,
                    status: 'PUBLISHED',
                    releaseDate: null,
                    artist: { id: '', name: '', avatarUrl: null },
                  };
                  return (
                    <TrackRow key={item.trackId} track={t} index={i} onAddToPlaylist={setAddTarget} />
                  );
                })
              : filteredPopular.map((t, i) => (
                  <TrackRow key={t.id} track={t} index={i} queue={filteredPopular} queueIndex={i} onAddToPlaylist={setAddTarget} />
                ))
            }
          </div>
        </div>
      )}
      </div>
      

      <AddToPlaylistDialog track={addTarget} onClose={() => setAddTarget(null)} />
    </div>
  );
}
