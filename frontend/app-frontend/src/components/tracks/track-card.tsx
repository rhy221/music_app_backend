'use client';

import Link from 'next/link';
import { Play, MoreHorizontal, ListPlus, CheckCircle2 } from 'lucide-react';
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
import { useMyPlaylistTrackIds } from '@/hooks/use-in-playlist';
import type { TrackSummaryDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: TrackSummaryDto;
  queue?: TrackSummaryDto[];
  queueIndex?: number;
  onAddToPlaylist?: (track: TrackSummaryDto) => void;
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function TrackCard({ track, queue, queueIndex = 0, onAddToPlaylist }: TrackCardProps) {
  const { play } = usePlayer();
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex]);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrack?.id === track.id;
  const inPlaylistIds = useMyPlaylistTrackIds();
  const isInPlaylist = inPlaylistIds.has(track.id);

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-xl p-4 transition-colors hover:bg-accent',
        isActive && 'bg-accent'
      )}
    >
      <div className="relative">
        <CoverImage
          src={track.coverUrl}
          alt={track.title}
          className="aspect-square w-full rounded-lg"
        />
        <Button
          variant="default"
          size="icon"
          className="absolute bottom-2 right-2 h-12 w-12 rounded-full opacity-0 shadow-xl transition-opacity group-hover:opacity-100"
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
      <div className="mt-3 flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <Link href={`/track/${track.id}`} className="block truncate text-base font-semibold hover:underline">
            <span className={cn(isActive && 'text-primary')}>{track.title}</span>
          </Link>
          <Link
            href={`/artist/${track.artist.id}`}
            className="block truncate text-sm text-muted-foreground hover:underline"
          >
            {track.artist.name}
          </Link>
          <p className="mt-0.5 text-sm text-muted-foreground">{formatMs(track.durationMs)}</p>
        </div>
        {isInPlaylist && (
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        )}
        {onAddToPlaylist && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddToPlaylist(track)}>
                <ListPlus className="mr-2 h-4 w-4" />
                Add to playlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
