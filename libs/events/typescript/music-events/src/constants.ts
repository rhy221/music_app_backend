export const EXCHANGES = {
  UPLOAD: 'events.upload',
  CATALOG: 'events.catalog',
  STREAMING: 'events.streaming',
  USER: 'events.user',
  PLAYLIST: 'events.playlist',
} as const;

export const ROUTING_KEYS = {
  TRACK_UPLOADED: 'events.track.uploaded',
  TRANSCODE_COMPLETED: 'events.transcode.completed',
  TRANSCODE_FAILED: 'events.transcode.failed',
  TRACK_PUBLISHED: 'events.track.published',
  TRACK_UPDATED: 'events.track.updated',
  TRACK_DELETED: 'events.track.deleted',
  TRACK_PLAYED: 'events.track.played',
  USER_REGISTERED: 'events.user.registered',
  USER_FOLLOWED: 'events.user.followed',
  PLAYLIST_SHARED: 'events.playlist.shared',
  COLLABORATOR_ADDED: 'events.playlist.collaborator.added',
  PLAYLIST_TRACK_ADDED: 'events.playlist.track.added',
} as const;
