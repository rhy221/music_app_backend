'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Pause, MoreHorizontal, Pencil, Trash2, Music2,
  GripVertical, Search, PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  getPlaylist, deletePlaylist, removeTrackFromPlaylist,
  updatePlaylist, reorderPlaylistItems, addTrackToPlaylist,
} from '@/lib/api/playlists';
import { searchTracks } from '@/lib/api/search';
import { usePlayer } from '@/hooks/use-player';
import { usePlayerStore } from '@/stores/player-store';
import { useDebounce } from '@/hooks/use-debounce';
import { storageUrl } from '@/lib/constants';
import { usePageGradient } from '@/components/common/page-gradient';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { TrackSummaryDto } from '@/lib/api/types';

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  return `${m} min`;
}

export default function PlaylistDetailPage({ params }: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = use(params);
  const { play, togglePlay } = usePlayer();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id);
  const isGlobalPlaying = usePlayerStore((s) => s.isPlaying);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'UNLISTED'>('PRIVATE');

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [trackSearch, setTrackSearch] = useState('');
  const debouncedSearch = useDebounce(trackSearch, 400);
  const { setSrc } = usePageGradient();

  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => getPlaylist(playlistId),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['track-search-playlist', debouncedSearch],
    queryFn: () => searchTracks({ q: debouncedSearch, size: 8 }),
    enabled: debouncedSearch.length >= 2,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlaylist(playlistId),
    onSuccess: () => { router.push('/playlists'); toast.success('Playlist deleted'); },
  });

  const removeTrackMutation = useMutation({
    mutationFn: (itemId: string) => removeTrackFromPlaylist(playlistId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['my-track-ids'] });
      toast.success('Track removed');
    },
  });

  const editMutation = useMutation({
    mutationFn: () => updatePlaylist(playlistId, { name: editName, visibility: editVisibility }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      setEditOpen(false);
      toast.success('Playlist updated');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (itemIds: string[]) => reorderPlaylistItems(playlistId, itemIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] }),
  });

  const addTrackMutation = useMutation({
    mutationFn: (trackId: string) => addTrackToPlaylist(playlistId, { trackId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['my-track-ids'] });
      toast.success('Track added');
    },
    onError: () => toast.error('Failed to add track'),
  });

  const coverSrc = storageUrl(playlist?.items[0]?.trackCoverUrl ?? null);

  useEffect(() => {
    setSrc(coverSrc);
    return () => setSrc(null);
  }, [coverSrc, setSrc]);

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

  const isContextActive = tracksAsSummary.some((t) => t.id === currentTrackId);
  const isContextPlaying = isContextActive && isGlobalPlaying;

  const handlePlayPause = () => {
    if (isContextActive) togglePlay();
    else play(tracksAsSummary, 0);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const ids = playlist.items.map((i) => i.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    const newIds = [...ids];
    newIds.splice(from, 1);
    newIds.splice(to, 0, draggedId);
    reorderMutation.mutate(newIds);
  };

  const existingTrackIds = new Set(playlist.items.map((i) => i.trackId));

  return (
    <div className="space-y-8 h-full">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end p-6">
        <div className="relative h-50 w-50 flex-shrink-0 overflow-hidden rounded-lg bg-primary/20 shadow-2xl">
          {coverSrc ? (
            <img src={coverSrc} alt={playlist.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className="h-16 w-16 text-primary/60" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Playlist</p>
          <h1 className="mt-1 text-7xl font-black tracking-tight leading-none">{playlist.name}</h1>
          {playlist.description && (
            <p className="mt-1 text-sm text-muted-foreground font-bold">{playlist.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground font-bold">
            <Badge variant="secondary">{playlist.visibility.toLowerCase()}</Badge>
            <span>{playlist.trackCount} tracks</span>
            <span>·</span>
            <span>{formatMs(playlist.totalDurationMs)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-8 p-6 h-full"
       style={{
                background: `linear-gradient(to bottom, rgba(31,31,31,0.3) 0%, rgba(31,31,31,0.4) 20%, rgba(31,31,31,0.65) 60%, rgba(31,31,31,1) 100%)`,
              }}>
        {/* Actions */}
        <div className="flex items-center gap-3">
          {tracksAsSummary.length > 0 && (
            <Button onClick={handlePlayPause} size="lg" className="gap-2">
              {isContextPlaying ? (
                <><Pause className="h-5 w-5 fill-current" />Pause</>
              ) : (
                <><Play className="h-5 w-5 fill-current" />Play</>
              )}
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
                <DropdownMenuItem onClick={() => { setEditName(playlist.name); setEditVisibility(playlist.visibility); setEditOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
       
          {/* Tracks */}
      <div className="space-y-1">
        {playlist.items.map((item, i) => {
          const isItemActive = currentTrackId === item.trackId;
          const isItemPlaying = isItemActive && isGlobalPlaying;
          const isDragOver = dragOverId === item.id;
          return (
            <div
              key={item.id}
              draggable={playlist.canEdit}
              onDragStart={() => setDraggedId(item.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
              onDrop={() => { handleDrop(item.id); setDraggedId(null); setDragOverId(null); }}
              onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
              className={cn(
                'group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent',
                isItemActive && 'bg-accent/60',
                isDragOver && draggedId !== item.id && 'border-t-2 border-primary',
                draggedId === item.id && 'opacity-50'
              )}
              onClick={() => isItemActive ? togglePlay() : play(tracksAsSummary, i)}
            >
              {playlist.canEdit && (
                <div
                  className="cursor-grab opacity-0 group-hover:opacity-60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex w-8 shrink-0 items-center justify-center">
                {isItemPlaying ? (
                  <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-primary">
                    <Pause className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <>
                    <Play className={cn('hidden h-4 w-4 fill-current group-hover:block', isItemActive ? 'text-primary' : 'text-foreground')} />
                    <span className={cn('block text-sm group-hover:hidden', isItemActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                      {i + 1}
                    </span>
                  </>
                )}
              </div>
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                {item.trackCoverUrl && (
                  <img src={storageUrl(item.trackCoverUrl) ?? ''} alt={item.trackTitle} className="h-full w-full object-cover" />
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
                  onClick={(e) => { e.stopPropagation(); removeTrackMutation.mutate(item.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
        {playlist.items.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No tracks yet. Search below to add some!
          </p>
        )}
      </div>
         {/* Add tracks via search */}
      {playlist.canEdit && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Add tracks</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search for tracks to add…"
              value={trackSearch}
              onChange={(e) => setTrackSearch(e.target.value)}
            />
          </div>
          {debouncedSearch.length >= 2 && searchResults && (
            <div className="mt-2 space-y-0.5">
              {searchResults.content.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{debouncedSearch}&rdquo;
                </p>
              )}
              {searchResults.content.map((hit) => {
                const alreadyIn = existingTrackIds.has(hit.id);
                return (
                  <div key={hit.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                      {hit.coverUrl && (
                        <img src={storageUrl(hit.coverUrl) ?? ''} alt={hit.title} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{hit.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{hit.artist.name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={alreadyIn ? 'secondary' : 'outline'}
                      disabled={alreadyIn || addTrackMutation.isPending}
                      onClick={() => !alreadyIn && addTrackMutation.mutate(hit.id)}
                    >
                      {alreadyIn ? 'Added' : <><PlusCircle className="mr-1 h-4 w-4" />Add</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
         {/* Collaborators */}
      {playlist.collaborators.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Collaborators</h2>
          <div className="flex flex-wrap gap-3">
            {playlist.collaborators.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={storageUrl(c.avatarUrl) ?? undefined} />
                  <AvatarFallback>{c.displayName[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{c.displayName}</span>
                <Badge variant="outline" className="text-xs">{c.role.toLowerCase()}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      

      
     

     
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
            <Select value={editVisibility} onValueChange={(v) => setEditVisibility(v as typeof editVisibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="UNLISTED">Unlisted</SelectItem>
              </SelectContent>
            </Select>
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
