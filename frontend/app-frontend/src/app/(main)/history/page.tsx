'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Music2, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getHistory, getListeningStats } from '@/lib/api/stream';

function formatMs(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function HistoryPage() {
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory({ size: 50 }),
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['listening-stats'],
    queryFn: getListeningStats,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Listening History</h1>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          {loadingHistory ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {history?.content.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
                    {entry.coverUrl ? (
                      <Image src={entry.coverUrl} alt={entry.trackTitle} fill className="object-cover" sizes="48px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.trackTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.artistName}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.playedAt).toLocaleDateString()}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatMs(entry.listenedMs)}
                    </p>
                  </div>
                </div>
              ))}
              {history?.content.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No listening history yet.</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4 space-y-4">
          {loadingStats ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="flex flex-col items-center p-6">
                    <Clock className="h-8 w-8 text-primary" />
                    <p className="mt-2 text-2xl font-bold">{formatMs(stats.totalListeningMs)}</p>
                    <p className="text-sm text-muted-foreground">Total listening time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex flex-col items-center p-6">
                    <Music2 className="h-8 w-8 text-primary" />
                    <p className="mt-2 text-2xl font-bold">{stats.totalTracks}</p>
                    <p className="text-sm text-muted-foreground">Tracks played</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex flex-col items-center p-6">
                    <BarChart2 className="h-8 w-8 text-primary" />
                    <p className="mt-2 text-2xl font-bold">{stats.totalSessions}</p>
                    <p className="text-sm text-muted-foreground">Sessions</p>
                  </CardContent>
                </Card>
              </div>

              {stats.topGenres.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top genres</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {stats.topGenres.map((g) => (
                        <Badge key={g.genre} variant="secondary">
                          {g.genre} · {g.count}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.topArtists.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top artists</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.topArtists.slice(0, 5).map((a, i) => (
                      <div key={a.artistId} className="flex items-center gap-3">
                        <span className="w-5 text-sm text-muted-foreground">{i + 1}</span>
                        <Link href={`/artist/${a.artistId}`} className="flex-1 text-sm font-medium hover:underline">
                          {a.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{a.count} plays</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
