export interface AlbumDocument {
  id: string;
  title: string;
  coverUrl?: string;
  releaseDate?: string;
  trackCount: number;
  artist: { id: string; name: string };
}
