'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPopularTracks, getNewReleases } from '@/lib/api/tracks';
import { getRecommendations, getDiscoverWeekly } from '@/lib/api/recommendations';
import { storageUrl } from '@/lib/constants';
import { TrackCard } from '@/components/tracks/track-card';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { SectionHeader } from '@/components/common/section-header';
import { CardGridSkeleton } from '@/components/common/loading-skeleton';
import { useAuthStore } from '@/stores/auth-store';
import type { TrackSummaryDto } from '@/lib/api/types';

export default function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [addTarget, setAddTarget] = useState<TrackSummaryDto | null>(null);

  const { data: popular, isLoading: loadingPopular } = useQuery({
    queryKey: ['tracks', 'popular'],
    queryFn: () => getPopularTracks({ limit: 12, period: 'week' }),
  });

  const { data: newReleases, isLoading: loadingNew } = useQuery({
    queryKey: ['tracks', 'new-releases'],
    queryFn: () => getNewReleases(12),
  });

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => getRecommendations(),
    enabled: isAuthenticated,
  });

  const { data: discoverWeekly } = useQuery({
    queryKey: ['discover-weekly'],
    queryFn: getDiscoverWeekly,
    enabled: isAuthenticated,
  });

  return (
    <div className="space-y-10">
      {user && (
        <div>
          <h1 className="text-3xl font-bold">
            Good {getGreeting()}, {user.displayName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">What do you want to listen to?</p>
        </div>
      )}

      <section>
        <SectionHeader title="Popular this week" href="/browse/tracks?sort=popular" />
        {loadingPopular ? (
          <CardGridSkeleton />
        ) : popular && popular.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {popular.map((track, i) => (
              <TrackCard key={track.id} track={track} queue={popular} queueIndex={i} onAddToPlaylist={setAddTarget} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No tracks yet. Be the first to upload!</p>
        )}
      </section>

      <section>
        <SectionHeader title="New releases" href="/browse/tracks?sort=newest" />
        {loadingNew ? (
          <CardGridSkeleton />
        ) : newReleases && newReleases.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {newReleases.map((track, i) => (
              <TrackCard key={track.id} track={track} queue={newReleases} queueIndex={i} onAddToPlaylist={setAddTarget} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No new releases yet.</p>
        )}
      </section>

      {isAuthenticated && recommendations?.items && recommendations.items.length > 0 && (
        <section>
          <SectionHeader title="Recommended for you" href="/browse" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {recommendations.items.slice(0, 12).map((item) => (
              <div
                key={item.trackId}
                className="group relative cursor-pointer rounded-lg p-3 hover:bg-accent transition-colors"
              >
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                  {item.coverUrl && (
                    <img src={storageUrl(item.coverUrl) ?? undefined} alt={item.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {isAuthenticated && discoverWeekly && discoverWeekly.items.length > 0 && (
        <section>
          <SectionHeader title={discoverWeekly.title} />
          <p className="mb-4 text-sm text-muted-foreground">{discoverWeekly.description}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {discoverWeekly.items.slice(0, 12).map((item) => (
              <div
                key={item.trackId}
                className="group relative cursor-pointer rounded-lg p-3 hover:bg-accent transition-colors"
              >
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                  {item.coverUrl && (
                    <img src={storageUrl(item.coverUrl) ?? undefined} alt={item.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      <AddToPlaylistDialog track={addTarget} onClose={() => setAddTarget(null)} />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
