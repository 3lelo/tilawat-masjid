-- Supabase Seed Data for Tilawat Almasjid Alkabeer (تلاوات المسجد الكبير)

DO $$
DECLARE
  f_prayers_id uuid := gen_random_uuid();
  f_fajr_id uuid := gen_random_uuid();
  f_maghrib_isha_id uuid := gen_random_uuid();
  
  f_jumaa_id uuid := gen_random_uuid();
  f_jumaa_1446_id uuid := gen_random_uuid();
  
  f_taraweeh_id uuid := gen_random_uuid();
  
  f_regular_id uuid := gen_random_uuid();
  f_regular_2025_id uuid := gen_random_uuid(); -- year_month folder
  
  f_path ltree;
BEGIN
  -- Clear existing mock data if any
  DELETE FROM public.reels;
  DELETE FROM public.audio_files;
  DELETE FROM public.folders;

  -- 1. Insert Root Folders
  INSERT INTO public.folders (id, parent_id, name, type, sort_order) VALUES
    (f_prayers_id, NULL, 'الصلوات الجهرية', 'normal', 1),
    (f_jumaa_id, NULL, 'خطب الجمعة', 'normal', 2),
    (f_taraweeh_id, NULL, 'تراويح وتهجد رمضان', 'normal', 3),
    (f_regular_id, NULL, 'الصلوات العادية', 'normal', 4);

  -- 2. Insert Subfolders under 'الصلوات الجهرية'
  INSERT INTO public.folders (id, parent_id, name, type, sort_order) VALUES
    (f_fajr_id, f_prayers_id, 'صلاة الفجر', 'normal', 1),
    (f_maghrib_isha_id, f_prayers_id, 'صلاة المغرب والعشاء', 'normal', 2);

  -- 3. Insert Subfolders under 'خطب الجمعة'
  INSERT INTO public.folders (id, parent_id, name, type, sort_order) VALUES
    (f_jumaa_1446_id, f_jumaa_id, 'عام 1446 هـ / 2024 - 2025 م', 'normal', 1);

  -- 4. Insert Year-Month Subfolder under 'الصلوات العادية'
  -- Type 'year_month' displays contents grouped by month automatically
  INSERT INTO public.folders (id, parent_id, name, type, sort_order) VALUES
    (f_regular_2025_id, f_regular_id, 'عام 2025', 'year_month', 1);

  -- 5. Insert Sample Audio Files
  
  -- Files in Fajr
  INSERT INTO public.audio_files (
    id, folder_id, title, speaker, description, recorded_at,
    audio_url, duration_seconds, size_bytes, status
  ) VALUES
  (
    gen_random_uuid(), f_fajr_id, 'سورة مريم كاملة - تلاوة خاشعة', 'الشيخ عبد الله بن محمد',
    'تلاوة ندية من صلاة الفجر بمسجد الكبير',
    '2025-02-15',
    'https://server8.mp3quran.net/afs/019.mp3',
    1240, 9920000, 'ready'
  ),
  (
    gen_random_uuid(), f_fajr_id, 'سورة ق والذاريات', 'الشيخ فهد العتيبي',
    'قراءة هادئة لصلاة الفجر',
    '2025-02-14',
    'https://server8.mp3quran.net/afs/050.mp3',
    780, 6240000, 'ready'
  );

  -- Files in Maghrib & Isha
  INSERT INTO public.audio_files (
    id, folder_id, title, speaker, description, recorded_at,
    audio_url, duration_seconds, size_bytes, status
  ) VALUES
  (
    gen_random_uuid(), f_maghrib_isha_id, 'سورة الرحمن والواقعة', 'الشيخ إبراهيم الحربي',
    'صلاة العشاء - ليلة مباركة',
    '2025-02-12',
    'https://server8.mp3quran.net/afs/055.mp3',
    960, 7680000, 'ready'
  ),
  (
    gen_random_uuid(), f_maghrib_isha_id, 'أواخر سورة الحشر وقصار السور', 'الشيخ عبد الله بن محمد',
    'صلاة المغرب',
    '2025-02-10',
    'https://server8.mp3quran.net/afs/059.mp3',
    510, 4080000, 'ready'
  );

  -- Files in Jumaa
  INSERT INTO public.audio_files (
    id, folder_id, title, speaker, description, recorded_at,
    audio_url, duration_seconds, size_bytes, status
  ) VALUES
  (
    gen_random_uuid(), f_jumaa_1446_id, 'خطبة: فضل الاستغفار وأثره في تفريج الكروب', 'الشيخ عبد الله بن محمد',
    'خطبة الجمعة بتاريخ 16 شعبان 1446 هـ',
    '2025-02-14',
    'https://server8.mp3quran.net/afs/071.mp3',
    1500, 12000000, 'ready'
  ),
  (
    gen_random_uuid(), f_jumaa_1446_id, 'خطبة: بر الوالدين وصلة الأرحام', 'الشيخ إبراهيم الحربي',
    'خطبة الجمعة بتاريخ 9 شعبان 1446 هـ',
    '2025-02-07',
    'https://server8.mp3quran.net/afs/072.mp3',
    1380, 11040000, 'ready'
  );

  -- Files in Year-Month folder (spanning different months in 2025)
  INSERT INTO public.audio_files (
    id, folder_id, title, speaker, description, recorded_at,
    audio_url, duration_seconds, size_bytes, status
  ) VALUES
  -- March 2025
  (
    gen_random_uuid(), f_regular_2025_id, 'سورة الإسراء - تلاوة عشاء', 'الشيخ عبد الله بن محمد',
    'تسجيل صلاة العشاء',
    '2025-03-05',
    'https://server8.mp3quran.net/afs/017.mp3',
    1150, 9200000, 'ready'
  ),
  -- February 2025
  (
    gen_random_uuid(), f_regular_2025_id, 'سورة يوسف كاملة', 'الشيخ فهد العتيبي',
    'صلاة الفجر',
    '2025-02-20',
    'https://server8.mp3quran.net/afs/012.mp3',
    1820, 14560000, 'ready'
  ),
  (
    gen_random_uuid(), f_regular_2025_id, 'سورة النجم والقمر', 'الشيخ إبراهيم الحربي',
    'صلاة المغرب',
    '2025-02-08',
    'https://server8.mp3quran.net/afs/053.mp3',
    640, 5120000, 'ready'
  ),
  -- January 2025
  (
    gen_random_uuid(), f_regular_2025_id, 'سورة طه', 'الشيخ عبد الله بن محمد',
    'صلاة الفجر',
    '2025-01-28',
    'https://server8.mp3quran.net/afs/020.mp3',
    1320, 10560000, 'ready'
  ),
  (
    gen_random_uuid(), f_regular_2025_id, 'سورة الكهف - ترتيل هادئ', 'الشيخ إبراهيم الحربي',
    'صلاة الجمعة والعشاء',
    '2025-01-10',
    'https://server8.mp3quran.net/afs/018.mp3',
    1750, 14000000, 'ready'
  );

  -- 6. Insert Sample Reels
  INSERT INTO public.reels (url, platform, title, sort_order) VALUES
  (
    'https://www.youtube.com/shorts/5O3R_b7pI-0',
    'youtube',
    'تلاوة مؤثرة من سورة طه بصوت شجي',
    1
  ),
  (
    'https://www.youtube.com/shorts/M7lc1UVf-VE',
    'youtube',
    'مقطع من دعاء القنوت والتهجد',
    2
  ),
  (
    'https://www.instagram.com/reel/C8qV51yO1_z/',
    'instagram',
    'نفحات من رحاب المسجد الكبير',
    3
  ),
  (
    'https://www.tiktok.com/@tilawat/video/7384918274910283746',
    'tiktok',
    'أرح سمعك بتلاوة قرآنية مباركة',
    4
  );

END $$;
