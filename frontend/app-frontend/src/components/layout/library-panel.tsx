'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Library, Plus, ListMusic, Search, X, Music2, Disc3,
  PanelLeftClose, PanelLeftOpen, Upload, Heart,
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
import { getSavedAlbums, getFollowedPlaylists, getSavedTracks } from '@/lib/api/library';
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

  type TypeFilter = 'all' | 'playlist' | 'track' | 'album';
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [mineOnly, setMineOnly] = useState(false);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', description: '', visibility: 'PRIVATE' },
  });

  // ── Own content ─────────────────────────────────────────────────────────────

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

  // ── Library service (saved / followed) ──────────────────────────────────────

  const { data: savedAlbumsData } = useQuery({
    queryKey: ['saved-albums'],
    queryFn: () => getSavedAlbums({ size: 50 }),
    enabled: !!user,
  });

  const { data: followedPlaylistsData } = useQuery({
    queryKey: ['followed-playlists'],
    queryFn: () => getFollowedPlaylists({ size: 50 }),
    enabled: !!user,
  });

  const { data: savedTracksData } = useQuery({
    queryKey: ['saved-tracks'],
    queryFn: () => getSavedTracks({ size: 50 }),
    enabled: !!user,
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
  const savedAlbums = savedAlbumsData?.content ?? [];
  const followedPlaylists = followedPlaylistsData?.content ?? [];
  const savedTracks = (savedTracksData?.content ?? []).filter((t) => !t.deleted);

  const q = debouncedSearch.toLowerCase();
  const isSearching = q.length > 0;

  const filteredPlaylists = isSearching ? playlists.filter((p) => p.name.toLowerCase().includes(q)) : playlists;
  const filteredFollowed = isSearching ? followedPlaylists.filter((p) => p.playlistName.toLowerCase().includes(q)) : followedPlaylists;
  const filteredMyAlbums = isSearching ? myAlbums.filter((a) => a.title.toLowerCase().includes(q)) : myAlbums;
  const filteredSavedAlbums = isSearching ? savedAlbums.filter((a) => a.albumTitle.toLowerCase().includes(q)) : savedAlbums;
  const filteredMyTracks = isSearching ? myTracks.filter((t) => t.title.toLowerCase().includes(q)) : myTracks;
  const showLikedSongs = !isSearching || 'liked songs'.includes(q);

  // ── Filter visibility ────────────────────────────────────────────────────────
  const showPlaylists = typeFilter === 'all' || typeFilter === 'playlist';
  const showTracks    = typeFilter === 'all' || typeFilter === 'track';
  const showAlbums    = typeFilter === 'all' || typeFilter === 'album';
  const showHeaders   = typeFilter === 'all';

  const visibleMyPlaylists  = showPlaylists ? filteredPlaylists : [];
  const visibleFollowed     = showPlaylists && !mineOnly ? filteredFollowed : [];
  const visibleMyTracks     = showTracks ? filteredMyTracks : [];
  const visibleMyAlbums     = showAlbums ? filteredMyAlbums : [];
  const visibleSavedAlbums  = showAlbums && !mineOnly ? filteredSavedAlbums : [];
  const visibleLiked        = !!user && showTracks && !mineOnly && showLikedSongs;

  const hasAnyContent =
    visibleLiked ||
    visibleMyPlaylists.length > 0 ||
    visibleFollowed.length > 0 ||
    visibleMyTracks.length > 0 ||
    visibleMyAlbums.length > 0 ||
    visibleSavedAlbums.length > 0;

  // ── Collapsed icon strip ────────────────────────────────────────────────────

  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-1 border-r py-3 rounded-md bg-secondary overflow-y-auto">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Add to Library</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="start" className="w-44 p-1">
            <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors" onClick={() => { setAddPopoverOpen(false); setCreateDialogOpen(true); }}>
              <ListMusic className="h-4 w-4" /> Add new playlist
            </button>
            <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors" onClick={() => { setAddPopoverOpen(false); router.push('/upload'); }}>
              <Upload className="h-4 w-4" /> Upload song
            </button>
          </PopoverContent>
        </Popover>

        <Separator className="my-1 w-6 bg-sidebar-border" />

        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col items-center gap-1 px-1 pb-4">
            {playlists.map((pl) => (
              <Tooltip key={pl.id}>
                <TooltipTrigger asChild>
                  <Link href={`/playlists/${pl.id}`} className={cn('relative h-8 w-8 shrink-0 overflow-hidden rounded-md block transition-colors', pathname === `/playlists/${pl.id}` ? 'ring-2 ring-sidebar-ring' : 'hover:opacity-90')}>
                    {pl.coverUrl ? <Image src={storageUrl(pl.coverUrl) ?? ''} alt={pl.name} fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-sidebar-accent"><ListMusic className="h-4 w-4 text-sidebar-accent-foreground" /></div>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{pl.name}</TooltipContent>
              </Tooltip>
            ))}
            {followedPlaylists.map((pl) => (
              <Tooltip key={pl.id}>
                <TooltipTrigger asChild>
                  <Link href={`/playlists/${pl.playlistId}`} className={cn('relative h-8 w-8 shrink-0 overflow-hidden rounded-md block transition-colors', pathname === `/playlists/${pl.playlistId}` ? 'ring-2 ring-sidebar-ring' : 'hover:opacity-90')}>
                    {pl.coverUrl ? <Image src={storageUrl(pl.coverUrl) ?? ''} alt={pl.playlistName} fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-sidebar-accent"><Heart className="h-3 w-3 text-sidebar-accent-foreground" /></div>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{pl.playlistName}</TooltipContent>
              </Tooltip>
            ))}
            {myAlbums.map((album) => (
              <Tooltip key={album.id}>
                <TooltipTrigger asChild>
                  <Link href={`/album/${album.id}`} className={cn('relative h-8 w-8 shrink-0 overflow-hidden rounded-md block transition-colors', pathname === `/album/${album.id}` ? 'ring-2 ring-sidebar-ring' : 'hover:opacity-90')}>
                    {album.coverUrl ? <Image src={storageUrl(album.coverUrl) ?? ''} alt={album.title} fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-sidebar-accent"><Disc3 className="h-4 w-4 text-sidebar-accent-foreground" /></div>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{album.title}</TooltipContent>
              </Tooltip>
            ))}
            {savedAlbums.map((album) => (
              <Tooltip key={album.id}>
                <TooltipTrigger asChild>
                  <Link href={`/album/${album.albumId}`} className={cn('relative h-8 w-8 shrink-0 overflow-hidden rounded-md block transition-colors', pathname === `/album/${album.albumId}` ? 'ring-2 ring-sidebar-ring' : 'hover:opacity-90')}>
                    {album.coverUrl ? <Image src={storageUrl(album.coverUrl) ?? ''} alt={album.albumTitle} fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-sidebar-accent"><Disc3 className="h-4 w-4 text-sidebar-accent-foreground" /></div>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{album.albumTitle}</TooltipContent>
              </Tooltip>
            ))}
            {myTracks.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Link href={`/track/${t.id}`} className={cn('relative h-8 w-8 shrink-0 overflow-hidden rounded-md block transition-colors', pathname === `/track/${t.id}` ? 'ring-2 ring-sidebar-ring' : 'hover:opacity-90')}>
                    {t.coverUrl ? <Image src={storageUrl(t.coverUrl) ?? ''} alt={t.title} fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-sidebar-accent"><Music2 className="h-4 w-4 text-sidebar-accent-foreground" /></div>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{t.title}</TooltipContent>
              </Tooltip>
            ))}
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/library/liked" className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors', pathname === '/library/liked' ? 'bg-primary/30 ring-2 ring-sidebar-ring' : 'bg-primary/20 hover:bg-primary/30')}>
                    <Heart className="h-4 w-4 fill-current text-primary" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Liked Songs ({savedTracks.length})</TooltipContent>
              </Tooltip>
            )}
          </div>
        </ScrollArea>

        <CreatePlaylistDialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) form.reset(); }} form={form} onSubmit={(v) => createMutation.mutate(v)} isPending={createMutation.isPending} />
      </div>
    );
  }

  // ── Expanded mode ───────────────────────────────────────────────────────────

  // Only show "no results" when search/mine/type filter caused the empty state
  // (All tab + no search + no mine → inline empty state handles it instead)
  const noResults = !loadingPlaylists && !hasAnyContent && (isSearching || mineOnly || typeFilter !== 'all');

  return (
    <>
      <div className="h-full rounded-md bg-secondary overflow-y-auto">
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Add to Library</TooltipContent>
                </Tooltip>
                <PopoverContent align="end" className="w-44 p-1">
                  <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors" onClick={() => { setAddPopoverOpen(false); setCreateDialogOpen(true); }}>
                    <ListMusic className="h-4 w-4" /> Add new playlist
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors" onClick={() => { setAddPopoverOpen(false); router.push('/upload'); }}>
                    <Upload className="h-4 w-4" /> Upload song
                  </button>
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-foreground hover:bg-sidebar-accent" onClick={onCollapse}>
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close Library</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Filter pills */}
          <div className="shrink-0 flex gap-1 px-3 pt-2 pb-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(['all', 'playlist', 'track', 'album'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  typeFilter === f
                    ? 'bg-foreground text-background'
                    : 'bg-sidebar-accent text-sidebar-foreground hover:bg-muted-foreground/20'
                )}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
              </button>
            ))}
            <button
              onClick={() => setMineOnly((p) => !p)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                mineOnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-sidebar-accent text-sidebar-foreground hover:bg-muted-foreground/20'
              )}
            >
              Mine
            </button>
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
                <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery('')}>
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2 pb-24">

              {/* Loading skeleton */}
              {loadingPlaylists && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md p-2">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}

              {!loadingPlaylists && (showHeaders ? (
                /* ── All tab — sections with headers ─────────────────────────── */
                <>
                  {/* Liked Songs */}
                  {visibleLiked && (
                    <>
                      <LikedSongsEntry pathname={pathname} count={savedTracks.length} />
                      {(visibleMyPlaylists.length > 0 || visibleFollowed.length > 0 || visibleMyAlbums.length > 0 || visibleSavedAlbums.length > 0 || visibleMyTracks.length > 0) && (
                        <Separator className="my-2 bg-sidebar-border" />
                      )}
                    </>
                  )}

                  {/* Playlists section */}
                  {(visibleMyPlaylists.length > 0 || visibleFollowed.length > 0) ? (
                    <>
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">Playlists</p>
                      {visibleMyPlaylists.map((pl) => <PlaylistRow key={pl.id} href={`/playlists/${pl.id}`} active={pathname === `/playlists/${pl.id}`} cover={pl.coverUrl} name={pl.name} sub={`Playlist · ${pl.trackCount} ${pl.trackCount === 1 ? 'song' : 'songs'}`} icon={<ListMusic className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                      {visibleFollowed.map((pl) => <PlaylistRow key={pl.id} href={`/playlists/${pl.playlistId}`} active={pathname === `/playlists/${pl.playlistId}`} cover={pl.coverUrl} name={pl.playlistName} sub={`Playlist · ${pl.trackCount} ${pl.trackCount === 1 ? 'song' : 'songs'}`} icon={<Heart className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                    </>
                  ) : (!isSearching && !mineOnly && (
                    <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                      <ListMusic className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No playlists yet</p>
                      <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => setCreateDialogOpen(true)}>Create one</Button>
                    </div>
                  ))}

                  {/* Albums section */}
                  {(visibleMyAlbums.length > 0 || visibleSavedAlbums.length > 0) && (
                    <>
                      <Separator className="my-2 bg-sidebar-border" />
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">Albums</p>
                      {visibleMyAlbums.map((a) => <PlaylistRow key={a.id} href={`/album/${a.id}`} active={pathname === `/album/${a.id}`} cover={a.coverUrl} name={a.title} sub={`Album · ${a.releaseDate ? new Date(a.releaseDate).getFullYear() : 'Unknown year'}`} icon={<Disc3 className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                      {visibleSavedAlbums.map((a) => <PlaylistRow key={a.id} href={`/album/${a.albumId}`} active={pathname === `/album/${a.albumId}`} cover={a.coverUrl} name={a.albumTitle} sub={`Album · ${a.artistName}`} icon={<Disc3 className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                    </>
                  )}

                  {/* Tracks section */}
                  {visibleMyTracks.length > 0 && (
                    <>
                      <Separator className="my-2 bg-sidebar-border" />
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">Tracks</p>
                      {visibleMyTracks.map((t) => <PlaylistRow key={t.id} href={`/track/${t.id}`} active={pathname === `/track/${t.id}`} cover={t.coverUrl} name={t.title} sub="Song" icon={<Music2 className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                    </>
                  )}
                </>
              ) : (
                /* ── Specific type tab — flat list, no headers ────────────────── */
                <>
                  {/* Liked Songs: only in Track tab */}
                  {typeFilter === 'track' && visibleLiked && (
                    <>
                      <LikedSongsEntry pathname={pathname} count={savedTracks.length} />
                      {visibleMyTracks.length > 0 && <Separator className="my-2 bg-sidebar-border" />}
                    </>
                  )}

                  {/* Flat items */}
                  {visibleMyPlaylists.map((pl) => <PlaylistRow key={pl.id} href={`/playlists/${pl.id}`} active={pathname === `/playlists/${pl.id}`} cover={pl.coverUrl} name={pl.name} sub={`Playlist · ${pl.trackCount} ${pl.trackCount === 1 ? 'song' : 'songs'}`} icon={<ListMusic className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                  {visibleFollowed.map((pl) => <PlaylistRow key={pl.id} href={`/playlists/${pl.playlistId}`} active={pathname === `/playlists/${pl.playlistId}`} cover={pl.coverUrl} name={pl.playlistName} sub={`Playlist · ${pl.trackCount} ${pl.trackCount === 1 ? 'song' : 'songs'}`} icon={<Heart className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                  {visibleMyAlbums.map((a) => <PlaylistRow key={a.id} href={`/album/${a.id}`} active={pathname === `/album/${a.id}`} cover={a.coverUrl} name={a.title} sub={`Album · ${a.releaseDate ? new Date(a.releaseDate).getFullYear() : 'Unknown year'}`} icon={<Disc3 className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                  {visibleSavedAlbums.map((a) => <PlaylistRow key={a.id} href={`/album/${a.albumId}`} active={pathname === `/album/${a.albumId}`} cover={a.coverUrl} name={a.albumTitle} sub={`Album · ${a.artistName}`} icon={<Disc3 className="h-4 w-4 text-sidebar-accent-foreground" />} />)}
                  {visibleMyTracks.map((t) => <PlaylistRow key={t.id} href={`/track/${t.id}`} active={pathname === `/track/${t.id}`} cover={t.coverUrl} name={t.title} sub="Song" icon={<Music2 className="h-4 w-4 text-sidebar-accent-foreground" />} />)}

                  {/* Empty state for specific tab */}
                  {!hasAnyContent && !isSearching && typeFilter === 'playlist' && !mineOnly && (
                    <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                      <ListMusic className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No playlists yet</p>
                      <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => setCreateDialogOpen(true)}>Create one</Button>
                    </div>
                  )}
                </>
              ))}

              {noResults && (
                <p className="px-2 py-3 text-xs text-muted-foreground">No results</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <CreatePlaylistDialog
        open={createDialogOpen}
        onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) form.reset(); }}
        form={form}
        onSubmit={(v) => createMutation.mutate(v)}
        isPending={createMutation.isPending}
      />
    </>
  );
}

// ── Shared row component ───────────────────────────────────────────────────────

function PlaylistRow({ href, active, cover, name, sub, icon }: {
  href: string; active: boolean; cover: string | null | undefined;
  name: string; sub: string; icon: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn('flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent', active && 'bg-sidebar-accent')}>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
        {cover
          ? <Image src={storageUrl(cover) ?? ''} alt={name} fill className="object-cover" />
          : <div className="flex h-full w-full items-center justify-center bg-sidebar-accent">{icon}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">{name}</p>
        <p className="text-xs text-sidebar-foreground/60">{sub}</p>
      </div>
    </Link>
  );
}

function LikedSongsEntry({ pathname, count }: { pathname: string; count: number }) {
  return (
    <Link href="/library/liked" className={cn('flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent', pathname === '/library/liked' && 'bg-sidebar-accent')}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/20">
        <Heart className="h-5 w-5 fill-current text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">Liked Songs</p>
        <p className="text-xs text-sidebar-foreground/60">Playlist · {count} {count === 1 ? 'song' : 'songs'}</p>
      </div>
    </Link>
  );
}

// ── Extracted dialog to avoid duplication ──────────────────────────────────────

function CreatePlaylistDialog({
  open, onOpenChange, form, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReturnType<typeof useForm<CreateFormValues>>;
  onSubmit: (v: CreateFormValues) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Playlist</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="My playlist" autoFocus {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Optional description" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="visibility" render={({ field }) => (
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
            )} />
            <Button type="submit" className="w-full" disabled={isPending}>Create</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
