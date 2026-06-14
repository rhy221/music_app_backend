'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
} from '@/lib/api/notifications';
import { useNotificationWs } from '@/providers/notification-ws-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  NEW_FOLLOWER: 'New follower',
  PLAYLIST_SHARED: 'Playlist shared',
  COLLABORATOR_ADDED: 'Collaborator added',
  PLAYLIST_TRACK_ADDED: 'Track added to playlist',
  NEW_RELEASE: 'New release',
  TRANSCODE_FAILED: 'Transcode failed',
};

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();
  const { setUnreadCount } = useNotificationWs();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => getNotifications({ unreadOnly, size: 50 }),
  });

  const { data: prefs } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getPreferences,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadCount((n) => Math.max(0, n - 1));
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    },
  });

  const updatePrefMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {data && data.unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <Tabs defaultValue="feed" className="flex-col">
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Switch
              id="unread"
              checked={unreadOnly}
              onCheckedChange={setUnreadOnly}
            />
            <Label htmlFor="unread">Unread only</Label>
            {data && data.unreadCount > 0 && (
              <Badge>{data.unreadCount} unread</Badge>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : data?.content.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <BellOff className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.content.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent',
                    !n.read && 'border-primary/30 bg-primary/5'
                  )}
                  onClick={() => !n.read && markReadMutation.mutate(n.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </Badge>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          {prefs && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notification settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  ['emailEnabled', 'Email notifications'],
                  ['pushEnabled', 'Push notifications'],
                  ['newFollower', 'New follower'],
                  ['playlistShared', 'Playlist shared with you'],
                  ['newRelease', 'New releases'],
                  ['collaboratorActivity', 'Collaborator activity'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key}>{label}</Label>
                      <Switch
                        id={key}
                        checked={prefs[key]}
                        onCheckedChange={(v) => updatePrefMutation.mutate({ [key]: v })}
                      />
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
