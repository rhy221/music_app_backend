'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePlayerStore } from '@/stores/player-store';
import { usePlayer } from '@/hooks/use-player';
import { cn } from '@/lib/utils';

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function PlayerBar() {
  const store = usePlayerStore();
  const { togglePlay, seek, setVolume } = usePlayer();
  const currentTrack = store.queue[store.currentIndex];

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 border-t bg-card/95 backdrop-blur" />
    );
  }

  const RepeatIcon = store.repeat === 'one' ? Repeat1 : Repeat;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center gap-4 border-t bg-card/95 px-4 backdrop-blur">
      {/* Track info */}
      <div className="flex w-[240px] min-w-0 items-center gap-3">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded">
          {currentTrack.coverUrl ? (
            <Image
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>
        <div className="min-w-0">
          <Link
            href={`/track/${currentTrack.id}`}
            className="block truncate text-sm font-medium hover:underline"
          >
            {currentTrack.title}
          </Link>
          <Link
            href={`/artist/${currentTrack.artist.id}`}
            className="block truncate text-xs text-muted-foreground hover:underline"
          >
            {currentTrack.artist.name}
          </Link>
        </div>
      </div>

      {/* Player controls */}
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={store.toggleShuffle}
                className={cn(store.shuffle && 'text-primary')}
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shuffle</TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="icon" onClick={store.prev}>
            <SkipBack className="h-5 w-5" />
          </Button>

          <Button
            variant="default"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={togglePlay}
          >
            {store.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" />
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={store.next}>
            <SkipForward className="h-5 w-5" />
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={store.cycleRepeat}
                className={cn(store.repeat !== 'none' && 'text-primary')}
              >
                <RepeatIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Repeat {store.repeat === 'none' ? 'off' : store.repeat}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex w-full max-w-md items-center gap-2">
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {formatMs(store.positionMs)}
          </span>
          <Slider
            className="flex-1"
            min={0}
            max={store.durationMs || 100}
            step={1000}
            value={[store.positionMs]}
            onValueChange={([v]) => seek(v)}
          />
          <span className="w-10 text-xs tabular-nums text-muted-foreground">
            {formatMs(store.durationMs)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex w-[200px] items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setVolume(store.volume > 0 ? 0 : 0.8)}
        >
          {store.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Slider
          className="w-24"
          min={0}
          max={1}
          step={0.01}
          value={[store.volume]}
          onValueChange={([v]) => setVolume(v)}
        />
      </div>
    </div>
  );
}
