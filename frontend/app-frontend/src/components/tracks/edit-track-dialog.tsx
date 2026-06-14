'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateTrack } from '@/lib/api/tracks';
import type { TrackDetailDto } from '@/lib/api/types';

interface Props {
  track: TrackDetailDto;
  open: boolean;
  onClose: () => void;
}

export function EditTrackDialog({ track, open, onClose }: Props) {
  const [title, setTitle] = useState(track.title);
  const [genre, setGenre] = useState(track.genre ?? '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      updateTrack(track.id, {
        title: title || undefined,
        genre: genre || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track', track.id] });
      toast.success('Track updated');
      onClose();
    },
    onError: () => toast.error('Failed to update track'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit track</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="track-title">Title</Label>
            <Input
              id="track-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="track-genre">Genre</Label>
            <Input
              id="track-genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
