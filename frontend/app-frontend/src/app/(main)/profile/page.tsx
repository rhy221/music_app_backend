'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Camera, Pencil, Clock, Music2, BarChart2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getMe, updateMe, updateAvatar, changePassword } from '@/lib/api/auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getHistory, getListeningStats } from '@/lib/api/stream';
import { storageUrl } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { usePageGradient } from '@/components/common/page-gradient';


const profileSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmNew: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNew, {
    message: "Passwords don't match",
    path: ['confirmNew'],
  });

function formatMs(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { setSrc } = usePageGradient();


  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    initialData: user ?? undefined,
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory({ size: 50 }),
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['listening-stats'],
    queryFn: getListeningStats,
  });

  const profileForm = useForm({ resolver: zodResolver(profileSchema), values: { displayName: profile?.displayName ?? '', bio: profile?.bio ?? '' } });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmNew: '' } });

  const updateMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (data) => {
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setProfileOpen(false);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Update failed'),
  });

  const avatarMutation = useMutation({
    mutationFn: updateAvatar,
    onSuccess: (data) => {
      const bustedUrl = `${data.avatarUrl}?v=${Date.now()}`;
      if (profile) setUser({ ...profile, avatarUrl: bustedUrl });
      toast.success('Avatar updated');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (v: z.infer<typeof passwordSchema>) =>
      changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: () => {
      setPasswordOpen(false);
      passwordForm.reset();
      toast.success('Password changed');
    },
    onError: () => toast.error('Current password is incorrect'),
  });

   const coverSrc = profile ? storageUrl(profile.avatarUrl) : null;

  useEffect(() => {
    setSrc(coverSrc);
    return () => setSrc(null);
  }, [coverSrc, setSrc]);

  if (!profile) return null;

  return (
    <div className="space-y-8 h-full p-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Profile card */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={storageUrl(profile.avatarUrl) ?? undefined} />
              <AvatarFallback className="text-2xl">{profile.displayName[0]}</AvatarFallback>
            </Avatar>
            <button
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) avatarMutation.mutate(f);
              }}
            />
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold">{profile.displayName}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            {profile.bio && <p className="mt-1 text-sm">{profile.bio}</p>}
            <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
              <span>{profile.followerCount} followers</span>
              <span>{profile.followingCount} following</span>
            </div>
          </div>
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
              </DialogHeader>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit((v) => updateMutation.mutate(v))}
                  className="space-y-4"
                >
                  <FormField
                    control={profileForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                    Save
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Security card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Change your account password</p>
            </div>
            <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Change password</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change password</DialogTitle>
                </DialogHeader>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))}
                    className="space-y-4"
                  >
                    {(['currentPassword', 'newPassword', 'confirmNew'] as const).map((name) => (
                      <FormField
                        key={name}
                        control={passwordForm.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {name === 'currentPassword' ? 'Current password' : name === 'newPassword' ? 'New password' : 'Confirm new password'}
                            </FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                    <Button type="submit" className="w-full" disabled={passwordMutation.isPending}>
                      Update password
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Listening activity */}
      <div >
        <Tabs defaultValue="history" className="flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            {loadingHistory ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : (() => {
              const dedupedHistory = history?.content
                ? Object.values(
                    history.content.reduce<Record<string, (typeof history.content)[0]>>((acc, entry) => {
                      if (!acc[entry.trackId] || new Date(entry.playedAt) > new Date(acc[entry.trackId].playedAt)) {
                        acc[entry.trackId] = entry;
                      }
                      return acc;
                    }, {})
                  ).sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
                : [];
              return dedupedHistory.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No listening history yet.</p>
              ) : (
                <ScrollArea className="h-[420px] pr-3">
                  <div className="space-y-2">
                    {dedupedHistory.map((entry) => (
                      <div key={entry.trackId} className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                          {entry.coverUrl ? (
                            <img src={storageUrl(entry.coverUrl)!} alt={entry.trackTitle} className="h-full w-full object-cover" />
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
                        <div className="shrink-0 text-right">
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
                  </div>
                </ScrollArea>
              );
            })()}
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
    </div>
  );
}
