'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, XCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getUploadJobs, retryJob, cancelJob } from '@/lib/api/upload';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  UPLOADING:   { icon: Loader2,       color: 'default',      label: 'Uploading' },
  TRANSCODING: { icon: Loader2,       color: 'default',      label: 'Transcoding' },
  PUBLISHING:  { icon: Loader2,       color: 'default',      label: 'Publishing' },
  PUBLISHED:   { icon: CheckCircle2,  color: 'default',      label: 'Published' },
  FAILED:      { icon: XCircle,       color: 'destructive',  label: 'Failed' },
  CANCELLED:   { icon: XCircle,       color: 'secondary',    label: 'Cancelled' },
};

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['upload-jobs', page],
    queryFn: () => getUploadJobs({ page, size: 20 }),
    refetchInterval: 5000,
  });

  const retryMutation = useMutation({
    mutationFn: retryJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-jobs'] });
      toast.success('Job retrying');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-jobs'] });
      toast.success('Job cancelled');
    },
  });

  return (
    <div className="space-y-6 p-6">
      <h1 className="mb-6 text-2xl font-bold">Upload Jobs</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.content.map((job) => {
            const cfg = STATUS_CONFIG[job.status];
            const Icon = cfg.icon;
            return (
              <Card key={job.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Icon className={`h-5 w-5 flex-shrink-0 ${ ['UPLOADING','TRANSCODING','PUBLISHING'].includes(job.status) ? 'animate-spin text-primary' : job.status === 'PUBLISHED' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <p className="font-medium">{job.trackTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={cfg.color}>{cfg.label}</Badge>
                  {job.status === 'FAILED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryMutation.mutate(job.id)}
                      disabled={retryMutation.isPending}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                  )}
                  {['UPLOADING', 'TRANSCODING', 'PUBLISHING'].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelMutation.mutate(job.id)}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {data?.content.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No upload jobs yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
