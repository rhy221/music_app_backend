'use client';

import Link from 'next/link';
import { Play, Pause, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CoverImage } from '@/components/common/cover-image';
import { SaveTrackButton } from '@/components/tracks/save-track-button';
import { usePlayerStore } from '@/stores/player-store';
import { usePlayer } from '@/hooks/use-player';
import { useMyPlaylistTrackIds } from '@/hooks/use-in-playlist';
import type { TrackSummaryDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface SearchTrackCardProps {
  track: TrackSummaryDto;
  queue?: TrackSummaryDto[];
  queueIndex?: number;
  onAddToPlaylist?: (track: TrackSummaryDto) => void;
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function SearchTrackCard({ track, queue, queueIndex = 0, onAddToPlaylist }: SearchTrackCardProps) {
  const { play, togglePlay } = usePlayer();
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id);
  const isGlobalPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrackId === track.id;
  const isThisPlaying = isActive && isGlobalPlaying;
  const inPlaylistIds = useMyPlaylistTrackIds();
  const isInPlaylist = inPlaylistIds.has(track.id);

  const handlePlayPause = () => {
    if (isActive) {
      togglePlay();
    } else {
      play(queue ?? [track], queueIndex);
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-md px-3 py-3 hover:bg-accent transition-colors',
        isActive && 'bg-accent/60'
      )}
    >
      {/* Play button */}
      <button
        onClick={handlePlayPause}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:text-primary"
      >
        {isThisPlaying ? (
          <Pause className="h-5 w-5 fill-current text-primary" />
        ) : (
          <>
            <Play className={cn('hidden h-5 w-5 fill-current group-hover:block', isActive ? 'text-primary' : 'text-foreground')} />
            <Play className={cn('h-5 w-5 fill-current group-hover:hidden', isActive ? 'text-primary' : 'text-muted-foreground')} />
          </>
        )}
      </button>

      <CoverImage
        src={track.coverUrl}
        alt={track.title}
        className="h-16 w-16 shrink-0 rounded-md"
        sizes="64px"
      />

      <div className="min-w-0 flex-1">
        <Link
          href={`/track/${track.id}`}
          className={cn('block truncate text-base font-semibold hover:underline', isActive && 'text-primary')}
        >
          {track.title}
        </Link>
        <Link
          href={`/artist/${track.artist.id}`}
          className="block truncate text-sm text-muted-foreground hover:underline"
        >
          {track.artist.name}
        </Link>
        {track.genre && (
          <span className="text-xs text-muted-foreground/70">{track.genre}</span>
        )}
      </div>

      <span className="text-sm tabular-nums text-muted-foreground">{formatMs(track.durationMs)}</span>

      {isInPlaylist && (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
      )}

      <SaveTrackButton trackId={track.id} className="opacity-0 group-hover:opacity-100" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePlayPause}>
            {isThisPlaying ? 'Pause' : 'Play now'}
          </DropdownMenuItem>
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
