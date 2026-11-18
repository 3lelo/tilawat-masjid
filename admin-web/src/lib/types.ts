export interface Folder {
  id: string;
  parent_id: string | null;
  path: string;
  name: string;
  name_normalized: string;
  type: 'normal' | 'year_month';
  sort_order: number;
  cover_image_url?: string | null;
  created_at: string;
  subfolders?: Folder[];
  audio_count?: number;
}

export interface AudioFile {
  id: string;
  folder_id: string;
  folder_path: string;
  title: string;
  title_normalized: string;
  speaker: string;
  speaker_normalized: string;
  description?: string | null;
  recorded_at: string;
  audio_url: string;
  duration_seconds: number;
  size_bytes: number;
  status: 'processing' | 'ready' | 'failed';
  error_message?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Reel {
  id: string;
  url: string;
  platform: 'youtube' | 'instagram' | 'facebook' | 'tiktok';
  title?: string | null;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  role: 'user' | 'admin';
  created_at: string;
}
