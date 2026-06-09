'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Library, Lock, Globe, Link2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyPlaylists, createPlaylist } from '@/lib/api/playlists';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']),
});
type FormValues = z.infer<typeof schema>;

const VisibilityIcon = {
  PRIVATE: Lock,
  PUBLIC: Globe,
  UNLISTED: Link2,
};

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m >= 60) return `${Math.floor(m / 60)} hr ${m % 60} min`;
  return `${m} min`;
}

export default function PlaylistsPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => getMyPlaylists({ size: 50 }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', visibility: 'PRIVATE' },
  });

  const createMutation = useMutation({
    mutationFn: createPlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setOpen(false);
      form.reset();
      toast.success('Playlist created');
    },
    onError: () => toast.error('Failed to create playlist'),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Playlists</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create playlist</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="My playlist" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Optional description" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PRIVATE">Private</SelectItem>
                          <SelectItem value="PUBLIC">Public</SelectItem>
                          <SelectItem value="UNLISTED">Unlisted</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Create
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : data?.content.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Library className="h-16 w-16 text-muted-foreground" />
          <p className="text-muted-foreground">No playlists yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.content.map((playlist) => {
            const Icon = VisibilityIcon[playlist.visibility];
            return (
              <Link key={playlist.id} href={`/playlists/${playlist.id}`}>
                <Card className="cursor-pointer hover:bg-accent transition-colors">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-primary/20">
                      <Library className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{playlist.name}</p>
                      {playlist.description && (
                        <p className="truncate text-sm text-muted-foreground">{playlist.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {playlist.trackCount} tracks · {formatMs(playlist.totalDurationMs)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="gap-1 flex-shrink-0">
                      <Icon className="h-3 w-3" />
                      {playlist.visibility.toLowerCase()}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
