'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Play, Pause, GripVertical, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { getSavedTracks, reorderSavedTracks } from '@/lib/api/library';
import { usePlayer } from '@/hooks/use-player';
import { usePlayerStore } from '@/stores/player-store';
import { useAuthStore } from '@/stores/auth-store';
import { storageUrl } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TrackSummaryDto } from '@/lib/api/types';

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtTotal(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m >= 60) return `${Math.floor(m / 60)} hr ${m % 60} min`;
  return `${m} min`;
}

export default function LikedSongsPage() {
  const user = useAuthStore((s) => s.user);
  const { play, togglePlay } = usePlayer();
  const queryClient = useQueryClient();
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id);
  const isGlobalPlaying = usePlayerStore((s) => s.isPlaying);
  const [addTarget, setAddTarget] = useState<TrackSummaryDto | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['saved-tracks'],
    queryFn: () => getSavedTracks({ size: 200 }),
    enabled: !!user,
  });

  const savedTracks = (data?.content ?? []).filter((t) => !t.deleted);

  const reorderMutation = useMutation({
    mutationFn: (trackIds: string[]) => reorderSavedTracks(trackIds),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-tracks'] });
      toast.error('Failed to reorder tracks');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-tracks'] }),
  });

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const ids = savedTracks.map((t) => t.trackId);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    const newIds = [...ids];
    newIds.splice(from, 1);
    newIds.splice(to, 0, draggedId);

    const newTracks = [...savedTracks];
    const [moved] = newTracks.splice(from, 1);
    newTracks.splice(to, 0, moved);
    queryClient.setQueryData(['saved-tracks'], (old: typeof data) =>
      old ? { ...old, content: newTracks } : old
    );

    reorderMutation.mutate(newIds);
  };

  const tracksAsSummary: TrackSummaryDto[] = savedTracks.map((t) => ({
    id: t.trackId,
    title: t.trackTitle,
    durationMs: t.durationMs ?? 0,
    genre: null,
    coverUrl: t.coverUrl,
    playCount: 0,
    status: 'PUBLISHED' as const,
    releaseDate: null,
    artist: { id: t.artistId, name: t.artistName, avatarUrl: null, userId: null },
  }));

  const totalMs = savedTracks.reduce((acc, t) => acc + (t.durationMs ?? 0), 0);
  const isContextActive = tracksAsSummary.some((t) => t.id === currentTrackId);
  const isContextPlaying = isContextActive && isGlobalPlaying;

  return (
    <div className="h-full">
      {/* Hero */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end p-6 bg-gradient-to-b from-primary/20 to-transparent">
        <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/40 to-primary/10 shadow-2xl">
          <Heart className="h-24 w-24 fill-current text-primary" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Playlist</p>
          <h1 className="mt-1 text-6xl font-black">Liked Songs</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground font-bold">
            <span>{savedTracks.length} {savedTracks.length === 1 ? 'song' : 'songs'}</span>
            {totalMs > 0 && <><span>·</span><span>{fmtTotal(totalMs)}</span></>}
          </div>
          <div className="mt-4">
            <Button
              onClick={() => isContextActive ? togglePlay() : play(tracksAsSummary, 0)}
              className="gap-2"
              size="lg"
              disabled={savedTracks.length === 0}
            >
              {isContextPlaying
                ? <><Pause className="h-5 w-5 fill-current" />Pause</>
                : <><Play className="h-5 w-5 fill-current" />Play all</>
              }
            </Button>
          </div>
        </div>
      </div>

      <div
        className="p-6 space-y-4 min-h-64"
        style={{ background: 'linear-gradient(to bottom, rgba(31,31,31,0.3) 0%, rgba(31,31,31,0.65) 60%, rgba(31,31,31,1) 100%)' }}
      >
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && savedTracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-semibold">Songs you like will appear here</p>
            <p className="mt-1 text-sm text-muted-foreground">Press the heart icon on any track to save it here</p>
          </div>
        )}

        {!isLoading && savedTracks.length > 0 && (
          <>
            {/* Column header */}
            <div className="flex items-center gap-3 border-b border-border/40 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="w-5 shrink-0" />
              <span className="w-8 text-center shrink-0">#</span>
              <span className="w-10 shrink-0" />
              <span className="min-w-0 flex-1">Title</span>
              <span className="flex items-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <span className="w-8 shrink-0" />
            </div>

            <div className="space-y-1">
              {savedTracks.map((t, i) => {
                const isActive = currentTrackId === t.trackId;
                const isPlaying = isActive && isGlobalPlaying;
                const isDragOver = dragOverId === t.trackId;
                const summary = tracksAsSummary[i];
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDraggedId(t.trackId)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(t.trackId); }}
                    onDrop={() => { handleDrop(t.trackId); setDraggedId(null); setDragOverId(null); }}
                    onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                    className={cn(
                      'group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent',
                      isActive && 'bg-accent/60',
                      isDragOver && draggedId !== t.trackId && 'border-t-2 border-primary',
                      draggedId === t.trackId && 'opacity-50'
                    )}
                    onClick={() => isActive ? togglePlay() : play(tracksAsSummary, i)}
                  >
                    {/* Drag handle */}
                    <div
                      className="w-5 shrink-0 cursor-grab opacity-0 group-hover:opacity-60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Index / play */}
                    <div className="flex w-8 shrink-0 items-center justify-center">
                      {isPlaying ? (
                        <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-primary">
                          <Pause className="h-4 w-4 fill-current" />
                        </button>
                      ) : (
                        <>
                          <Play className={cn('hidden h-4 w-4 fill-current group-hover:block', isActive ? 'text-primary' : 'text-foreground')} />
                          <span className={cn('block text-sm group-hover:hidden', isActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                            {i + 1}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Cover */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                      {t.coverUrl && (
                        <img src={storageUrl(t.coverUrl) ?? ''} alt={t.trackTitle} className="h-full w-full object-cover" />
                      )}
                    </div>

                    {/* Title + artist */}
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/track/${t.trackId}`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn('block truncate text-sm font-medium hover:underline', isActive && 'text-primary')}
                      >
                        {t.trackTitle}
                      </a>
                      {t.artistId ? (
                        <a
                          href={`/artist/${t.artistId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate text-xs text-muted-foreground hover:underline"
                        >
                          {t.artistName}
                        </a>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">{t.artistName}</p>
                      )}
                    </div>

                    {/* Duration */}
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {t.durationMs ? fmtDuration(t.durationMs) : '—'}
                    </span>

                    {/* Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); isActive ? togglePlay() : play(tracksAsSummary, i); }}>
                          {isPlaying ? 'Pause' : 'Play now'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAddTarget(summary); }}>
                          Add to playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/artist/${t.artistId}`}>Go to artist</a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <AddToPlaylistDialog track={addTarget} onClose={() => setAddTarget(null)} />
    </div>
  );
}
