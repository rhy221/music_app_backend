'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, MoreHorizontal, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlaylist, deletePlaylist, removeTrackFromPlaylist, updatePlaylist } from '@/lib/api/playlists';
import { usePlayer } from '@/hooks/use-player';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { TrackSummaryDto } from '@/lib/api/types';

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  return `${m} min`;
}

export default function PlaylistDetailPage({ params }: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = use(params);
  const { play } = usePlayer();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');

  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => getPlaylist(playlistId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlaylist(playlistId),
    onSuccess: () => {
      router.push('/playlists');
      toast.success('Playlist deleted');
    },
  });

  const removeTrackMutation = useMutation({
    mutationFn: (itemId: string) => removeTrackFromPlaylist(playlistId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      toast.success('Track removed');
    },
  });

  const editMutation = useMutation({
    mutationFn: () => updatePlaylist(playlistId, { name: editName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      setEditOpen(false);
      toast.success('Playlist updated');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-40 rounded-lg" />
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  if (!playlist) return <div className="text-muted-foreground">Playlist not found.</div>;

  const tracksAsSummary: TrackSummaryDto[] = playlist.items.map((item) => ({
    id: item.trackId,
    title: item.trackTitle,
    durationMs: item.trackDuration,
    genre: null,
    coverUrl: item.trackCoverUrl,
    playCount: 0,
    status: 'PUBLISHED' as const,
    releaseDate: null,
    artist: { id: '', name: item.artistName, avatarUrl: null },
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="flex h-40 w-40 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20 shadow-2xl">
          <span className="text-5xl">🎵</span>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Playlist</p>
          <h1 className="mt-1 text-4xl font-black">{playlist.name}</h1>
          {playlist.description && (
            <p className="mt-1 text-sm text-muted-foreground">{playlist.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{playlist.visibility.toLowerCase()}</Badge>
            <span>{playlist.trackCount} tracks</span>
            <span>·</span>
            <span>{formatMs(playlist.totalDurationMs)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {tracksAsSummary.length > 0 && (
          <Button onClick={() => play(tracksAsSummary, 0)} size="lg" className="gap-2">
            <Play className="h-5 w-5 fill-current" />
            Play
          </Button>
        )}
        {playlist.isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => { setEditName(playlist.name); setEditOpen(true); }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete playlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tracks */}
      <div className="space-y-1">
        {playlist.items.map((item, i) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
          >
            <span className="flex w-8 items-center justify-center text-sm text-muted-foreground">
              {i + 1}
            </span>
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
              {item.trackCoverUrl && (
                <img src={item.trackCoverUrl} alt={item.trackTitle} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.trackTitle}</p>
              <p className="truncate text-xs text-muted-foreground">{item.artistName}</p>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatMs(item.trackDuration)}
            </span>
            {playlist.canEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => removeTrackMutation.mutate(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {playlist.items.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No tracks yet. Browse music and add tracks to this playlist!
          </p>
        )}
      </div>

      {/* Collaborators */}
      {playlist.collaborators.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Collaborators</h2>
          <div className="flex flex-wrap gap-3">
            {playlist.collaborators.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={c.avatarUrl ?? undefined} />
                  <AvatarFallback>{c.displayName[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{c.displayName}</span>
                <Badge variant="outline" className="text-xs">{c.role.toLowerCase()}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Playlist name"
            />
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending || !editName.trim()}
              className="w-full"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
