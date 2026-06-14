'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Plus, Upload, Trash2, CheckCircle2, Circle,
  FileAudio, ImagePlus, ChevronRight, ChevronLeft, ListOrdered,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  createDraft, getDraft, addTrackToDraft, removeTrackFromDraft,
  getAudioUploadUrl, confirmAudioUpload, submitDraft,
} from '@/lib/api/upload';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { storageUrl } from '@/lib/constants';

const STEPS = ['Release info', 'Upload audio', 'Review & submit'] as const;

export default function UploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Step 0 fields
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseType, setReleaseType] = useState<'SINGLE' | 'ALBUM'>('SINGLE');
  const [releaseDate, setReleaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Step 1 fields
  const [draftId, setDraftId] = useState<string | null>(null);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { data: draft, isLoading: loadingDraft } = useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => getDraft(draftId!),
    enabled: !!draftId,
    refetchInterval: step === 1 ? 5000 : false,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('release_type', releaseType);
      if (genre.trim()) form.append('genre', genre.trim());
      if (releaseDate) form.append('release_date', releaseDate);
      if (thumbnailFile) form.append('thumbnail', thumbnailFile);
      return createDraft(form);
    },
    onSuccess: (data) => {
      setDraftId(data.id);
      setStep(1);
      toast.success('Draft created');
    },
    onError: () => toast.error('Failed to create draft'),
  });

  const addTrackMutation = useMutation({
    mutationFn: () =>
      addTrackToDraft(draftId!, {
        title: newTrackTitle.trim(),
        trackNumber: (draft?.tracks.length ?? 0) + 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
      setNewTrackTitle('');
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

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }

  async function uploadAudio(trackId: string, file: File) {
    if (!draftId) return;
    try {
      setUploadProgress((p) => ({ ...p, [trackId]: 0 }));
      const { uploadUrl, objectKey } = await getAudioUploadUrl(draftId, trackId, file.name);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setUploadProgress((p) => ({ ...p, [trackId]: Math.round((e.loaded / e.total) * 100) }));
        };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject());
        xhr.onerror = () => reject();
        xhr.open('PUT', uploadUrl);
        xhr.send(file);
      });
      await confirmAudioUpload(draftId, trackId, objectKey);
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
      setUploadProgress((p) => ({ ...p, [trackId]: 100 }));
      toast.success(`"${file.name}" uploaded`);
    } catch {
      toast.error('Audio upload failed');
      setUploadProgress((p) => { const n = { ...p }; delete n[trackId]; return n; });
    }
  }

  const allTracksConfirmed = !!draft && draft.tracks.length > 0 && draft.tracks.every((t) => t.audioConfirmed);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upload</h1>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
          <Link href="/upload/jobs">
            <ListOrdered className="h-4 w-4" />
            View jobs
          </Link>
        </Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
              i < step
                ? 'bg-primary text-primary-foreground'
                : i === step
                ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                : 'bg-muted text-muted-foreground',
            )}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-sm', i === step ? 'font-medium' : 'text-muted-foreground')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Release info ── */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Release info</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Release type */}
            <div className="flex gap-3">
              {(['SINGLE', 'ALBUM'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReleaseType(type)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                    releaseType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-foreground',
                  )}
                >
                  {type === 'SINGLE' ? 'Single' : 'Album'}
                </button>
              ))}
            </div>

            {/* Thumbnail */}
            <div>
              <Label>Cover image</Label>
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className={cn(
                  'mt-1 flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-primary',
                  thumbnailPreview ? 'border-transparent p-0' : 'border-border p-8',
                )}
              >
                {thumbnailPreview ? (
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                    <Image src={thumbnailPreview} alt="Cover preview" fill className="object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <span className="text-sm font-medium text-white">Change image</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm">Click to upload cover image</span>
                    <span className="text-xs">PNG, JPG up to 10MB</span>
                  </div>
                )}
              </button>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailChange}
              />
            </div>

            {/* Title */}
            <div>
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={releaseType === 'ALBUM' ? 'Album title' : 'Single title'}
                className="mt-1"
              />
            </div>

            {/* Genre */}
            <div>
              <Label>Genre</Label>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Pop, Electronic, Hip-hop"
                className="mt-1"
              />
            </div>

            {/* Release date */}
            <div>
              <Label>Release date</Label>
              <Input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : (
                <><span>Continue</span><ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Upload audio ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upload audio</span>
              {draft && <Badge variant="outline">{draft.title}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingDraft ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading draft…</div>
            ) : (
              <>
                {/* Track list */}
                <div className="space-y-3">
                  {draft?.tracks.map((track) => (
                    <div key={track.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        {track.audioConfirmed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="flex-1 text-sm font-medium">{track.title}</span>
                        <span className="text-xs text-muted-foreground">#{track.trackNumber}</span>
                        {!track.audioConfirmed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeTrackMutation.mutate(track.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {!track.audioConfirmed && (
                        <div className="mt-2 space-y-1.5">
                          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-primary hover:underline">
                            <FileAudio className="h-4 w-4" />
                            <span>
                              {uploadProgress[track.id] != null && uploadProgress[track.id] < 100
                                ? `Uploading… ${uploadProgress[track.id]}%`
                                : 'Choose audio file'}
                            </span>
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              disabled={uploadProgress[track.id] != null && uploadProgress[track.id] < 100}
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

                {/* Add track */}
                <div className="flex gap-2">
                  <Input
                    value={newTrackTitle}
                    onChange={(e) => setNewTrackTitle(e.target.value)}
                    placeholder="Track title"
                    onKeyDown={(e) => e.key === 'Enter' && newTrackTitle.trim() && addTrackMutation.mutate()}
                  />
                  <Button
                    variant="outline"
                    onClick={() => addTrackMutation.mutate()}
                    disabled={!newTrackTitle.trim() || addTrackMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {draft?.tracks.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Add at least one track to continue
                  </p>
                )}

                <Button
                  className="w-full gap-2"
                  disabled={!allTracksConfirmed}
                  onClick={() => setStep(2)}
                >
                  <span>Review & submit</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {draft && draft.tracks.length > 0 && !allTracksConfirmed && (
                  <p className="text-center text-xs text-muted-foreground">
                    Upload audio for all tracks to continue
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Review & submit ── */}
      {step === 2 && draft && (
        <Card>
          <CardHeader>
            <CardTitle>Review & submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Release preview */}
            <div className="flex items-start gap-4">
              {(thumbnailPreview || draft.thumbnailUrl) && (() => {
                const coverSrc = thumbnailPreview ?? storageUrl(draft.thumbnailUrl);
                return coverSrc ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                    <Image src={coverSrc} alt="Cover" fill className="object-cover" />
                  </div>
                ) : null;
              })()}
              <div>
                <p className="font-semibold">{draft.title}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {draft.releaseType.toLowerCase()}
                  {draft.genre ? ` · ${draft.genre}` : ''}
                </p>
                {draft.releaseDate && (
                  <p className="text-xs text-muted-foreground">
                    Release: {new Date(draft.releaseDate + 'T00:00:00').toLocaleDateString()}
                  </p>
                )}
                <Badge variant="outline" className="mt-1 text-xs">{draft.status}</Badge>
              </div>
            </div>

            {/* Track list */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {draft.tracks.length} track{draft.tracks.length !== 1 ? 's' : ''}
              </p>
              {draft.tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="w-5 text-xs text-muted-foreground">{track.trackNumber}.</span>
                  <span className="flex-1 text-sm">{track.title}</span>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                className="w-full gap-2"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                <Upload className="h-4 w-4" />
                {submitMutation.isPending ? 'Submitting…' : 'Submit for processing'}
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-1 text-muted-foreground"
                onClick={() => setStep(1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Back to tracks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
