'use client';

import { use, useState} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Play, Pause, User, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlbumCard } from '@/components/albums/album-card';
import { PlaylistCard } from '@/components/playlists/playlist-card';
import { TrackRow } from '@/components/tracks/track-row';
import { SectionHeader } from '@/components/common/section-header';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { getArtist } from '@/lib/api/artists';
import { getUser, followUser, unfollowUser } from '@/lib/api/users';
import { getUserPlaylists } from '@/lib/api/playlists';
import { storageUrl } from '@/lib/constants';
import { usePlayer } from '@/hooks/use-player';
import { usePlayerStore } from '@/stores/player-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { useDominantColor } from '@/components/common/page-gradient';
import type { TrackSummaryDto } from '@/lib/api/types';

export default function ArtistPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);
  const { play, togglePlay } = usePlayer();
  const authUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [addTarget, setAddTarget] = useState<TrackSummaryDto | null>(null);
  const currentTrackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id);
  const isGlobalPlaying = usePlayerStore((s) => s.isPlaying);

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtist(artistId),
  });

  const { data: publicProfile } = useQuery({
    queryKey: ['user-profile', artist?.userId],
    queryFn: () => getUser(artist?.userId ?? ''),
    enabled: !!artist?.userId,
  });

  const { data: playlistsData } = useQuery({
    queryKey: ['artist-playlists', artist?.userId],
    queryFn: () => getUserPlaylists(artist?.userId ?? '', { size: 20 }),
    enabled: !!artist?.userId,
  });

  const publicPlaylists = playlistsData?.content.filter((p) => p.visibility === 'PUBLIC') ?? [];

  const followMutation = useMutation({
    mutationFn: () =>
      publicProfile?.isFollowing ? unfollowUser(artist?.userId ?? '') : followUser(artist?.userId ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', artist?.userId] });
      toast.success(publicProfile?.isFollowing ? 'Unfollowed' : 'Following!');
    },
  });

  const avatarSrc = storageUrl(artist?.avatarUrl ?? null);
  const dominantColor = useDominantColor(avatarSrc);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!artist) return <div className="text-muted-foreground">Artist not found.</div>;

  const isOwnProfile = authUser?.id === artist.userId;
  const isContextActive = artist.topTracks.some((t) => t.id === currentTrackId);
  const isContextPlaying = isContextActive && isGlobalPlaying;

  const handlePlayPause = () => {
    if (isContextActive) {
      togglePlay();
    } else {
      play(artist.topTracks, 0);
    }
  };

  return (
    <div className="relative space-y-8 h-full">
      {/* Hero */}
      <div className=" absolute inset-x-0 top-0 h-120 w-full">
        {avatarSrc ? (
          <Image src={avatarSrc} alt={artist.name} fill className="object-cover" sizes="100vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-20 w-20 text-muted-foreground" />
          </div>
        )}
        
      </div>

        <div className="relative top-0 h-full pt-32 pb-6 space-y-8"
         >
          <div className="px-6">
            <div className="bg-linear-to-t from-background/80 to-transparent" />
        <div className="">
          <h1 className="text-7xl font-black tracking-tight leading-none drop-shadow-md">{artist.name}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm font-bold">
            <span>{artist.trackCount} tracks</span>
            <span>{artist.albumCount} albums</span>
            {publicProfile && <span>{publicProfile.followerCount.toLocaleString()} followers</span>}
          </div>
        </div>
          </div>

          <div className="h-full"
          style={{
                background: `linear-gradient(to bottom, rgba(${dominantColor},1) 0%, rgba(31,31,31,1) 30%, rgba(31,31,31,1) 100%)`,
              }}
              >
          <div className="space-y-8 p-6 h-full"
          style={{
                background: `linear-gradient(to bottom, rgba(31,31,31,0.5) 0%,  rgba(31,31,31,0.65) 30%, rgba(31,31,31,1) 100%)`,
              }}
          >
                              {/* Actions */}
      <div className="flex items-center gap-3 ">
        {artist.topTracks.length > 0 && (
          <Button onClick={handlePlayPause} size="lg" className="gap-2">
            {isContextPlaying ? (
              <><Pause className="h-5 w-5 fill-current" />Pause</>
            ) : (
              <><Play className="h-5 w-5 fill-current" />Play</>
            )}
          </Button>
        )}
        {!isOwnProfile && publicProfile && (
          <Button
            variant="outline"
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            className="gap-2"
          >
            {publicProfile.isFollowing ? (
              <><UserCheck className="h-4 w-4" /> Following</>
            ) : (
              <><UserPlus className="h-4 w-4" /> Follow</>
            )}
          </Button>
        )}
        {artist.bio && <p className="text-sm text-muted-foreground">{artist.bio}</p>}
      </div>

      {/* Top Tracks */}
      {artist.topTracks.length > 0 && (
        <div>
          <SectionHeader title="Popular tracks" />
          <div className="space-y-1">
            {artist.topTracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                queue={artist.topTracks}
                queueIndex={i}
                onAddToPlaylist={setAddTarget}
              />
            ))}
          </div>
        </div>
      )}

      {/* Public Playlists */}
      {publicPlaylists.length > 0 && (
        <div>
          <SectionHeader title="Playlists" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {publicPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </div>
      )}

      {/* Albums */}
      {artist.albums.length > 0 && (
        <div>
          <SectionHeader title="Albums" href={`/browse/albums?artistId=${artistId}`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {artist.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </div>
      )}
          </div>
        
          </div>

    
      
        </div>

      
     

      <AddToPlaylistDialog track={addTarget} onClose={() => setAddTarget(null)} />
    </div>
  );
}
