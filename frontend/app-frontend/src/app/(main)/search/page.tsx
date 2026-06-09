'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackRow } from '@/components/tracks/track-row';
import { ArtistCard } from '@/components/artists/artist-card';
import { useDebounce } from '@/hooks/use-debounce';
import { search } from '@/lib/api/search';
import type { TrackSummaryDto } from '@/lib/api/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
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
    <div className="space-y-6">
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
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tracks">
              Tracks {data?.tracks.total ? `(${data.tracks.total})` : ''}
            </TabsTrigger>
            <TabsTrigger value="artists">
              Artists {data?.artists.total ? `(${data.artists.total})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6 mt-4">
            {tracksAsSummary.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Tracks</h3>
                <div className="space-y-1">
                  {tracksAsSummary.slice(0, 5).map((track, i) => (
                    <TrackRow key={track.id} track={track} index={i} queue={tracksAsSummary} queueIndex={i} />
                  ))}
                </div>
              </div>
            )}
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
            {!isLoading && !isFetching && !tracksAsSummary.length && !data?.artists.items.length && (
              <p className="text-center text-muted-foreground">No results for &quot;{debouncedQ}&quot;</p>
            )}
          </TabsContent>

          <TabsContent value="tracks" className="mt-4 space-y-1">
            {tracksAsSummary.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} queue={tracksAsSummary} queueIndex={i} />
            ))}
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {data?.artists.items.map((artist) => (
                <ArtistCard key={artist.id} artist={{ ...artist, albumCount: 0 }} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
