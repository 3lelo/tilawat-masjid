import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Environment variables or fallback placeholders
// In production, these are provided via app config or .env
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo-project.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const isDemoMode = SUPABASE_URL.includes('demo-project');

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
  is_favourite?: boolean;
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

export interface PlaybackProgress {
  user_id: string;
  audio_id: string;
  position_seconds: number;
  updated_at: string;
  audio_file?: AudioFile;
}

// Supabase client instance with persistent auth session
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
