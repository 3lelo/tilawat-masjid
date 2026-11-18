import AsyncStorage from '@react-native-async-storage/async-storage';
import { Folder, AudioFile, Reel } from './supabase';

const CACHE_FOLDERS_PREFIX = '@tilawat_cache_folders_';
const CACHE_AUDIO_PREFIX = '@tilawat_cache_audio_';
const CACHE_REELS_KEY = '@tilawat_cache_reels';
const CONTINUE_LISTENING_KEY = '@tilawat_continue_listening';
const OFFLINE_FAVOURITES_KEY = '@tilawat_offline_favourites';

// Default mock data matching seed.sql for instant offline & demo use
export const MOCK_ROOT_FOLDERS: Folder[] = [
  {
    id: 'f-prayers',
    parent_id: null,
    path: 'f_prayers',
    name: 'الصلوات الجهرية',
    name_normalized: 'الصلوات الجهريه',
    type: 'normal',
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'f-jumaa',
    parent_id: null,
    path: 'f_jumaa',
    name: 'خطب الجمعة',
    name_normalized: 'خطب الجمعه',
    type: 'normal',
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'f-taraweeh',
    parent_id: null,
    path: 'f_taraweeh',
    name: 'تراويح وتهجد رمضان',
    name_normalized: 'تراويح وتهجد رمضان',
    type: 'normal',
    sort_order: 3,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'f-regular',
    parent_id: null,
    path: 'f_regular',
    name: 'الصلوات العادية',
    name_normalized: 'الصلوات العاديه',
    type: 'normal',
    sort_order: 4,
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const MOCK_SUBFOLDERS: { [parentId: string]: Folder[] } = {
  'f-prayers': [
    {
      id: 'f-fajr',
      parent_id: 'f-prayers',
      path: 'f_prayers.f_fajr',
      name: 'صلاة الفجر',
      name_normalized: 'صلاه الفجر',
      type: 'normal',
      sort_order: 1,
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'f-maghrib-isha',
      parent_id: 'f-prayers',
      path: 'f_prayers.f_maghrib_isha',
      name: 'صلاة المغرب والعشاء',
      name_normalized: 'صلاه المغرب والعشاء',
      type: 'normal',
      sort_order: 2,
      created_at: '2025-01-01T00:00:00Z',
    },
  ],
  'f-jumaa': [
    {
      id: 'f-jumaa-1446',
      parent_id: 'f-jumaa',
      path: 'f_jumaa.f_jumaa_1446',
      name: 'عام 1446 هـ / 2024 - 2025 م',
      name_normalized: 'عام 1446 هـ / 2024 - 2025 م',
      type: 'normal',
      sort_order: 1,
      created_at: '2025-01-01T00:00:00Z',
    },
  ],
  'f-regular': [
    {
      id: 'f-regular-2025',
      parent_id: 'f-regular',
      path: 'f_regular.f_regular_2025',
      name: 'عام 2025 (مرتبة بالأشهر)',
      name_normalized: 'عام 2025 (مرتبه بالاشهر)',
      type: 'year_month',
      sort_order: 1,
      created_at: '2025-01-01T00:00:00Z',
    },
  ],
};

export const MOCK_AUDIO_FILES: { [folderId: string]: AudioFile[] } = {
  'f-fajr': [
    {
      id: 'a-1',
      folder_id: 'f-fajr',
      folder_path: 'f_prayers.f_fajr',
      title: 'سورة مريم كاملة - تلاوة خاشعة',
      title_normalized: 'سوره مريم كامله - تلاوه خاشعه',
      speaker: 'الشيخ عبد الله بن محمد',
      speaker_normalized: 'الشيخ عبد الله بن محمد',
      description: 'تلاوة ندية من صلاة الفجر بمسجد الكبير',
      recorded_at: '2025-02-15',
      audio_url: 'https://server8.mp3quran.net/afs/019.mp3',
      duration_seconds: 1240,
      size_bytes: 9920000,
      status: 'ready',
      created_at: '2025-02-15T05:30:00Z',
    },
    {
      id: 'a-2',
      folder_id: 'f-fajr',
      folder_path: 'f_prayers.f_fajr',
      title: 'سورة ق والذاريات',
      title_normalized: 'سوره ق والذاريات',
      speaker: 'الشيخ فهد العتيبي',
      speaker_normalized: 'الشيخ فهد العتيبي',
      description: 'قراءة هادئة لصلاة الفجر',
      recorded_at: '2025-02-14',
      audio_url: 'https://server8.mp3quran.net/afs/050.mp3',
      duration_seconds: 780,
      size_bytes: 6240000,
      status: 'ready',
      created_at: '2025-02-14T05:30:00Z',
    },
  ],
  'f-maghrib-isha': [
    {
      id: 'a-3',
      folder_id: 'f-maghrib-isha',
      folder_path: 'f_prayers.f_maghrib_isha',
      title: 'سورة الرحمن والواقعة',
      title_normalized: 'سوره الرحمن والواقعه',
      speaker: 'الشيخ إبراهيم الحربي',
      speaker_normalized: 'الشيخ ابراهيم الحربي',
      description: 'صلاة العشاء - ليلة مباركة',
      recorded_at: '2025-02-12',
      audio_url: 'https://server8.mp3quran.net/afs/055.mp3',
      duration_seconds: 960,
      size_bytes: 7680000,
      status: 'ready',
      created_at: '2025-02-12T19:30:00Z',
    },
    {
      id: 'a-4',
      folder_id: 'f-maghrib-isha',
      folder_path: 'f_prayers.f_maghrib_isha',
      title: 'أواخر سورة الحشر وقصار السور',
      title_normalized: 'اواخر سوره الحشر وقصار السور',
      speaker: 'الشيخ عبد الله بن محمد',
      speaker_normalized: 'الشيخ عبد الله بن محمد',
      description: 'صلاة المغرب',
      recorded_at: '2025-02-10',
      audio_url: 'https://server8.mp3quran.net/afs/059.mp3',
      duration_seconds: 510,
      size_bytes: 4080000,
      status: 'ready',
      created_at: '2025-02-10T18:15:00Z',
    },
  ],
  'f-regular-2025': [
    {
      id: 'a-5',
      folder_id: 'f-regular-2025',
      folder_path: 'f_regular.f_regular_2025',
      title: 'سورة الإسراء - تلاوة عشاء',
      title_normalized: 'سوره الاسراء - تلاوه عشاء',
      speaker: 'الشيخ عبد الله بن محمد',
      speaker_normalized: 'الشيخ عبد الله بن محمد',
      description: 'تسجيل صلاة العشاء',
      recorded_at: '2025-03-05',
      audio_url: 'https://server8.mp3quran.net/afs/017.mp3',
      duration_seconds: 1150,
      size_bytes: 9200000,
      status: 'ready',
      created_at: '2025-03-05T19:30:00Z',
    },
    {
      id: 'a-6',
      folder_id: 'f-regular-2025',
      folder_path: 'f_regular.f_regular_2025',
      title: 'سورة يوسف كاملة',
      title_normalized: 'سوره يوسف كامله',
      speaker: 'الشيخ فهد العتيبي',
      speaker_normalized: 'الشيخ فهد العتيبي',
      description: 'صلاة الفجر',
      recorded_at: '2025-02-20',
      audio_url: 'https://server8.mp3quran.net/afs/012.mp3',
      duration_seconds: 1820,
      size_bytes: 14560000,
      status: 'ready',
      created_at: '2025-02-20T05:30:00Z',
    },
    {
      id: 'a-7',
      folder_id: 'f-regular-2025',
      folder_path: 'f_regular.f_regular_2025',
      title: 'سورة النجم والقمر',
      title_normalized: 'سوره النجم والقمر',
      speaker: 'الشيخ إبراهيم الحربي',
      speaker_normalized: 'الشيخ ابراهيم الحربي',
      description: 'صلاة المغرب',
      recorded_at: '2025-02-08',
      audio_url: 'https://server8.mp3quran.net/afs/053.mp3',
      duration_seconds: 640,
      size_bytes: 5120000,
      status: 'ready',
      created_at: '2025-02-08T18:15:00Z',
    },
    {
      id: 'a-8',
      folder_id: 'f-regular-2025',
      folder_path: 'f_regular.f_regular_2025',
      title: 'سورة طه',
      title_normalized: 'سوره طه',
      speaker: 'الشيخ عبد الله بن محمد',
      speaker_normalized: 'الشيخ عبد الله بن محمد',
      description: 'صلاة الفجر',
      recorded_at: '2025-01-28',
      audio_url: 'https://server8.mp3quran.net/afs/020.mp3',
      duration_seconds: 1320,
      size_bytes: 10560000,
      status: 'ready',
      created_at: '2025-01-28T05:30:00Z',
    },
  ],
};

export const MOCK_REELS: Reel[] = [
  {
    id: 'r-1',
    url: 'https://www.youtube.com/shorts/5O3R_b7pI-0',
    platform: 'youtube',
    title: 'تلاوة مؤثرة من سورة طه بصوت شجي',
    sort_order: 1,
    created_at: '2025-02-01T00:00:00Z',
  },
  {
    id: 'r-2',
    url: 'https://www.youtube.com/shorts/M7lc1UVf-VE',
    platform: 'youtube',
    title: 'مقطع من دعاء القنوت والتهجد',
    sort_order: 2,
    created_at: '2025-02-02T00:00:00Z',
  },
  {
    id: 'r-3',
    url: 'https://www.instagram.com/reel/C8qV51yO1_z/',
    platform: 'instagram',
    title: 'نفحات من رحاب المسجد الكبير',
    sort_order: 3,
    created_at: '2025-02-03T00:00:00Z',
  },
];

// Cache helper functions
export async function getCachedFolders(parentId: string | null): Promise<Folder[] | null> {
  try {
    const key = `${CACHE_FOLDERS_PREFIX}${parentId || 'root'}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedFolders(parentId: string | null, folders: Folder[]): Promise<void> {
  try {
    const key = `${CACHE_FOLDERS_PREFIX}${parentId || 'root'}`;
    await AsyncStorage.setItem(key, JSON.stringify(folders));
  } catch {}
}

export async function getCachedAudioFiles(folderId: string): Promise<AudioFile[] | null> {
  try {
    const key = `${CACHE_AUDIO_PREFIX}${folderId}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedAudioFiles(folderId: string, files: AudioFile[]): Promise<void> {
  try {
    const key = `${CACHE_AUDIO_PREFIX}${folderId}`;
    await AsyncStorage.setItem(key, JSON.stringify(files));
  } catch {}
}

export interface ContinueListeningItem {
  audio: AudioFile;
  positionSeconds: number;
  updatedAt: string;
}

export async function getLocalContinueListening(): Promise<ContinueListeningItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CONTINUE_LISTENING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveLocalPlaybackProgress(audio: AudioFile, positionSeconds: number): Promise<void> {
  try {
    const list = await getLocalContinueListening();
    const filtered = list.filter((item) => item.audio.id !== audio.id);
    const updated = [
      {
        audio,
        positionSeconds,
        updatedAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 10); // Keep latest 10
    await AsyncStorage.setItem(CONTINUE_LISTENING_KEY, JSON.stringify(updated));
  } catch {}
}

export async function getLocalFavourites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_FAVOURITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleLocalFavourite(audioId: string): Promise<boolean> {
  try {
    const favs = await getLocalFavourites();
    const index = favs.indexOf(audioId);
    let isFav = false;
    if (index >= 0) {
      favs.splice(index, 1);
      isFav = false;
    } else {
      favs.push(audioId);
      isFav = true;
    }
    await AsyncStorage.setItem(OFFLINE_FAVOURITES_KEY, JSON.stringify(favs));
    return isFav;
  } catch {
    return false;
  }
}
