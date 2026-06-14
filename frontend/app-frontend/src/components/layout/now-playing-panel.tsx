'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Music2, Mic2, Disc3, ListMusic,
  PanelRightClose, PanelRightOpen,
  UserPlus, UserCheck, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePlayerStore } from '@/stores/player-store';
import { getRecommendations, getSimilarTracks } from '@/lib/api/recommendations';
import { getArtist } from '@/lib/api/artists';
import { getTrack, getPopularTracks } from '@/lib/api/tracks';
import { getUser, followUser, unfollowUser } from '@/lib/api/users';
import { useAuthStore } from '@/stores/auth-store';
import { storageUrl } from '@/lib/constants';
import { toast } from 'sonner';
import type { TrackSummaryDto } from '@/lib/api/types';

interface NowPlayingPanelProps {
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
}

function TrackRow({ track, label }: { track: TrackSummaryDto; label?: string }) {
  return (
    <Link
      href={`/track/${track.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
        {track.coverUrl ? (
          <Image
            src={storageUrl(track.coverUrl)!}
            alt={track.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Music2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {label && (
          <p className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        )}
        <p className="truncate text-sm font-medium">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist.name}</p>
      </div>
    </Link>
  );
}

export function NowPlayingPanel({ isCollapsed, onCollapse, onExpand }: NowPlayingPanelProps) {
  const store = usePlayerStore();
  const authUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const currentTrack = store.queue[store.currentIndex];
  const nextTrack = store.queue[store.currentIndex + 1] ?? null;
  const nextInQueue =
    nextTrack ??
    (store.repeat === 'all' && store.queue.length > 1 ? store.queue[0] : null);
  const hasQueue = store.queue.length > 1;

  const artistId = currentTrack?.artist?.id || null;

  const { data: trackDetail } = useQuery({
    queryKey: ['track-detail', currentTrack?.id],
    queryFn: () => getTrack(currentTrack?.id ?? ''),
    enabled: !!currentTrack?.id && !artistId,
  });

  const resolvedArtistId = artistId || trackDetail?.artist.id || null;

  const { data: artistData } = useQuery({
    queryKey: ['artist', resolvedArtistId],
    queryFn: () => getArtist(resolvedArtistId ?? ''),
    enabled: !!resolvedArtistId,
  });

  const { data: publicProfile } = useQuery({
    queryKey: ['user-profile', artistData?.userId],
    queryFn: () => getUser(artistData!.userId),
    enabled: !!artistData?.userId,
  });

  const followMutation = useMutation({
    mutationFn: () =>
      publicProfile?.isFollowing
        ? unfollowUser(artistData!.userId)
        : followUser(artistData!.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', artistData?.userId] });
      toast.success(publicProfile?.isFollowing ? 'Unfollowed' : 'Now following!');
    },
  });

  const isOwnProfile = authUser?.id === artistData?.userId;

  const { data: similarData } = useQuery({
    queryKey: ['similar-tracks', artistId],
    queryFn: () => getSimilarTracks(currentTrack!.id, 8),
    enabled: !!currentTrack && !hasQueue,
  });

  const { data: recData } = useQuery({
    queryKey: ['recommendations', 'panel'],
    queryFn: () => getRecommendations({ limit: 10 }),
    enabled: !currentTrack,
  });

  const filteredSimilar = !hasQueue
    ? (similarData?.items ?? []).filter((item) => item.trackId !== currentTrack?.id)
    : [];
  const hasSimilar = filteredSimilar.length > 0;

  const { data: popularData } = useQuery({
    queryKey: ['tracks', 'popular'],
    queryFn: () => getPopularTracks({ limit: 10, period: 'week' }),
    enabled: !!currentTrack && !hasQueue && !!similarData && !hasSimilar,
  });

  const filteredPopular = !hasQueue
    ? (popularData ?? []).filter((t) => t.id !== currentTrack?.id)
    : [];

  return (
    <div className="h-full overflow-auto-y rounded-md bg-secondary">
      {isCollapsed ? 
      (
      // Collapse mode
      <div className="group flex h-full flex-col items-center pt-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onExpand}
              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
              <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Show Now Playing</TooltipContent>
        </Tooltip>
      </div>)
      : 
      (
      // Expanded mode
      <div className="flex h-full flex-col  ">
      {/* Header */}
      <div className="group flex shrink-0 items-center justify-between border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {currentTrack ? 'Now Playing' : 'Recommended'}
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onCollapse}
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close panel</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="flex-1">
        {/* ── No track: recommendations ── */}
        {!currentTrack && (
          <div className="p-2 pb-24">
            {!recData &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            {recData?.items.map((item) => (
              <Link
                key={item.trackId}
                href={`/track/${item.trackId}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                  {item.coverUrl ? (
                    <Image
                      src={storageUrl(item.coverUrl)!}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Music2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.genre && (
                    <p className="truncate text-xs text-muted-foreground">{item.genre}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Track playing ── */}
        {currentTrack && (
          <div className="pb-24">
            {/* Song cover */}
            <div className="p-4 pb-2">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg shadow-md">
                {currentTrack.coverUrl ? (
                  <Image
                    src={storageUrl(currentTrack.coverUrl)!}
                    alt={currentTrack.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Music2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Song info */}
            <div className="px-4 pt-1 pb-2">
              <Link
                href={`/track/${currentTrack.id}`}
                className="block truncate text-base font-bold hover:underline"
              >
                {currentTrack.title}
              </Link>
              {currentTrack.genre && (
                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {currentTrack.genre}
                </span>
              )}
            </div>

            {/* ── Artist section ── */}
            <Separator />
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                About the Artist
              </p>

              {/* Artist image — same size as song cover */}
              <div className="relative aspect-square w-full overflow-hidden rounded-lg shadow-sm">
                {currentTrack.artist.avatarUrl ? (
                  <Image
                    src={storageUrl(currentTrack.artist.avatarUrl)!}
                    alt={currentTrack.artist.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Mic2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {/* Gradient overlay with name */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <Link
                  href={resolvedArtistId ? `/artist/${resolvedArtistId}` : '#'}
                  className="absolute bottom-3 left-3 right-3"
                >
                  <p className="truncate text-sm font-bold text-white drop-shadow hover:underline">
                    {currentTrack.artist.name}
                  </p>
                  {artistData && (
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-white/80">
                      <span className="flex items-center gap-1">
                        <Music2 className="h-3 w-3" />
                        {artistData.trackCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Disc3 className="h-3 w-3" />
                        {artistData.albumCount}
                      </span>
                      {publicProfile && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {publicProfile.followerCount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </div>

              {/* Bio */}
              {artistData?.bio && (
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                  {artistData.bio}
                </p>
              )}

              {/* Follow button */}
              {!isOwnProfile && publicProfile && (
                <Button
                  variant={publicProfile.isFollowing ? 'secondary' : 'default'}
                  size="sm"
                  className="mt-3 w-full gap-2"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {publicProfile.isFollowing ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* ── Up Next ── */}
            <Separator />
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <ListMusic className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Up Next
                </p>
              </div>

              {hasQueue && nextInQueue ? (
                <div className="-mx-2">
                  <TrackRow
                    track={nextInQueue}
                    label={nextTrack ? 'Next in queue' : 'Next (loop)'}
                  />
                  {store.queue
                    .slice(store.currentIndex + 2, store.currentIndex + 5)
                    .map((t) => (
                      <TrackRow key={t.id} track={t} />
                    ))}
                </div>
              ) : hasQueue && !nextInQueue ? (
                <p className="px-2 text-xs text-muted-foreground">End of queue</p>
              ) : hasSimilar ? (
                <div className="-mx-2">
                  {filteredSimilar.map((item) => (
                    <Link
                      key={item.trackId}
                      href={`/track/${item.trackId}`}
                      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                        {item.coverUrl ? (
                          <Image
                            src={storageUrl(item.coverUrl)!}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        {item.genre && (
                          <p className="truncate text-xs text-muted-foreground">{item.genre}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : filteredPopular.length > 0 ? (
                <div className="-mx-2">
                  <p className="mb-1 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Popular this week
                  </p>
                  {filteredPopular.map((t) => (
                    <TrackRow key={t.id} track={t} />
                  ))}
                </div>
              ) : (
                <div className="-mx-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2">
                      <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>)}
    </div>
  )

  /* ── Collapsed mode ── */
  if (isCollapsed) {
    return (
      <div className="group flex h-full flex-col items-center border-l bg-background pt-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onExpand}
              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
              <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Show Now Playing</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  /* ── Expanded mode ── */
  return (
    <div className="flex h-full flex-col border-l bg-background">
      {/* Header */}
      <div className="group flex shrink-0 items-center justify-between border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {currentTrack ? 'Now Playing' : 'Recommended'}
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onCollapse}
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close panel</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="flex-1">
        {/* ── No track: recommendations ── */}
        {!currentTrack && (
          <div className="p-2 pb-24">
            {!recData &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            {recData?.items.map((item) => (
              <Link
                key={item.trackId}
                href={`/track/${item.trackId}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                  {item.coverUrl ? (
                    <Image
                      src={storageUrl(item.coverUrl)!}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Music2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.genre && (
                    <p className="truncate text-xs text-muted-foreground">{item.genre}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Track playing ── */}
        {currentTrack && (
          <div className="pb-24">
            {/* Song cover */}
            <div className="p-4 pb-2">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg shadow-md">
                {currentTrack.coverUrl ? (
                  <Image
                    src={storageUrl(currentTrack.coverUrl)!}
                    alt={currentTrack.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Music2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Song info */}
            <div className="px-4 pt-1 pb-2">
              <Link
                href={`/track/${currentTrack.id}`}
                className="block truncate text-base font-bold hover:underline"
              >
                {currentTrack.title}
              </Link>
              {currentTrack.genre && (
                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {currentTrack.genre}
                </span>
              )}
            </div>

            {/* ── Artist section ── */}
            <Separator />
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                About the Artist
              </p>

              {/* Artist image — same size as song cover */}
              <div className="relative aspect-square w-full overflow-hidden rounded-lg shadow-sm">
                {currentTrack.artist.avatarUrl ? (
                  <Image
                    src={storageUrl(currentTrack.artist.avatarUrl)!}
                    alt={currentTrack.artist.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Mic2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {/* Gradient overlay with name */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <Link
                  href={resolvedArtistId ? `/artist/${resolvedArtistId}` : '#'}
                  className="absolute bottom-3 left-3 right-3"
                >
                  <p className="truncate text-sm font-bold text-white drop-shadow hover:underline">
                    {currentTrack.artist.name}
                  </p>
                  {artistData && (
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-white/80">
                      <span className="flex items-center gap-1">
                        <Music2 className="h-3 w-3" />
                        {artistData.trackCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Disc3 className="h-3 w-3" />
                        {artistData.albumCount}
                      </span>
                      {publicProfile && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {publicProfile.followerCount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </div>

              {/* Bio */}
              {artistData?.bio && (
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                  {artistData.bio}
                </p>
              )}

              {/* Follow button */}
              {!isOwnProfile && publicProfile && (
                <Button
                  variant={publicProfile.isFollowing ? 'secondary' : 'default'}
                  size="sm"
                  className="mt-3 w-full gap-2"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {publicProfile.isFollowing ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* ── Up Next ── */}
            <Separator />
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <ListMusic className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Up Next
                </p>
              </div>

              {hasQueue && nextInQueue ? (
                <div className="-mx-2">
                  <TrackRow
                    track={nextInQueue}
                    label={nextTrack ? 'Next in queue' : 'Next (loop)'}
                  />
                  {store.queue
                    .slice(store.currentIndex + 2, store.currentIndex + 5)
                    .map((t) => (
                      <TrackRow key={t.id} track={t} />
                    ))}
                </div>
              ) : hasQueue && !nextInQueue ? (
                <p className="px-2 text-xs text-muted-foreground">End of queue</p>
              ) : !hasQueue && similarData?.items.length ? (
                <div className="-mx-2">
                  {similarData.items.map((item) => (
                    <Link
                      key={item.trackId}
                      href={`/track/${item.trackId}`}
                      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                        {item.coverUrl ? (
                          <Image
                            src={storageUrl(item.coverUrl)!}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        {item.genre && (
                          <p className="truncate text-xs text-muted-foreground">{item.genre}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="-mx-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2">
                      <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
