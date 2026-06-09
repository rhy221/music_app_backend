export interface ArtistRef {
  id: string;
  name: string;
}

export interface AlbumRef {
  id: string;
  title: string;
}

export interface TrackDocument {
  id: string;
  title: string;
  genre: string;
  durationMs: number;
  coverUrl?: string;
  playCount: number;
  status: string;
  releaseDate?: string;
  createdAt: string;
  artist: ArtistRef;
  album?: AlbumRef;
}
