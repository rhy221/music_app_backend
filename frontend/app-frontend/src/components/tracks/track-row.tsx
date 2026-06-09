'use client';

import Link from 'next/link';
import { Play, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CoverImage } from '@/components/common/cover-image';
import { usePlayerStore } from '@/stores/player-store';
import { usePlayer } from '@/hooks/use-player';
import type { TrackSummaryDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface TrackRowProps {
  track: TrackSummaryDto;
  index?: number;
  queue?: TrackSummaryDto[];
  queueIndex?: number;
  onAddToPlaylist?: (track: TrackSummaryDto) => void;
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function TrackRow({ track, index, queue, queueIndex = 0, onAddToPlaylist }: TrackRowProps) {
  const { play } = usePlayer();
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex]);
  const isActive = currentTrack?.id === track.id;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent',
        isActive && 'bg-accent/60'
      )}
    >
      <div className="flex w-8 items-center justify-center">
        <button
          className="hidden group-hover:block"
          onClick={() => play(queue ?? [track], queueIndex)}
        >
          <Play className="h-4 w-4 text-foreground" />
        </button>
        <span className={cn('block text-sm text-muted-foreground group-hover:hidden', isActive && 'text-primary')}>
          {index != null ? index + 1 : <Play className="h-4 w-4" />}
        </span>
      </div>

      <CoverImage
        src={track.coverUrl}
        alt={track.title}
        className="h-10 w-10 flex-shrink-0 rounded"
        sizes="40px"
      />

      <div className="min-w-0 flex-1">
        <Link
          href={`/track/${track.id}`}
          className={cn('block truncate text-sm font-medium hover:underline', isActive && 'text-primary')}
        >
          {track.title}
        </Link>
        <Link
          href={`/artist/${track.artist.id}`}
          className="block truncate text-xs text-muted-foreground hover:underline"
        >
          {track.artist.name}
        </Link>
      </div>

      <span className="text-xs tabular-nums text-muted-foreground">{formatMs(track.durationMs)}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => play(queue ?? [track], queueIndex)}>
            Play now
          </DropdownMenuItem>
          <DropdownMenuItem>Add to queue</DropdownMenuItem>
          {onAddToPlaylist && (
            <DropdownMenuItem onClick={() => onAddToPlaylist(track)}>
              Add to playlist
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/artist/${track.artist.id}`}>Go to artist</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
