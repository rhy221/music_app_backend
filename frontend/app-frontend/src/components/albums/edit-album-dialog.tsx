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
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => updateAlbum(album.id, { title: title || undefined }),
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
        <div className="py-2">
          <Label htmlFor="album-title">Title</Label>
          <Input
            id="album-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
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
