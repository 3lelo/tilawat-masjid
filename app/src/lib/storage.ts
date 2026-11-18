import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioFile } from './supabase';

const DOWNLOADS_REGISTRY_KEY = '@tilawat_downloaded_registry';

export interface DownloadedAudioItem {
  audio: AudioFile;
  localUri: string;
  fileSizeBytes: number;
  downloadedAt: string;
}

// Get downloaded items registry
export async function getDownloadedFiles(): Promise<DownloadedAudioItem[]> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Check if specific audio is downloaded
export async function isAudioDownloaded(audioId: string): Promise<boolean> {
  const list = await getDownloadedFiles();
  return list.some((item) => item.audio.id === audioId);
}

// Get local file URI for audio
export async function getLocalAudioUri(audioId: string): Promise<string | null> {
  const list = await getDownloadedFiles();
  const match = list.find((item) => item.audio.id === audioId);
  if (match) {
    try {
      const file = new File(match.localUri);
      if (file.exists) {
        return match.localUri;
      }
    } catch {
      return match.localUri;
    }
  }
  return null;
}

// Download audio file to app private storage
export async function downloadAudioFile(
  audio: AudioFile,
  onProgress?: (progress: number) => void
): Promise<DownloadedAudioItem> {
  const fileExt = audio.audio_url.split('.').pop()?.split('?')[0] || 'm4a';
  const destination = new File(Paths.document, `${audio.id}.${fileExt}`);

  const task = File.createDownloadTask(audio.audio_url, destination, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (onProgress && totalBytes > 0) {
        onProgress(Math.min(1, Math.max(0, bytesWritten / totalBytes)));
      }
    },
  });

  const downloadedFile = await task.downloadAsync();
  if (!downloadedFile) {
    throw new Error('فشل تنزيل الملف الصوتي');
  }
  const sizeBytes = downloadedFile.size || audio.size_bytes;

  const item: DownloadedAudioItem = {
    audio,
    localUri: downloadedFile.uri,
    fileSizeBytes: sizeBytes,
    downloadedAt: new Date().toISOString(),
  };

  const currentList = await getDownloadedFiles();
  const filtered = currentList.filter((x) => x.audio.id !== audio.id);
  const updated = [item, ...filtered];
  await AsyncStorage.setItem(DOWNLOADS_REGISTRY_KEY, JSON.stringify(updated));

  return item;
}

// Delete downloaded audio file
export async function deleteDownloadedFile(audioId: string): Promise<void> {
  const currentList = await getDownloadedFiles();
  const item = currentList.find((x) => x.audio.id === audioId);
  if (item) {
    try {
      const file = new File(item.localUri);
      if (file.exists) {
        file.delete();
      }
    } catch {}
  }
  const updated = currentList.filter((x) => x.audio.id !== audioId);
  await AsyncStorage.setItem(DOWNLOADS_REGISTRY_KEY, JSON.stringify(updated));
}

// Total downloads size in bytes
export async function getTotalDownloadsSize(): Promise<number> {
  const list = await getDownloadedFiles();
  return list.reduce((sum, item) => sum + (item.fileSizeBytes || 0), 0);
}

// Clear all offline files
export async function clearAllDownloads(): Promise<void> {
  const list = await getDownloadedFiles();
  for (const item of list) {
    try {
      const file = new File(item.localUri);
      if (file.exists) {
        file.delete();
      }
    } catch {}
  }
  await AsyncStorage.removeItem(DOWNLOADS_REGISTRY_KEY);
}
