export interface Profile {
  id: string;
  full_name: string | null;
  studio_name: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  photo_url: string | null;
  video_url: string | null;
  mind_url: string | null;
  scan_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  slug: string;
  photo_url: string;
  video_url: string;
  mind_url: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  is_published?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface UploadResult {
  photo_url: string;
  video_url: string;
  mind_url: string;
}

export interface AnalyticsSummary {
  total_events: number;
  total_scans: number;
  published_events: number;
}
