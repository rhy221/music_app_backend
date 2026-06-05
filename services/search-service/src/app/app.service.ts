import { Injectable } from '@nestjs/common';

const MOCK_TRACKS = [
  {
    trackId: 'track-001',
    title: 'Starlight Serenade',
    artist: { artistId: 'artist-001', displayName: 'Luna Echo' },
    album: { albumId: 'album-001', title: 'Midnight Dreams' },
    duration: 215,
    genre: 'POP',
    score: 0.95,
  },
  {
    trackId: 'track-002',
    title: 'Ocean Waves',
    artist: { artistId: 'artist-002', displayName: 'Deep Blue' },
    album: { albumId: 'album-002', title: 'Sea Stories' },
    duration: 198,
    genre: 'AMBIENT',
    score: 0.88,
  },
];

const MOCK_ARTISTS = [
  {
    artistId: 'artist-001',
    displayName: 'Luna Echo',
    followerCount: 25_000,
    score: 0.92,
  },
  {
    artistId: 'artist-002',
    displayName: 'Deep Blue',
    followerCount: 14_500,
    score: 0.85,
  },
];

@Injectable()
export class AppService {
  search(q: string, type?: string) {
    const tracks = q ? MOCK_TRACKS.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())) : MOCK_TRACKS;
    const artists = q ? MOCK_ARTISTS.filter((a) => a.displayName.toLowerCase().includes(q.toLowerCase())) : MOCK_ARTISTS;
    return {
      query: q,
      tracks: { items: tracks, total: tracks.length },
      artists: { items: artists, total: artists.length },
      albums: { items: [], total: 0 },
      playlists: { items: [], total: 0 },
    };
  }

  searchTracks(q: string, sort = 'relevance', page = 0, size = 20) {
    const items = q ? MOCK_TRACKS.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())) : MOCK_TRACKS;
    return { items, total: items.length, page, size };
  }

  searchArtists(q: string, page = 0) {
    const items = q ? MOCK_ARTISTS.filter((a) => a.displayName.toLowerCase().includes(q.toLowerCase())) : MOCK_ARTISTS;
    return { items, total: items.length, page };
  }

  searchAlbums(q: string, page = 0) {
    return { items: [], total: 0, page };
  }

  autocomplete(q: string) {
    const suggestions = q
      ? ['Luna Echo', 'Starlight Serenade', 'Ocean Waves', 'Deep Blue', 'Midnight Dreams']
          .filter((s) => s.toLowerCase().startsWith(q.toLowerCase()))
      : [];
    return { suggestions };
  }
}
