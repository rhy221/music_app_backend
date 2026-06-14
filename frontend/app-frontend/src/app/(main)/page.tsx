'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPopularTracks, getNewReleases, getTracks } from '@/lib/api/tracks';
import { getRecommendations, getDiscoverWeekly } from '@/lib/api/recommendations';
import { getAlbums } from '@/lib/api/albums';
import { getArtists } from '@/lib/api/artists';
import { storageUrl } from '@/lib/constants';
import { TrackCard } from '@/components/tracks/track-card';
import { AlbumCard } from '@/components/albums/album-card';
import { ArtistCard } from '@/components/artists/artist-card';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { SectionHeader } from '@/components/common/section-header';
import { CardGridSkeleton } from '@/components/common/loading-skeleton';
import { useAuthStore } from '@/stores/auth-store';
import type { TrackSummaryDto } from '@/lib/api/types';
import { usePageGradient } from '@/components/common/page-gradient';


type FilterTab = 'all' | 'tracks' | 'albums' | 'artists';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tracks', label: 'Tracks' },
  { value: 'albums', label: 'Albums' },
  { value: 'artists', label: 'Artists' },
];

export default function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
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

  const { data: allTracks, isLoading: loadingTracks } = useQuery({
    queryKey: ['tracks', 'all'],
    queryFn: () => getTracks({ sort: 'newest', size: 24 }),
    enabled: activeTab === 'tracks',
  });

  const { data: albums, isLoading: loadingAlbums } = useQuery({
    queryKey: ['albums'],
    queryFn: () => getAlbums({ size: 24 }),
    enabled: activeTab === 'albums',
  });

  const { data: artists, isLoading: loadingArtists } = useQuery({
    queryKey: ['artists'],
    queryFn: () => getArtists({ size: 24 }),
    enabled: activeTab === 'artists',
  });

  const { setSrc } = usePageGradient();
  const coverSrc = popular?.[0]?.coverUrl ? storageUrl(popular[0].coverUrl) : null;
  
  useEffect(() => {
      setSrc(coverSrc);
      return () => setSrc(null);
    }, [coverSrc, setSrc]);

  return (
    <div className="@container space-y-6 p-6 h-full"
    style={{
                background: `linear-gradient(to bottom, rgba(31,31,31,0.5) 0%,  rgba(31,31,31,0.65) 30%, rgba(31,31,31,1) 100%)`,
              }}
              >
      {user && activeTab === 'all' && (
        <div>
          <h1 className="text-3xl font-bold">
            Good {getGreeting()}, {user.displayName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">What do you want to listen to?</p>
        </div>
      )}

      {/* Sticky filter tabs */}
      <div className="sticky top-0 z-10 -mx-6 bg-transparent px-6 pb-2 pt-1 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                activeTab === tab.value
                  ? 'bg-foreground text-background'
                  : 'bg-secondary hover:bg-secondary/70 text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* All tab */}
      {activeTab === 'all' && (
        <div className="space-y-10">
          <section>
            <SectionHeader title="Popular this week" />
            {loadingPopular ? (
              <CardGridSkeleton />
            ) : popular && popular.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 @[480px]:grid-cols-3 @[640px]:grid-cols-4 @[820px]:grid-cols-5">
                {popular.map((track, i) => (
                  <TrackCard key={track.id} track={track} queue={popular} queueIndex={i} onAddToPlaylist={setAddTarget} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No tracks yet. Be the first to upload!</p>
            )}
          </section>

          <section>
            <SectionHeader title="New releases" />
            {loadingNew ? (
              <CardGridSkeleton />
            ) : newReleases && newReleases.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 @[480px]:grid-cols-3 @[640px]:grid-cols-4 @[820px]:grid-cols-5">
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
              <SectionHeader title="Recommended for you" />
              <div className="grid grid-cols-2 gap-2 @[480px]:grid-cols-3 @[640px]:grid-cols-4 @[820px]:grid-cols-5">
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
              <div className="grid grid-cols-2 gap-2 @[480px]:grid-cols-3 @[640px]:grid-cols-4 @[820px]:grid-cols-5">
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
        </div>
      )}

      {/* Tracks tab */}
      {activeTab === 'tracks' && (
        <section>
          <SectionHeader title="All Tracks" />
          {loadingTracks ? (
            <CardGridSkeleton />
          ) : allTracks && allTracks.content.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 @[480px]:grid-cols-3 @[640px]:grid-cols-4 @[820px]:grid-cols-5">
              {allTracks.content.map((track, i) => (
                <TrackCard key={track.id} track={track} queue={allTracks.content} queueIndex={i} onAddToPlaylist={setAddTarget} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No tracks found.</p>
          )}
        </section>
      )}

      {/* Albums tab */}
      {activeTab === 'albums' && (
        <section>
          <SectionHeader title="Albums" />
          {loadingAlbums ? (
            <CardGridSkeleton />
          ) : albums && albums.content.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 @[480px]:grid-cols-3 @[640px]:grid-cols-4 @[820px]:grid-cols-5">
              {albums.content.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No albums found.</p>
          )}
        </section>
      )}

      {/* Artists tab */}
      {activeTab === 'artists' && (
        <section>
          <SectionHeader title="Artists" />
          {loadingArtists ? (
            <CardGridSkeleton />
          ) : artists && artists.content.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 @[480px]:grid-cols-3 @[640px]:grid-cols-4 @[820px]:grid-cols-5">
              {artists.content.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No artists found.</p>
          )}
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
