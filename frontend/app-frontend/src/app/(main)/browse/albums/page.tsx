'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAlbums } from '@/lib/api/albums';
import { AlbumCard } from '@/components/albums/album-card';
import { CardGridSkeleton } from '@/components/common/loading-skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AlbumsPage() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['albums', page],
    queryFn: () => getAlbums({ page, size: 24 }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Albums</h1>
      {isLoading ? (
        <CardGridSkeleton count={24} />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data?.content.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
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
