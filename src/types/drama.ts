export type DramaSource = 'dramabox' | 'shortmax' | 'netshort' | 'melolo' | 'starshort';

export interface Drama {
  id: string;
  bookId?: string;
  title: string;
  bookName?: string;
  cover: string;
  coverWap?: string;
  horizontalCover?: string;
  intro?: string;
  author?: string;
  hotCode?: string;
  tags?: string[];
  source: DramaSource;
  totalEpisodes?: number;
  isDubbed?: boolean;
}

export interface Episode {
  episodeNumber: number;
  title?: string;
  videoUrl?: string;
  qualities?: VideoQuality[];
  subtitles?: SubtitleTrack[];
}

export interface VideoQuality {
  quality: string; // e.g. "360p", "480p", "720p", "1080p"
  videoUrl: string;
}

export interface SubtitleTrack {
  language: string; // e.g. "id", "en", "zh"
  label: string; // e.g. "Indonesia", "English"
  url: string;
}

export interface WatchHistoryItem {
  dramaId: string;
  source: DramaSource;
  title: string;
  cover: string;
  episodeNumber: number;
  currentTime: number; // in seconds
  duration: number; // in seconds
  updatedAt: number; // timestamp
}

export interface FavoriteItem {
  dramaId: string;
  source: DramaSource;
  title: string;
  cover: string;
  tags?: string[];
  addedAt: number;
}
