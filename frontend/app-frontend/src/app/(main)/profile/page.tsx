'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { getMe, updateMe, updateAvatar, changePassword } from '@/lib/api/auth';
import { storageUrl } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

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

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    initialData: user ?? undefined,
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
      if (profile) setUser({ ...profile, avatarUrl: data.avatarUrl });
      queryClient.invalidateQueries({ queryKey: ['me'] });
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

  if (!profile) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

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
    </div>
  );
}
