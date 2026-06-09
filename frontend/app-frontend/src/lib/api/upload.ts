import { apiGet, apiPost, apiDelete } from './client';
import type { PaginatedResponse, DraftDto, TrackDraftDto, UploadJobDto, UploadJobDetailDto } from './types';

export function createDraft(form: FormData) {
  return apiPost<DraftDto>('/upload/drafts', form);
}

export function getDraft(draftId: string) {
  return apiGet<DraftDto>(`/upload/drafts/${draftId}`);
}

export function addTrackToDraft(draftId: string, body: { title: string; trackNumber: number }) {
  return apiPost<TrackDraftDto>(`/upload/drafts/${draftId}/tracks`, body);
}

export function removeTrackFromDraft(draftId: string, trackId: string) {
  return apiDelete(`/upload/drafts/${draftId}/tracks/${trackId}`);
}

export function getAudioUploadUrl(draftId: string, trackId: string, filename: string) {
  return apiGet<{ uploadUrl: string; objectKey: string }>(
    `/upload/drafts/${draftId}/tracks/${trackId}/audio-url?filename=${encodeURIComponent(filename)}`
  );
}

export function confirmAudioUpload(draftId: string, trackId: string, objectKey: string) {
  return apiPost<DraftDto>(`/upload/drafts/${draftId}/tracks/${trackId}/confirm`, { objectKey });
}

export function submitDraft(draftId: string) {
  return apiPost<UploadJobDto[]>(`/upload/drafts/${draftId}/submit`);
}

export function cancelDraft(draftId: string) {
  return apiPost<void>(`/upload/drafts/${draftId}/cancel`);
}

export function getUploadJobs(params: { page?: number; size?: number; status?: string } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<UploadJobDto>>(`/upload/jobs${q ? `?${q}` : ''}`);
}

export function getUploadJob(jobId: string) {
  return apiGet<UploadJobDetailDto>(`/upload/jobs/${jobId}`);
}

export function retryJob(jobId: string) {
  return apiPost<UploadJobDto>(`/upload/jobs/${jobId}/retry`);
}

export function cancelJob(jobId: string) {
  return apiPost<UploadJobDto>(`/upload/jobs/${jobId}/cancel`);
}
