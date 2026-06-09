export interface SearchTrackHit {
  id: string;
  title: string;
  genre: string;
  durationMs: number;
  coverUrl?: string;
  playCount: number;
  artist: { id: string; name: string };
  album?: { id: string; title: string };
  score: number;
}

export interface SearchArtistHit {
  id: string;
  name: string;
  avatarUrl?: string;
  trackCount: number;
  genreTags: string[];
  score: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  queryTimeMs: number;
}

export interface UnifiedSearchResponse {
  tracks: { items: SearchTrackHit[]; total: number };
  artists: { items: SearchArtistHit[]; total: number };
  totalResults: number;
  queryTimeMs: number;
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'track' | 'artist';
  id: string;
  imageUrl?: string;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}
