'use client';

import { Heart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { isTrackSaved, saveTrack, unsaveTrack } from '@/lib/api/library';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

interface SaveTrackButtonProps {
  trackId: string;
  className?: string;
  buttonSize?: 'icon-sm' | 'icon';
  iconClassName?: string;
}

export function SaveTrackButton({ trackId, className, buttonSize = 'icon-sm', iconClassName }: SaveTrackButtonProps) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['track-saved', trackId],
    queryFn: () => isTrackSaved(trackId),
    enabled: !!user,
    staleTime: 60_000,
  });
  const saved = data?.saved ?? false;

  const mutation = useMutation({
    mutationFn: async () => {
      queryClient.setQueryData(['track-saved', trackId], { saved: !saved });
      await (saved ? unsaveTrack(trackId) : saveTrack(trackId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-tracks'] });
      toast.success(saved ? 'Removed from Liked Songs' : 'Added to Liked Songs');
    },
    onError: () => {
      queryClient.setQueryData(['track-saved', trackId], { saved });
      toast.error('Failed to update library');
    },
  });

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size={buttonSize}
      className={className}
      onClick={(e) => { e.stopPropagation(); mutation.mutate(); }}
      disabled={mutation.isPending}
      title={saved ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
    >
      <Heart className={iconClassName ?? `h-4 w-4 ${saved ? 'fill-current text-primary' : 'text-muted-foreground'}`} />
    </Button>
  );
}
