'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchTrackCard } from '@/components/tracks/search-track-card';
import { ArtistCard } from '@/components/artists/artist-card';
import { AlbumCard } from '@/components/albums/album-card';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { search } from '@/lib/api/search';
import type { TrackSummaryDto } from '@/lib/api/types';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [addTarget, setAddTarget] = useState<TrackSummaryDto | null>(null);
  const debouncedQ = useDebounce(query, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => search({ q: debouncedQ, size: 20 }),
    enabled: debouncedQ.length > 0,
  });

  const tracksAsSummary: TrackSummaryDto[] =
    data?.tracks.items.map((t) => ({
      id: t.id,
      title: t.title,
      durationMs: t.durationMs,
      genre: t.genre,
      coverUrl: t.coverUrl,
      playCount: t.playCount,
      status: 'PUBLISHED' as const,
      releaseDate: null,
      artist: t.artist,
    })) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10 text-base"
          placeholder="Search tracks, artists…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {!debouncedQ && (
        <p className="text-center text-muted-foreground">Start typing to search</p>
      )}

      {debouncedQ && (
        <Tabs defaultValue="all" className="flex-col">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tracks">
              Tracks {data?.tracks.total ? `(${data.tracks.total})` : ''}
            </TabsTrigger>
            <TabsTrigger value="artists">
              Artists {data?.artists.total ? `(${data.artists.total})` : ''}
            </TabsTrigger>
            <TabsTrigger value="albums">
              Albums {data?.albums.total ? `(${data.albums.total})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6 mt-4">
            {tracksAsSummary.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Tracks</h3>
                <div className="space-y-1">
                  {tracksAsSummary.slice(0, 5).map((track, i) => (
                    <SearchTrackCard key={track.id} track={track} queue={tracksAsSummary} queueIndex={i} onAddToPlaylist={setAddTarget} />
                  ))}
                </div>
              </div>
            )}
            {data?.albums.items.length ? (
              <div>
                <h3 className="mb-2 font-semibold">Albums</h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {data.albums.items.slice(0, 6).map((album) => (
                    <AlbumCard
                      key={album.id}
                      album={{ ...album, coverUrl: album.coverUrl ?? null, artist: { ...album.artist, avatarUrl: null, userId: null } }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {data?.artists.items.length ? (
              <div>
                <h3 className="mb-2 font-semibold">Artists</h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {data.artists.items.slice(0, 6).map((artist) => (
                    <ArtistCard
                      key={artist.id}
                      artist={{ ...artist, albumCount: 0 }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {!isLoading && !isFetching && !tracksAsSummary.length && !data?.albums.items.length && !data?.artists.items.length && (
              <p className="text-center text-muted-foreground">No results for &quot;{debouncedQ}&quot;</p>
            )}
          </TabsContent>

          <TabsContent value="tracks" className="mt-4 space-y-1">
            {tracksAsSummary.map((track, i) => (
              <SearchTrackCard key={track.id} track={track} queue={tracksAsSummary} queueIndex={i} onAddToPlaylist={setAddTarget} />
            ))}
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {data?.artists.items.map((artist) => (
                <ArtistCard key={artist.id} artist={{ ...artist, albumCount: 0 }} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="albums" className="mt-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {data?.albums.items.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={{ ...album, coverUrl: album.coverUrl ?? null, artist: { ...album.artist, avatarUrl: null, userId: null } }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <AddToPlaylistDialog track={addTarget} onClose={() => setAddTarget(null)} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
