'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Library, Plus, ListMusic, Search, X, Music2, Disc3,
  PanelLeftClose, PanelLeftOpen, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getMyPlaylists, createPlaylist } from '@/lib/api/playlists';
import { getTracks } from '@/lib/api/tracks';
import { getMyArtist } from '@/lib/api/artists';
import { useAuthStore } from '@/stores/auth-store';
import { useDebounce } from '@/hooks/use-debounce';
import { storageUrl } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']),
});
type CreateFormValues = z.infer<typeof createSchema>;

interface LibraryPanelProps {
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
}

export function LibraryPanel({ isCollapsed, onCollapse, onExpand }: LibraryPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);

  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', description: '', visibility: 'PRIVATE' },
  });

  const { data: playlistsData, isLoading: loadingPlaylists } = useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => getMyPlaylists({ size: 50 }),
    enabled: !!user,
  });

  const { data: myTracksData } = useQuery({
    queryKey: ['my-tracks', user?.id],
    queryFn: () => getTracks({ userId: user?.id, size: 50 }),
    enabled: !!user?.id,
  });

  const { data: myArtist } = useQuery({
    queryKey: ['my-artist'],
    queryFn: () => getMyArtist(),
    enabled: !!user,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) => createPlaylist(values),
    onSuccess: (pl) => {
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      toast.success('Playlist created');
      setCreateDialogOpen(false);
      form.reset();
      router.push(`/playlists/${pl.id}`);
    },
    onError: () => toast.error('Failed to create playlist'),
  });

  const playlists = playlistsData?.content ?? [];
  const myTracks = myTracksData?.content ?? [];
  const myAlbums = myArtist?.albums ?? [];

  const q = debouncedSearch.toLowerCase();
  const isSearching = q.length > 0;

  const filteredPlaylists = isSearching
    ? playlists.filter((p) => p.name.toLowerCase().includes(q))
    : playlists;

  const filteredTracks = isSearching
    ? myTracks.filter((t) => t.title.toLowerCase().includes(q))
    : myTracks;

  const filteredAlbums = isSearching
    ? myAlbums.filter((a) => a.title.toLowerCase().includes(q))
    : myAlbums;

  return (
    <>
      <div className="h-full rounded-md bg-secondary overflow-y-auto">
        {isCollapsed ? (
          /* ── Collapsed: icon-strip mode ── */
          <div className="flex h-full flex-col items-center gap-1 border-r py-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onExpand}
                  className="group flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors"
                >
                  <Library className="h-4 w-4 group-hover:hidden text-sidebar-foreground" />
                  <PanelLeftOpen className="hidden h-4 w-4 group-hover:block text-sidebar-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Open Library</TooltipContent>
            </Tooltip>

            <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Add to Library</TooltipContent>
              </Tooltip>
              <PopoverContent side="right" align="start" className="w-44 p-1">
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => { setAddPopoverOpen(false); setCreateDialogOpen(true); }}
                >
                  <ListMusic className="h-4 w-4" />
                  Add new playlist
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => { setAddPopoverOpen(false); router.push('/upload'); }}
                >
                  <Upload className="h-4 w-4" />
                  Upload song
                </button>
              </PopoverContent>
            </Popover>

            <Separator className="my-1 w-6 bg-sidebar-border" />

            <ScrollArea className="flex-1 w-full">
              <div className="flex flex-col items-center gap-1 px-1 pb-4">
                {playlists.map((pl) => (
                  <Tooltip key={pl.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/playlists/${pl.id}`}
                        className={cn(
                          'relative h-8 w-8 shrink-0 overflow-hidden rounded-md block transition-colors',
                          pathname === `/playlists/${pl.id}` ? 'ring-2 ring-sidebar-ring' : 'hover:opacity-90'
                        )}
                      >
                        {pl.coverUrl ? (
                          <Image src={storageUrl(pl.coverUrl)!} alt={pl.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-sidebar-accent">
                            <ListMusic className="h-4 w-4 text-sidebar-accent-foreground" />
                          </div>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{pl.name}</TooltipContent>
                  </Tooltip>
                ))}
                {myAlbums.map((album) => (
                  <Tooltip key={album.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/album/${album.id}`}
                        className={cn(
                          'relative h-8 w-8 shrink-0 overflow-hidden rounded-md block transition-colors',
                          pathname === `/album/${album.id}` ? 'ring-2 ring-sidebar-ring' : 'hover:opacity-90'
                        )}
                      >
                        {album.coverUrl ? (
                          <Image src={storageUrl(album.coverUrl) ?? ''} alt={album.title} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-sidebar-accent">
                            <Disc3 className="h-4 w-4 text-sidebar-accent-foreground" />
                          </div>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{album.title}</TooltipContent>
                  </Tooltip>
                ))}
                {myTracks.map((t) => (
                  <Tooltip key={t.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/track/${t.id}`}
                        className={cn(
                          'relative h-8 w-8 shrink-0 overflow-hidden rounded-md block transition-colors',
                          pathname === `/track/${t.id}` ? 'ring-2 ring-sidebar-ring' : 'hover:opacity-90'
                        )}
                      >
                        {t.coverUrl ? (
                          <Image src={storageUrl(t.coverUrl)!} alt={t.title} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-sidebar-accent">
                            <Music2 className="h-4 w-4 text-sidebar-accent-foreground" />
                          </div>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{t.title}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* ── Expanded mode ── */
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="group flex shrink-0 items-center justify-between border-b border-sidebar-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Library className="h-4 w-4 text-sidebar-foreground/70" />
                <span className="text-sm font-semibold text-sidebar-foreground">Your Library</span>
              </div>
              <div className="flex items-center gap-1">
                <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Add to Library</TooltipContent>
                  </Tooltip>
                  <PopoverContent align="end" className="w-44 p-1">
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      onClick={() => { setAddPopoverOpen(false); setCreateDialogOpen(true); }}
                    >
                      <ListMusic className="h-4 w-4" />
                      Add new playlist
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      onClick={() => { setAddPopoverOpen(false); router.push('/upload'); }}
                    >
                      <Upload className="h-4 w-4" />
                      Upload song
                    </button>
                  </PopoverContent>
                </Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-foreground hover:bg-sidebar-accent"
                      onClick={onCollapse}
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Close Library</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Search bar */}
            <div className="shrink-0 px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search library..."
                  className="h-8 pl-8 pr-7 text-xs rounded-full border-0 bg-sidebar-accent focus-visible:ring-1 focus-visible:ring-sidebar-ring"
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-0.5 p-2 pb-24">
                {/* Loading skeletons */}
                {loadingPlaylists && Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md p-2">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}

                {/* ── Playlists ── */}
                {!loadingPlaylists && (
                  <>
                    {filteredPlaylists.length === 0 && !isSearching && (
                      <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                        <ListMusic className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No playlists yet</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs"
                          onClick={() => setCreateDialogOpen(true)}
                        >
                          Create one
                        </Button>
                      </div>
                    )}
                    {(!isSearching || filteredPlaylists.length > 0) && (
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                        My Playlists
                      </p>
                    )}
                    {filteredPlaylists.map((pl) => (
                      <Link
                        key={pl.id}
                        href={`/playlists/${pl.id}`}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent',
                          pathname === `/playlists/${pl.id}` && 'bg-sidebar-accent'
                        )}
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                          {pl.coverUrl ? (
                            <Image src={storageUrl(pl.coverUrl)!} alt={pl.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-sidebar-accent">
                              <ListMusic className="h-4 w-4 text-sidebar-accent-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">{pl.name}</p>
                          <p className="text-xs text-sidebar-foreground/60">
                            Playlist · {pl.trackCount} {pl.trackCount === 1 ? 'song' : 'songs'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                {/* ── My Albums ── */}
                {filteredAlbums.length > 0 && (
                  <>
                    <Separator className="my-2 bg-sidebar-border" />
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                      My Albums
                    </p>
                    {filteredAlbums.map((album) => (
                      <Link
                        key={album.id}
                        href={`/album/${album.id}`}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent',
                          pathname === `/album/${album.id}` && 'bg-sidebar-accent'
                        )}
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                          {album.coverUrl ? (
                            <Image src={storageUrl(album.coverUrl) ?? ''} alt={album.title} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-sidebar-accent">
                              <Disc3 className="h-4 w-4 text-sidebar-accent-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">{album.title}</p>
                          <p className="text-xs text-sidebar-foreground/60">
                            Album · {album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'Unknown year'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                {/* ── My Tracks ── */}
                {myTracks.length > 0 && (
                  <>
                    <Separator className="my-2 bg-sidebar-border" />
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                      My Tracks
                    </p>
                    {filteredTracks.map((t) => (
                      <Link
                        key={t.id}
                        href={`/track/${t.id}`}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent',
                          pathname === `/track/${t.id}` && 'bg-sidebar-accent'
                        )}
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                          {t.coverUrl ? (
                            <Image src={storageUrl(t.coverUrl)!} alt={t.title} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-sidebar-accent">
                              <Music2 className="h-4 w-4 text-sidebar-accent-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">{t.title}</p>
                          <p className="text-xs text-sidebar-foreground/60">Song</p>
                        </div>
                      </Link>
                    ))}
                    {isSearching && filteredTracks.length === 0 && myTracks.length > 0 && (
                      <p className="px-2 py-1 text-xs text-muted-foreground">No tracks match</p>
                    )}
                  </>
                )}

                {isSearching && filteredPlaylists.length === 0 && filteredTracks.length === 0 && filteredAlbums.length === 0 && (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No results</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Create Playlist Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) form.reset(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Playlist</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="My playlist" autoFocus {...field} /></FormControl>
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
    </>
  );
}
