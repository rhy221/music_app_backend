'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Loader2, ListMusic } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getMyPlaylists,
  addTrackToPlaylist,
  createPlaylist,
  getPlaylistsContainingTrack,
  removeTrackFromPlaylistByTrackId,
} from '@/lib/api/playlists';
import { toast } from 'sonner';
import type { TrackSummaryDto } from '@/lib/api/types';

interface AddToPlaylistDialogProps {
  track: TrackSummaryDto | null;
  onClose: () => void;
}

export function AddToPlaylistDialog({ track, onClose }: AddToPlaylistDialogProps) {
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-playlists-picker'],
    queryFn: () => getMyPlaylists({ size: 50 }),
    enabled: !!track,
  });

  const { data: containingIds } = useQuery({
    queryKey: ['containing-track', track?.id],
    queryFn: () => getPlaylistsContainingTrack(track!.id),
    enabled: !!track,
  });

  const containingSet = new Set(containingIds ?? []);

  function invalidateRelated() {
    queryClient.invalidateQueries({ queryKey: ['containing-track', track?.id] });
    queryClient.invalidateQueries({ queryKey: ['my-track-ids'] });
    queryClient.invalidateQueries({ queryKey: ['my-playlists-picker'] });
  }

  const addMutation = useMutation({
    mutationFn: (playlistId: string) =>
      addTrackToPlaylist(playlistId, { trackId: track!.id }),
    onSuccess: () => { toast.success('Added to playlist'); invalidateRelated(); },
    onError: () => toast.error('Failed to add to playlist'),
  });

  const removeMutation = useMutation({
    mutationFn: (playlistId: string) =>
      removeTrackFromPlaylistByTrackId(playlistId, track!.id),
    onSuccess: () => { toast.success('Removed from playlist'); invalidateRelated(); },
    onError: () => toast.error('Failed to remove from playlist'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const pl = await createPlaylist({ name: newName.trim() });
      await addTrackToPlaylist(pl.id, { trackId: track!.id });
      return pl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      invalidateRelated();
      toast.success('Playlist created and track added');
      setShowCreate(false);
      setNewName('');
    },
    onError: () => toast.error('Failed to create playlist'),
  });

  function handleOpenChange(open: boolean) {
    if (!open) {
      setShowCreate(false);
      setNewName('');
      onClose();
    }
  }

  function handlePlaylistClick(playlistId: string) {
    if (containingSet.has(playlistId)) {
      removeMutation.mutate(playlistId);
    } else {
      addMutation.mutate(playlistId);
    }
  }

  const isMutating = addMutation.isPending || removeMutation.isPending;

  return (
    <Dialog open={!!track} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to playlist</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-60">
            <div className="space-y-0.5 pr-2">
              {data?.content.map((pl) => {
                const isInPlaylist = containingSet.has(pl.id);
                return (
                  <button
                    key={pl.id}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                    onClick={() => handlePlaylistClick(pl.id)}
                    disabled={isMutating}
                  >
                    <ListMusic className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">{pl.name}</span>
                    {isInPlaylist ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{pl.trackCount}</span>
                    )}
                  </button>
                );
              })}
              {data?.content.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No playlists yet.
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="border-t pt-3">
          {showCreate ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Playlist name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) createMutation.mutate();
                  if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
                }}
              />
              <Button
                size="icon"
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Check className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full gap-2 text-sm"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              New playlist
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
