'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoverImage } from '@/components/common/cover-image';
import { usePlayerStore } from '@/stores/player-store';
import { usePlayer } from '@/hooks/use-player';
import type { TrackSummaryDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: TrackSummaryDto;
  queue?: TrackSummaryDto[];
  queueIndex?: number;
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function TrackCard({ track, queue, queueIndex = 0 }: TrackCardProps) {
  const { play } = usePlayer();
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex]);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrack?.id === track.id;

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg p-3 transition-colors hover:bg-accent',
        isActive && 'bg-accent'
      )}
    >
      <div className="relative">
        <CoverImage
          src={track.coverUrl}
          alt={track.title}
          className="aspect-square w-full rounded-md"
        />
        <Button
          variant="default"
          size="icon"
          className="absolute bottom-2 right-2 h-10 w-10 rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            play(queue ?? [track], queueIndex);
          }}
        >
          {isActive && isPlaying ? (
            <span className="flex gap-0.5">
              <span className="h-3 w-1 animate-[bounce_0.6s_ease-in-out_infinite] rounded-full bg-primary-foreground" />
              <span className="h-3 w-1 animate-[bounce_0.6s_ease-in-out_0.2s_infinite] rounded-full bg-primary-foreground" />
              <span className="h-3 w-1 animate-[bounce_0.6s_ease-in-out_0.4s_infinite] rounded-full bg-primary-foreground" />
            </span>
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" />
          )}
        </Button>
      </div>
      <Link href={`/track/${track.id}`} className="mt-2 block">
        <p className={cn('truncate text-sm font-medium', isActive && 'text-primary')}>
          {track.title}
        </p>
      </Link>
      <Link
        href={`/artist/${track.artist.id}`}
        className="block truncate text-xs text-muted-foreground hover:underline"
      >
        {track.artist.name}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">{formatMs(track.durationMs)}</p>
    </div>
  );
}
