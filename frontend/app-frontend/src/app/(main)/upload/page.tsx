'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Trash2, CheckCircle2, Circle, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  createDraft,
  getDraft,
  addTrackToDraft,
  removeTrackFromDraft,
  getAudioUploadUrl,
  confirmAudioUpload,
  submitDraft,
} from '@/lib/api/upload';
import { toast } from 'sonner';
import type { DraftDto } from '@/lib/api/types';

export default function UploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { data: draft, isLoading: loadingDraft } = useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => getDraft(draftId!),
    enabled: !!draftId,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('title', title);
      if (genre) form.append('genre', genre);
      return createDraft(form);
    },
    onSuccess: (data) => {
      setDraftId(data.id);
      toast.success('Draft created');
    },
    onError: () => toast.error('Failed to create draft'),
  });

  const addTrackMutation = useMutation({
    mutationFn: () =>
      addTrackToDraft(draftId!, {
        title: newTrackTitle,
        trackNumber: (draft?.tracks.length ?? 0) + 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
      setNewTrackTitle('');
      toast.success('Track added');
    },
  });

  const removeTrackMutation = useMutation({
    mutationFn: (trackId: string) => removeTrackFromDraft(draftId!, trackId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['draft', draftId] }),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitDraft(draftId!),
    onSuccess: () => {
      toast.success('Submitted for processing!');
      router.push('/upload/jobs');
    },
    onError: () => toast.error('Submit failed'),
  });

  async function uploadAudio(trackId: string, file: File) {
    if (!draftId) return;
    setUploadProgress((p) => ({ ...p, [trackId]: 0 }));
    const { uploadUrl, objectKey } = await getAudioUploadUrl(draftId, trackId, file.name);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress((p) => ({ ...p, [trackId]: Math.round((e.loaded / e.total) * 100) }));
        }
      };
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed')));
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.open('PUT', uploadUrl);
      xhr.send(file);
    });

    await confirmAudioUpload(draftId, trackId, objectKey);
    queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
    setUploadProgress((p) => ({ ...p, [trackId]: 100 }));
    toast.success('Audio uploaded');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Upload Music</h1>

      {!draftId ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Create release</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Album or single title"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Genre</Label>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Pop, Electronic"
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title || createMutation.isPending}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Create draft
            </Button>
          </CardContent>
        </Card>
      ) : loadingDraft ? (
        <Skeleton className="h-40 w-full" />
      ) : draft ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{draft.title}</span>
                <Badge>{draft.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {draft.tracks.map((track) => (
                  <div key={track.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      {track.audioConfirmed ? (
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="flex-1 text-sm font-medium">{track.title}</span>
                      <Badge variant="outline" className="text-xs">{track.status}</Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeTrackMutation.mutate(track.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {!track.audioConfirmed && (
                      <div className="mt-2 space-y-2">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline">
                          <FileAudio className="h-4 w-4" />
                          <span>Upload audio file</span>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadAudio(track.id, file);
                            }}
                          />
                        </label>
                        {uploadProgress[track.id] != null && (
                          <Progress value={uploadProgress[track.id]} className="h-1" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newTrackTitle}
                  onChange={(e) => setNewTrackTitle(e.target.value)}
                  placeholder="New track title"
                  onKeyDown={(e) => e.key === 'Enter' && newTrackTitle && addTrackMutation.mutate()}
                />
                <Button
                  variant="outline"
                  onClick={() => addTrackMutation.mutate()}
                  disabled={!newTrackTitle || addTrackMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => submitMutation.mutate()}
                disabled={
                  submitMutation.isPending ||
                  draft.tracks.length === 0 ||
                  !draft.tracks.every((t) => t.audioConfirmed)
                }
              >
                <Upload className="h-4 w-4" />
                Submit for processing
              </Button>
              {!draft.tracks.every((t) => t.audioConfirmed) && draft.tracks.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Upload audio for all tracks before submitting
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
