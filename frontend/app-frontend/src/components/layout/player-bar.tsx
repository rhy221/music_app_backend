'use client';

import { useState, useRef } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlayerStore } from '@/stores/player-store';
import { usePlayer } from '@/hooks/use-player';
import { cn } from '@/lib/utils';
import { storageUrl } from '@/lib/constants';

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function PlayerBar() {
  const store = usePlayerStore();
  const { togglePlay, seek, setVolume, changeBitrate } = usePlayer();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubMs, setScrubMs] = useState(0);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const currentTrack = store.queue[store.currentIndex];

  function msAtClientX(clientX: number): number {
    if (!seekBarRef.current || !store.durationMs) return 0;
    const { left, width } = seekBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round(ratio * store.durationMs);
  }

  function handleSeekPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ms = msAtClientX(e.clientX);
    setIsScrubbing(true);
    setScrubMs(ms);
  }

  function handleSeekPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isScrubbing) return;
    setScrubMs(msAtClientX(e.clientX));
  }

  function handleSeekPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isScrubbing) return;
    seek(msAtClientX(e.clientX));
    setIsScrubbing(false);
  }

  const displayMs = isScrubbing ? scrubMs : store.positionMs;
  const pct = store.durationMs > 0 ? Math.min(100, (displayMs / store.durationMs) * 100) : 0;

  if (!currentTrack) {
    return (
      <div className="h-20 shrink-0 border-t bg-card/95 backdrop-blur" />
    );
  }

  const RepeatIcon = store.repeat === 'one' ? Repeat1 : Repeat;

  return (
    <div className="flex h-20 shrink-0 items-center gap-4 border-t bg-card/95 px-4 backdrop-blur">
      {/* Track info */}
      <div className="flex w-[240px] min-w-0 items-center gap-3">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded">
          {currentTrack.coverUrl ? (
            <img
              src={storageUrl(currentTrack.coverUrl)!}
              alt={currentTrack.title}
              className="h-full w-full object-cover"
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

        {/* Seek bar */}
        <div className="flex w-full max-w-md items-center gap-2">
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {formatMs(displayMs)}
          </span>

          <div
            ref={seekBarRef}
            className="group relative flex h-4 flex-1 cursor-pointer items-center"
            onPointerDown={handleSeekPointerDown}
            onPointerMove={handleSeekPointerMove}
            onPointerUp={handleSeekPointerUp}
          >
            {/* Track */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/20 transition-[height] duration-150 group-hover:h-[5px]">
              {/* Filled range */}
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Thumb — shown on hover / while scrubbing */}
            <div
              className={cn(
                'pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-opacity duration-150',
                isScrubbing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              style={{ left: `${pct}%` }}
            />
          </div>

          <span className="w-10 text-xs tabular-nums text-muted-foreground">
            {formatMs(store.durationMs)}
          </span>
        </div>
      </div>

      {/* Volume + Quality */}
      <div className="flex w-[200px] items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="w-10 text-xs tabular-nums font-medium text-muted-foreground hover:text-foreground">
              {store.preferredBitrate}k
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-22.5">
            {([128, 256, 320] as const).map((b) => (
              <DropdownMenuItem
                key={b}
                onClick={() => changeBitrate(b)}
                className={cn('justify-between gap-3', store.preferredBitrate === b && 'text-primary font-medium')}
              >
                <span>{b} kbps</span>
                {store.preferredBitrate === b && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setVolume(store.volume > 0 ? 0 : 0.8)}
        >
          {store.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Slider
          className={cn(
            'w-24',
            '[&_[data-slot=slider-track]]:bg-white/20',
            '[&_[data-slot=slider-range]]:bg-white',
            '[&_[data-slot=slider-thumb]]:size-3',
            '[&_[data-slot=slider-thumb]]:border-transparent',
            '[&_[data-slot=slider-thumb]]:bg-white',
          )}
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
