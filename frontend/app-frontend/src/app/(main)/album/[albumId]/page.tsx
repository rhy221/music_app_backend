'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Disc3, Clock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TrackRow } from '@/components/tracks/track-row';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { EditAlbumDialog } from '@/components/albums/edit-album-dialog';
import { usePageGradient } from '@/components/common/page-gradient';
import { getAlbum, deleteAlbum } from '@/lib/api/albums';
import { usePlayer } from '@/hooks/use-player';
import { usePlayerStore } from '@/stores/player-store';
import { useAuthStore } from '@/stores/auth-store';
import { storageUrl } from '@/lib/constants';
import type { TrackSummaryDto } from '@/lib/api/types';

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m >= 60) return `${Math.floor(m / 60)} hr ${m % 60} min`;
  return `${m} min ${s} sec`;
}

export default function AlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = use(params);
  const { play, togglePlay } = usePlayer();
  const [addTarget, setAddTarget] = useState<TrackSummaryDto | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id);
  const isGlobalPlaying = usePlayerStore((s) => s.isPlaying);
  const { setSrc } = usePageGradient();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => getAlbum(albumId),
  });

  const coverSrc = album ? storageUrl(album.coverUrl ?? null) : null;

  useEffect(() => {
    if (!coverSrc) return;
    setSrc(coverSrc);
    return () => setSrc(null);
  }, [coverSrc, setSrc]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteAlbum(albumId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['album', albumId] });
      toast.success('Album deleted');
      router.push('/');
    },
    onError: () => toast.error('Failed to delete album'),
  });

  const isOwner =
    !!user &&
    (user.role === 'ADMIN' || (!!album?.artist.userId && album.artist.userId === user.id));

  if (isLoading) {
    return (
      <div className="flex gap-6">
        <Skeleton className="h-48 w-48 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!album) return <div className="text-muted-foreground">Album not found.</div>;

  const isContextActive = album.tracks.some((t) => t.id === currentTrackId);
  const isContextPlaying = isContextActive && isGlobalPlaying;

  const handlePlayPause = () => {
    if (isContextActive) {
      togglePlay();
    } else {
      play(album.tracks, 0);
    }
  };

  return (
    <div className="h-full">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end p-6">
        <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg shadow-2xl">
          {coverSrc ? (
            <Image src={coverSrc} alt={album.title} fill className="object-cover" sizes="192px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Disc3 className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Album</p>
          <h1 className="mt-1 text-6xl font-black">{album.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground font-bold">
            <Link href={`/artist/${album.artist.id}`} className="font-medium text-foreground hover:underline">
              {album.artist.name}
            </Link>
            {album.releaseDate && (
              <>
                <span>·</span>
                <span>{new Date(album.releaseDate).getFullYear()}</span>
              </>
            )}
            <span>·</span>
            <span>{album.tracks.length} tracks</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatMs(album.totalDurationMs)}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={handlePlayPause} className="gap-2" size="lg">
              {isContextPlaying ? (
                <><Pause className="h-5 w-5 fill-current" />Pause</>
              ) : (
                <><Play className="h-5 w-5 fill-current" />Play all</>
              )}
            </Button>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit album
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete album
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 h-full"
      style={{
                background: `linear-gradient(to bottom, rgba(31,31,31,0.3) 0%, rgba(31,31,31,0.4) 20%, rgba(31,31,31,0.65) 60%, rgba(31,31,31,1) 100%)`,
              }}>

      {/* Track list header */}
      <div className="grid grid-cols-[2rem_1fr_auto_2.5rem] items-center gap-3 border-b border-border/40 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-center">#</span>
        <span>Title</span>
        <span className="flex justify-end">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <span />
      </div>

      <div className="space-y-1">
        {album.tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            queue={album.tracks}
            queueIndex={i}
            onAddToPlaylist={setAddTarget}
          />
        ))}
      </div>
      </div>

      <AddToPlaylistDialog track={addTarget} onClose={() => setAddTarget(null)} />

      {editOpen && (
        <EditAlbumDialog album={album} open={editOpen} onClose={() => setEditOpen(false)} />
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete album</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">&ldquo;{album.title}&rdquo;</span>? All tracks in this album will also be archived. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
