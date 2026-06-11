'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { getTracks } from '@/lib/api/tracks';
import { TrackCard } from '@/components/tracks/track-card';
import { AddToPlaylistDialog } from '@/components/playlists/add-to-playlist-dialog';
import { CardGridSkeleton } from '@/components/common/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TrackSummaryDto } from '@/lib/api/types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
  { value: 'oldest', label: 'Oldest' },
];

function TracksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [addTarget, setAddTarget] = useState<TrackSummaryDto | null>(null);
  const sort = (searchParams.get('sort') ?? 'newest') as string;

  const { data, isLoading } = useQuery({
    queryKey: ['tracks', { sort, page }],
    queryFn: () => getTracks({ sort: sort as never, page, size: 24 }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tracks</h1>
        <Select
          value={sort}
          onValueChange={(v) => {
            router.push(`/browse/tracks?sort=${v}`);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={24} />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data?.content.map((track, i) => (
            <TrackCard
              key={track.id}
              track={track}
              queue={data.content}
              queueIndex={i}
              onAddToPlaylist={setAddTarget}
            />
          ))}
        </div>
      )}

      <AddToPlaylistDialog track={addTarget} onClose={() => setAddTarget(null)} />

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TracksPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={24} />}>
      <TracksContent />
    </Suspense>
  );
}
