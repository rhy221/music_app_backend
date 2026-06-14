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
import { updateAlbum } from '@/lib/api/albums';
import type { AlbumDetailDto } from '@/lib/api/types';

interface Props {
  album: AlbumDetailDto;
  open: boolean;
  onClose: () => void;
}

export function EditAlbumDialog({ album, open, onClose }: Props) {
  const [title, setTitle] = useState(album.title);
  const [coverUrl, setCoverUrl] = useState(album.coverUrl ?? '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      updateAlbum(album.id, {
        title: title || undefined,
        coverUrl: coverUrl || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album', album.id] });
      toast.success('Album updated');
      onClose();
    },
    onError: () => toast.error('Failed to update album'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit album</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="album-title">Title</Label>
            <Input
              id="album-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="album-cover">Cover URL</Label>
            <Input
              id="album-cover"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
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
