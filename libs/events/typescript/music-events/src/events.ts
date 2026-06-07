// ─── Common header ────────────────────────────────────────────────────────────

export interface EventHeader {
  eventId: string;
  eventType: string;
  timestamp: string;      // ISO 8601 date-time
  sourceService: string;
  correlationId?: string; // uuid — distributed tracing
}

// ─── Upload events ────────────────────────────────────────────────────────────

export interface TrackUploadedEvent extends EventHeader {
  eventType: 'TRACK_UPLOADED';
  data: {
    uploadJobId: string;
    uploaderId: string;
    originalFilename: string;
    title: string;
    genre?: string;
    storageUrl: string;
    sizeBytes: number;
  };
}

export interface AudioAsset {
  bitrate: number;
  format: 'MP3' | 'AAC' | 'FLAC' | 'OGG';
  storageUrl: string;
  sizeBytes: number;
}

export interface TranscodeCompletedEvent extends EventHeader {
  eventType: 'TRANSCODE_COMPLETED';
  data: {
    uploadJobId: string;
    uploaderId: string;
    title: string;
    genre?: string;
    albumId?: string;
    durationMs: number;
    waveformUrl?: string;
    assets: AudioAsset[];
  };
}

export interface TranscodeFailedEvent extends EventHeader {
  eventType: 'TRANSCODE_FAILED';
  data: {
    uploadJobId: string;
    uploaderId: string;
    errorMessage: string;
    originalStorageUrl: string;
  };
}

// ─── Catalog events ───────────────────────────────────────────────────────────

export interface TrackPublishedEvent extends EventHeader {
  eventType: 'TRACK_PUBLISHED';
  data: {
    trackId: string;
    title: string;
    durationMs: number;
    coverUrl?: string;
    genre: string;
    artistId: string;
    artistName: string;
    albumId?: string;
    albumTitle?: string;
    assets: Array<{ bitrate: number; format: string; storageUrl: string }>;
  };
}

export interface TrackUpdatedEvent extends EventHeader {
  eventType: 'TRACK_UPDATED';
  data: {
    trackId: string;
    title: string;
    genre: string;
    coverUrl?: string;
    artistName: string;
  };
}

export interface TrackDeletedEvent extends EventHeader {
  eventType: 'TRACK_DELETED';
  data: { trackId: string };
}

// ─── Streaming events ─────────────────────────────────────────────────────────

export type PlaySource = 'BROWSE' | 'PLAYLIST' | 'SEARCH' | 'RECOMMENDATION' | 'ALBUM' | 'ARTIST';

export interface TrackPlayedEvent extends EventHeader {
  eventType: 'TRACK_PLAYED';
  data: {
    userId: string;
    trackId: string;
    genre: string;
    artistId: string;
    durationMs: number;
    source: PlaySource;
    completedFull: boolean;
    playedAt: string; // ISO 8601
  };
}

// ─── User events ──────────────────────────────────────────────────────────────

export interface UserRegisteredEvent extends EventHeader {
  eventType: 'USER_REGISTERED';
  data: { userId: string; displayName: string; email: string };
}

export interface UserFollowedEvent extends EventHeader {
  eventType: 'USER_FOLLOWED';
  data: { followerId: string; followerName: string; followingId: string };
}

// ─── Playlist events ──────────────────────────────────────────────────────────

export interface PlaylistSharedEvent extends EventHeader {
  eventType: 'PLAYLIST_SHARED';
  data: {
    playlistId: string;
    playlistName: string;
    ownerId: string;
    ownerName: string;
    sharedWithUserId: string;
  };
}

export interface CollaboratorAddedEvent extends EventHeader {
  eventType: 'COLLABORATOR_ADDED';
  data: {
    playlistId: string;
    playlistName: string;
    ownerId: string;
    collaboratorId: string;
    role: 'EDITOR' | 'VIEWER';
  };
}

export interface PlaylistTrackAddedEvent extends EventHeader {
  eventType: 'PLAYLIST_TRACK_ADDED';
  data: {
    playlistId: string;
    playlistName: string;
    trackId: string;
    trackTitle: string;
    addedBy: string;
    addedByName: string;
    collaboratorIds: string[];
  };
}

// ─── Union type ───────────────────────────────────────────────────────────────

export type MusicEvent =
  | TrackUploadedEvent
  | TranscodeCompletedEvent
  | TranscodeFailedEvent
  | TrackPublishedEvent
  | TrackUpdatedEvent
  | TrackDeletedEvent
  | TrackPlayedEvent
  | UserRegisteredEvent
  | UserFollowedEvent
  | PlaylistSharedEvent
  | CollaboratorAddedEvent
  | PlaylistTrackAddedEvent;
