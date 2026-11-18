-- Supabase Migration: Initial Schema for Tilawat Almasjid Alkabeer (تلاوات المسجد الكبير)

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Arabic Text Normalization Function
-- Removes tashkeel, tatweel; normalizes alef, yaa, taa marbuta, waw; collapses spaces; converts digits
CREATE OR REPLACE FUNCTION public.normalize_arabic(input text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  IF input IS NULL THEN
    RETURN '';
  END IF;

  result := input;

  -- Remove Tashkeel (diacritics: \u064B-\u065F, \u0670) and Tatweel (\u0640)
  result := regexp_replace(result, '[\u064B-\u065F\u0670\u0640]', '', 'g');

  -- Convert Eastern Arabic-Indic and Persian digits to Western digits
  result := translate(result, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');

  -- Normalize Alef variants (أ إ آ ٱ -> ا), ى -> ي, ة -> ه, ؤ -> و, ئ -> ي
  result := translate(result, 'أإآٱىةؤئ', 'اااائيهوي');

  -- Lowercase any Latin characters
  result := lower(result);

  -- Collapse multiple whitespace characters into a single space and trim
  result := regexp_replace(trim(result), '\s+', ' ', 'g');

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to create profile upon new auth user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'مستخدم جديد'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security Definer function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Folders Table
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  path ltree,
  name text NOT NULL,
  name_normalized text NOT NULL,
  type text NOT NULL DEFAULT 'normal' CHECK (type IN ('normal', 'year_month')),
  sort_order integer NOT NULL DEFAULT 0,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Audio Files Table
CREATE TABLE IF NOT EXISTS public.audio_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  folder_path ltree NOT NULL,
  title text NOT NULL,
  title_normalized text NOT NULL,
  speaker text NOT NULL,
  speaker_normalized text NOT NULL,
  description text,
  recorded_at date NOT NULL DEFAULT current_date,
  audio_url text,
  duration_seconds integer NOT NULL DEFAULT 0,
  size_bytes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Reels Table
CREATE TABLE IF NOT EXISTS public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('youtube', 'instagram', 'facebook', 'tiktok')),
  title text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Favourites Table
CREATE TABLE IF NOT EXISTS public.favourites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_id uuid NOT NULL REFERENCES public.audio_files(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, audio_id)
);

-- 8. Playback Progress Table
CREATE TABLE IF NOT EXISTS public.playback_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_id uuid NOT NULL REFERENCES public.audio_files(id) ON DELETE CASCADE,
  position_seconds integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, audio_id)
);

-- 9. Triggers and Path Maintenance

-- Helper to convert UUID to valid LTREE label (f_<uuid_with_underscores>)
CREATE OR REPLACE FUNCTION public.uuid_to_ltree_label(id uuid)
RETURNS text AS $$
BEGIN
  RETURN 'f_' || replace(id::text, '-', '_');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function for folders
CREATE OR REPLACE FUNCTION public.trg_folders_maintain()
RETURNS trigger AS $$
DECLARE
  parent_path ltree;
  old_path ltree;
  new_path ltree;
BEGIN
  -- Normalize name
  NEW.name_normalized := public.normalize_arabic(NEW.name);

  -- Compute path
  IF NEW.parent_id IS NULL THEN
    NEW.path := text2ltree(public.uuid_to_ltree_label(NEW.id));
  ELSE
    SELECT path INTO parent_path FROM public.folders WHERE id = NEW.parent_id;
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'Parent folder not found for ID %', NEW.parent_id;
    END IF;
    NEW.path := parent_path || text2ltree(public.uuid_to_ltree_label(NEW.id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_folders_before_insert_or_update
  BEFORE INSERT OR UPDATE OF name, parent_id ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.trg_folders_maintain();

-- Cascade path update to subfolders and audio files if a folder is moved
CREATE OR REPLACE FUNCTION public.trg_folders_cascade_path()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.path IS DISTINCT FROM NEW.path THEN
    -- Update child folders recursively
    UPDATE public.folders
    SET path = NEW.path || subpath(path, nlevel(OLD.path))
    WHERE path <@ OLD.path AND id <> NEW.id;

    -- Update audio files under this subtree
    UPDATE public.audio_files
    SET folder_path = NEW.path || subpath(folder_path, nlevel(OLD.path))
    WHERE folder_path <@ OLD.path;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_folders_after_update_path
  AFTER UPDATE OF path ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.trg_folders_cascade_path();

-- Trigger function for audio_files
CREATE OR REPLACE FUNCTION public.trg_audio_files_maintain()
RETURNS trigger AS $$
DECLARE
  f_path ltree;
BEGIN
  -- Normalize title and speaker
  NEW.title_normalized := public.normalize_arabic(NEW.title);
  NEW.speaker_normalized := public.normalize_arabic(NEW.speaker);

  -- Fetch folder_path
  SELECT path INTO f_path FROM public.folders WHERE id = NEW.folder_id;
  IF f_path IS NULL THEN
    RAISE EXCEPTION 'Folder not found for ID %', NEW.folder_id;
  END IF;
  NEW.folder_path := f_path;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audio_files_before_insert_or_update
  BEFORE INSERT OR UPDATE OF title, speaker, folder_id ON public.audio_files
  FOR EACH ROW EXECUTE FUNCTION public.trg_audio_files_maintain();

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_folders_path_gist ON public.folders USING gist (path);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders (parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON public.folders (sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_folders_name_trgm ON public.folders USING gin (name_normalized gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_audio_files_folder_path_gist ON public.audio_files USING gist (folder_path);
CREATE INDEX IF NOT EXISTS idx_audio_files_folder_recorded ON public.audio_files (folder_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_files_title_trgm ON public.audio_files USING gin (title_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_audio_files_speaker_trgm ON public.audio_files USING gin (speaker_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_audio_files_status ON public.audio_files (status);

CREATE INDEX IF NOT EXISTS idx_reels_sort_order ON public.reels (sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favourites_user_created ON public.favourites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playback_progress_user ON public.playback_progress (user_id, updated_at DESC);

-- 11. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view profiles; only self can update own basic profile (role cannot be changed by user)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Folders: Everyone can read; only admins can insert, update, delete
CREATE POLICY "Folders viewable by all"
  ON public.folders FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert folders"
  ON public.folders FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update folders"
  ON public.folders FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete folders"
  ON public.folders FOR DELETE
  USING (public.is_admin());

-- Audio files: Ready files viewable by all; admins can see all files; only admins can insert/update/delete
CREATE POLICY "Ready audio files viewable by all, all viewable by admin"
  ON public.audio_files FOR SELECT
  USING (status = 'ready' OR public.is_admin());

CREATE POLICY "Admins can insert audio files"
  ON public.audio_files FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update audio files"
  ON public.audio_files FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete audio files"
  ON public.audio_files FOR DELETE
  USING (public.is_admin());

-- Reels: Viewable by all; admins can manage
CREATE POLICY "Reels viewable by all"
  ON public.reels FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert reels"
  ON public.reels FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update reels"
  ON public.reels FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete reels"
  ON public.reels FOR DELETE
  USING (public.is_admin());

-- Favourites: User owns their favourites
CREATE POLICY "Users view own favourites"
  ON public.favourites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own favourites"
  ON public.favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own favourites"
  ON public.favourites FOR DELETE
  USING (auth.uid() = user_id);

-- Playback Progress: User owns their progress
CREATE POLICY "Users view own playback progress"
  ON public.playback_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert/update own playback progress"
  ON public.playback_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 12. Search RPC Function
-- Supports global search or scoped search within folder subtree (scope_path)
CREATE OR REPLACE FUNCTION public.search_content(
  query text,
  scope_path ltree DEFAULT NULL,
  limit_count int DEFAULT 30,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  result_id uuid,
  result_type text, -- 'folder' or 'audio'
  title text,
  speaker text,
  duration_seconds integer,
  folder_id uuid,
  folder_path ltree,
  recorded_at date,
  audio_url text,
  status text,
  rank real
) AS $$
DECLARE
  norm_query text;
BEGIN
  norm_query := public.normalize_arabic(query);

  IF norm_query = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matched_folders AS (
    SELECT
      f.id AS result_id,
      'folder'::text AS result_type,
      f.name AS title,
      ''::text AS speaker,
      0 AS duration_seconds,
      f.parent_id AS folder_id,
      f.path AS folder_path,
      f.created_at::date AS recorded_at,
      ''::text AS audio_url,
      'ready'::text AS status,
      similarity(f.name_normalized, norm_query) AS rank
    FROM public.folders f
    WHERE
      (scope_path IS NULL OR f.path <@ scope_path)
      AND (
        f.name_normalized % norm_query
        OR f.name_normalized ILIKE '%' || norm_query || '%'
      )
  ),
  matched_audio AS (
    SELECT
      a.id AS result_id,
      'audio'::text AS result_type,
      a.title AS title,
      a.speaker AS speaker,
      a.duration_seconds AS duration_seconds,
      a.folder_id AS folder_id,
      a.folder_path AS folder_path,
      a.recorded_at AS recorded_at,
      a.audio_url AS audio_url,
      a.status AS status,
      GREATEST(
        similarity(a.title_normalized, norm_query) * 1.2,
        similarity(a.speaker_normalized, norm_query)
      ) AS rank
    FROM public.audio_files a
    WHERE
      (a.status = 'ready' OR public.is_admin())
      AND (scope_path IS NULL OR a.folder_path <@ scope_path)
      AND (
        a.title_normalized % norm_query
        OR a.speaker_normalized % norm_query
        OR a.title_normalized ILIKE '%' || norm_query || '%'
        OR a.speaker_normalized ILIKE '%' || norm_query || '%'
      )
  )
  SELECT * FROM (
    SELECT * FROM matched_folders
    UNION ALL
    SELECT * FROM matched_audio
  ) combined
  ORDER BY rank DESC, recorded_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;
