import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
  RepeatMode as TPRepeatMode,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import { AudioFile, supabase, isDemoMode } from '../lib/supabase';
import { getLocalAudioUri } from '../lib/storage';
import { saveLocalPlaybackProgress, toggleLocalFavourite, getLocalFavourites } from '../lib/cache';
import { useAuth } from './AuthContext';

export type RepeatMode = 'off' | 'repeat_one' | 'repeat_folder';
export type SleepTimerOption = null | 15 | 30 | 60 | 'end_of_file';

interface AudioPlayerContextType {
  currentTrack: AudioFile | null;
  queue: AudioFile[];
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  playbackSpeed: number;
  repeatMode: RepeatMode;
  sleepTimer: SleepTimerOption;
  sleepTimerRemainingSeconds: number | null;
  isFullPlayerVisible: boolean;
  isFavourite: boolean;
  isMiniPlayerDismissed: boolean;
  
  // Actions
  playTrack: (track: AudioFile, trackQueue?: AudioFile[], initialPosition?: number) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  skipForward15: () => Promise<void>;
  skipBackward15: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  setPlaybackSpeed: (speed: number) => Promise<void>;
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
  setSleepTimer: (option: SleepTimerOption) => void;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  dismissMiniPlayer: () => void;
  toggleFavourite: () => Promise<boolean>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

let isPlayerSetup = false;

async function setupTrackPlayer() {
  if (isPlayerSetup) return;
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 2,
    });
    isPlayerSetup = true;
  } catch (err) {
    // Player may already be initialized
    isPlayerSetup = true;
  }
}

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const playbackState = usePlaybackState();
  const progress = useProgress();

  const [currentTrack, setCurrentTrack] = useState<AudioFile | null>(null);
  const [queue, setQueue] = useState<AudioFile[]>([]);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.0);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('off');
  const [sleepTimer, setSleepTimerState] = useState<SleepTimerOption>(null);
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] = useState<number | null>(null);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState<boolean>(false);
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState<boolean>(false);
  const [isFavourite, setIsFavourite] = useState<boolean>(false);

  const sleepTimerRef = useRef<any>(null);
  const progressSaveRef = useRef<number>(0);

  // Setup player on mount
  useEffect(() => {
    setupTrackPlayer();
  }, []);

  const stateVal = typeof playbackState === 'object' && playbackState !== null && 'state' in playbackState
    ? (playbackState as any).state
    : playbackState;

  const isPlaying = stateVal === State.Playing;
  const isBuffering = stateVal === State.Buffering || stateVal === State.Loading;

  // Check favourite status when track or user changes
  useEffect(() => {
    if (!currentTrack) {
      setIsFavourite(false);
      return;
    }

    if (user && !isDemoMode) {
      supabase
        .from('favourites')
        .select('audio_id')
        .eq('user_id', user.id)
        .eq('audio_id', currentTrack.id)
        .maybeSingle()
        .then(({ data }) => {
          setIsFavourite(!!data);
        });
    } else {
      getLocalFavourites().then((favs) => {
        setIsFavourite(favs.includes(currentTrack.id));
      });
    }
  }, [currentTrack, user]);

  // Periodic position persistence (every 5 seconds)
  useEffect(() => {
    if (!currentTrack || !isPlaying || progress.position <= 0) return;

    const currentPos = Math.floor(progress.position);
    if (Math.abs(currentPos - progressSaveRef.current) >= 5) {
      progressSaveRef.current = currentPos;
      
      // Save locally
      saveLocalPlaybackProgress(currentTrack, currentPos);

      // Save to Supabase for signed-in users
      if (user && !isDemoMode) {
        supabase.from('playback_progress').upsert({
          user_id: user.id,
          audio_id: currentTrack.id,
          position_seconds: currentPos,
          updated_at: new Date().toISOString(),
        }).then(() => {});
      }
    }
  }, [progress.position, isPlaying, currentTrack, user]);

  // Sleep timer interval
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (sleepTimer === null) {
      setSleepTimerRemainingSeconds(null);
      return;
    }

    if (typeof sleepTimer === 'number') {
      let secondsLeft = sleepTimer * 60;
      setSleepTimerRemainingSeconds(secondsLeft);

      sleepTimerRef.current = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
          TrackPlayer.pause();
          setSleepTimerState(null);
          setSleepTimerRemainingSeconds(null);
        } else {
          setSleepTimerRemainingSeconds(secondsLeft);
        }
      }, 1000);
    }

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimer]);

  // Handle 'end_of_file' sleep timer
  useEffect(() => {
    if (sleepTimer === 'end_of_file' && progress.duration > 0) {
      if (progress.duration - progress.position <= 2) {
        TrackPlayer.pause();
        setSleepTimerState(null);
      }
    }
  }, [sleepTimer, progress.position, progress.duration]);

  // Play a specific track
  const playTrack = async (
    track: AudioFile,
    trackQueue: AudioFile[] = [],
    initialPosition: number = 0
  ) => {
    await setupTrackPlayer();

    // Check if file is downloaded locally
    const localUri = await getLocalAudioUri(track.id);
    const audioUrl = localUri || track.audio_url;

    const effectiveQueue = trackQueue.length > 0 ? trackQueue : [track];
    setQueue(effectiveQueue);
    setCurrentTrack(track);
    setIsMiniPlayerDismissed(false);

    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.id,
        url: audioUrl,
        title: track.title,
        artist: track.speaker,
        artwork: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80',
        duration: track.duration_seconds,
      });

      if (initialPosition > 0 && initialPosition < track.duration_seconds - 5) {
        await TrackPlayer.seekTo(initialPosition);
      }

      await TrackPlayer.setRate(playbackSpeed);
      await TrackPlayer.play();
    } catch (err) {
      console.warn('TrackPlayer play error:', err);
    }
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const seekTo = async (seconds: number) => {
    await TrackPlayer.seekTo(seconds);
  };

  const skipForward15 = async () => {
    const newPos = Math.min(progress.duration, progress.position + 15);
    await TrackPlayer.seekTo(newPos);
  };

  const skipBackward15 = async () => {
    const newPos = Math.max(0, progress.position - 15);
    await TrackPlayer.seekTo(newPos);
  };

  const skipToNext = async () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((item) => item.id === currentTrack.id);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      const nextTrack = queue[currentIndex + 1];
      await playTrack(nextTrack, queue);
    } else if (repeatMode === 'repeat_folder' && queue.length > 0) {
      // Loop to beginning of folder
      await playTrack(queue[0], queue);
    }
  };

  const skipToPrevious = async () => {
    if (!currentTrack || queue.length === 0) return;
    // If past 5 seconds, restart current track
    if (progress.position > 5) {
      await TrackPlayer.seekTo(0);
      return;
    }
    const currentIndex = queue.findIndex((item) => item.id === currentTrack.id);
    if (currentIndex > 0) {
      const prevTrack = queue[currentIndex - 1];
      await playTrack(prevTrack, queue);
    }
  };

  const setPlaybackSpeed = async (speed: number) => {
    setPlaybackSpeedState(speed);
    await TrackPlayer.setRate(speed);
  };

  const setRepeatMode = async (mode: RepeatMode) => {
    setRepeatModeState(mode);
    if (mode === 'repeat_one') {
      await TrackPlayer.setRepeatMode(TPRepeatMode.Track);
    } else {
      await TrackPlayer.setRepeatMode(TPRepeatMode.Off);
    }
  };

  const setSleepTimer = (option: SleepTimerOption) => {
    setSleepTimerState(option);
  };

  const openFullPlayer = () => {
    setIsFullPlayerVisible(true);
  };

  const closeFullPlayer = () => {
    setIsFullPlayerVisible(false);
  };

  const dismissMiniPlayer = async () => {
    setIsMiniPlayerDismissed(true);
    await TrackPlayer.pause();
  };

  const toggleFavourite = async (): Promise<boolean> => {
    if (!currentTrack) return false;

    if (user && !isDemoMode) {
      if (isFavourite) {
        await supabase
          .from('favourites')
          .delete()
          .eq('user_id', user.id)
          .eq('audio_id', currentTrack.id);
        setIsFavourite(false);
        return false;
      } else {
        await supabase
          .from('favourites')
          .insert({ user_id: user.id, audio_id: currentTrack.id });
        setIsFavourite(true);
        return true;
      }
    } else {
      const newState = await toggleLocalFavourite(currentTrack.id);
      setIsFavourite(newState);
      return newState;
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        isBuffering,
        position: progress.position,
        duration: progress.duration || currentTrack?.duration_seconds || 0,
        playbackSpeed,
        repeatMode,
        sleepTimer,
        sleepTimerRemainingSeconds,
        isFullPlayerVisible,
        isFavourite,
        isMiniPlayerDismissed,
        playTrack,
        togglePlayPause,
        seekTo,
        skipForward15,
        skipBackward15,
        skipToNext,
        skipToPrevious,
        setPlaybackSpeed,
        setRepeatMode,
        setSleepTimer,
        openFullPlayer,
        closeFullPlayer,
        dismissMiniPlayer,
        toggleFavourite,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = (): AudioPlayerContextType => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
