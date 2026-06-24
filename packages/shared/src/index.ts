export interface Profile {
  id: string;
  full_name: string | null;
  studio_name: string | null;
  created_at: string;
}

export interface EventFile {
  id: string;
  event_id: string;
  label: string | null;
  photo_url: string;
  video_url: string;
  mind_url: string;
  imagekit_photo_path: string | null;
  imagekit_video_path: string | null;
  imagekit_mind_path: string | null;
  sort_order: number;
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
  files?: EventFile[];
}

export interface PublicEvent {
  id: string;
  title: string;
  slug: string;
  /** @deprecated Use files[] instead */
  photo_url: string;
  /** @deprecated Use files[] instead */
  video_url: string;
  /** @deprecated Use files[] instead */
  mind_url: string;
  files: EventFile[];
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
