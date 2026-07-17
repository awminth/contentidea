export interface User {
  username: string;
  fullName: string;
  role: string;
}

export type ContentStatus = 'Draft' | 'Scheduled' | 'Posted';

export interface Post {
  id: string; // Used client-side, maps to INT in MySQL
  title: string;
  description?: string;
  platform?: string;
  topic: string;
  postDate: string; // YYYY-MM-DD
  postTime?: string; // e.g. "10:30 AM"
  contentType: 'Image' | 'Video' | 'Carousels' | 'Text' | 'Link';
  status: ContentStatus;
  caption: string;
  imagePrompt: string;
  hashtags: string;
  // Performance metrics (only populated if status is 'Posted')
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  reach: number;
  postedAt?: string; // ISO DateTime
}

export interface DailySuggestion {
  id: string;
  topic: string;
  description: string;
  contentType: 'Image' | 'Video' | 'Carousels' | 'Text' | 'Link';
  caption: string;
  imagePrompt: string;
  hashtags: string;
  isAdded: boolean;
  postTime?: string; // e.g. "10:30 AM"
}

export interface PageStats {
  followers: number;
  reach: number;
  engagement: number;
  profileViews: number;
}
