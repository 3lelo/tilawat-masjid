import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NativeModules, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import TrackPlayer, {
  Capability,
  State,
  RepeatMode as TPRepeatMode,
  AppKilledPlaybackBehavior,
  Event,
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

// Whether custom native TrackPlayer binary is linked (true in Production APK / Dev Client, false in Expo Go)
const isNativePlayerAvailable = Boolean(NativeModules.TrackPlayerModule);

// Lazy track player setup lock
let isPlayerSetup = false;
let isSettingUp = false;

async function setupTrackPlayer(): Promise<boolean> {
  if (isPlayerSetup) return true;
  if (!isNativePlayerAvailable) return false;
  if (isSettingUp) {
    while (isSettingUp) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return isPlayerSetup;
  }

  isSettingUp = true;
  try {
    // Check if player is already initialized
    try {
      const state = await TrackPlayer.getPlaybackState();
      if (state && state.state !== State.None) {
        isPlayerSetup = true;
        isSettingUp = false;
        return true;
      }
    } catch {}

    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
      minBuffer: 15,
      maxBuffer: 50,
      playBuffer: 2.5,
      backBuffer: 10,
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
      progressUpdateEventInterval: 1,
    });

    isPlayerSetup = true;
    return true;
  } catch (err) {
    console.warn('TrackPlayer setupPlayer warning:', err);
    isPlayerSetup = false;
    return false;
  } finally {
    isSettingUp = false;
  }
}

const WEBVIEW_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:transparent;">
    <audio id="audioEl" preload="auto" playsinline></audio>
    <script>
      const audio = document.getElementById('audioEl');

      function sendMsg(type, payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
        }
      }

      audio.addEventListener('play', () => sendMsg('status', { playing: true }));
      audio.addEventListener('pause', () => sendMsg('status', { playing: false }));
      audio.addEventListener('waiting', () => sendMsg('status', { buffering: true }));
      audio.addEventListener('playing', () => sendMsg('status', { buffering: false, playing: true }));
      audio.addEventListener('durationchange', () => sendMsg('duration', { duration: audio.duration || 0 }));
      audio.addEventListener('timeupdate', () => {
        sendMsg('time', { position: audio.currentTime || 0, duration: audio.duration || 0 });
      });
      audio.addEventListener('ended', () => sendMsg('ended', {}));
      audio.addEventListener('error', (e) => sendMsg('error', { message: audio.error ? audio.error.message : 'Audio playback error' }));

      window.playAudio = function(url, initialPos, speed) {
        if (audio.src !== url) {
          audio.src = url;
          audio.load();
        }
        if (speed) audio.playbackRate = speed;
        if (initialPos && initialPos > 0) audio.currentTime = initialPos;
        audio.play().catch(e => sendMsg('error', { message: e.message }));
      };

      window.pauseAudio = function() {
        audio.pause();
      };

      window.resumeAudio = function() {
        audio.play().catch(e => sendMsg('error', { message: e.message }));
      };

      window.seekAudio = function(time) {
        audio.currentTime = time;
      };

      window.setSpeed = function(speed) {
        audio.playbackRate = speed;
      };

      sendMsg('ready', {});
    </script>
  </body>
</html>
`;

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [currentTrack, setCurrentTrack] = useState<AudioFile | null>(null);
  const [queue, setQueue] = useState<AudioFile[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.0);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('off');
  const [sleepTimer, setSleepTimerState] = useState<SleepTimerOption>(null);
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] = useState<number | null>(null);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState<boolean>(false);
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState<boolean>(false);
  const [isFavourite, setIsFavourite] = useState<boolean>(false);

  // References for state in event callbacks
  const currentTrackRef = useRef<AudioFile | null>(null);
  currentTrackRef.current = currentTrack;
  const queueRef = useRef<AudioFile[]>([]);
  queueRef.current = queue;
  const repeatModeRef = useRef<RepeatMode>('off');
  repeatModeRef.current = repeatMode;
  const playbackSpeedRef = useRef<number>(1.0);
  playbackSpeedRef.current = playbackSpeed;

  const sleepTimerRef = useRef<any>(null);
  const progressSaveRef = useRef<number>(0);

  // Hidden WebView for Expo Go HTML5 audio
  const webViewRef = useRef<any>(null);
  const isWebViewReadyRef = useRef<boolean>(false);
  const pendingPlayRef = useRef<{ url: string; pos: number; speed: number } | null>(null);

  // Setup player listeners on mount
  useEffect(() => {
    if (isNativePlayerAvailable) {
      let progressInterval: any = null;

      const subState = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        const state = (event as any).state;
        setIsPlaying(state === State.Playing);
        setIsBuffering(state === State.Buffering || state === State.Loading);
      });

      const subProgress = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
        setPosition(event.position);
        if (event.duration > 0) {
          setDuration(event.duration);
        }
      });

      const subQueueEnded = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
        handleTrackFinished();
      });

      // Poll progress every 1s when active in native player
      progressInterval = setInterval(async () => {
        if (!isPlayerSetup) return;
        try {
          const p = await TrackPlayer.getProgress();
          setPosition(p.position);
          if (p.duration > 0) {
            setDuration(p.duration);
          }
        } catch {}
      }, 1000);

      return () => {
        subState.remove();
        subProgress.remove();
        subQueueEnded.remove();
        if (progressInterval) clearInterval(progressInterval);
      };
    }
  }, []);

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
        .then(
          ({ data }) => {
            setIsFavourite(!!data);
          },
          () => {}
        );
    } else {
      getLocalFavourites()
        .then((favs) => {
          setIsFavourite(favs.includes(currentTrack.id));
        })
        .catch(() => {});
    }
  }, [currentTrack, user]);

  // Periodic position persistence (every 5 seconds)
  useEffect(() => {
    if (!currentTrack || !isPlaying || position <= 0) return;

    const currentPos = Math.floor(position);
    if (Math.abs(currentPos - progressSaveRef.current) >= 5) {
      progressSaveRef.current = currentPos;

      // Save locally
      saveLocalPlaybackProgress(currentTrack, currentPos);

      // Save to Supabase for signed-in users
      if (user && !isDemoMode) {
        supabase
          .from('playback_progress')
          .upsert({
            user_id: user.id,
            audio_id: currentTrack.id,
            position_seconds: currentPos,
            updated_at: new Date().toISOString(),
          })
          .then(
            () => {},
            () => {}
          );
      }
    }
  }, [position, isPlaying, currentTrack, user]);

  // Handle track finished (auto-advance / repeat)
  const handleTrackFinished = async () => {
    const track = currentTrackRef.current;
    const curQueue = queueRef.current;
    const curRepeat = repeatModeRef.current;

    if (!track || curQueue.length === 0) return;

    if (curRepeat === 'repeat_one') {
      await playTrack(track, curQueue, 0);
      return;
    }

    const currentIndex = curQueue.findIndex((item) => item.id === track.id);
    if (currentIndex >= 0 && currentIndex < curQueue.length - 1) {
      const nextTrack = curQueue[currentIndex + 1];
      await playTrack(nextTrack, curQueue, 0);
    } else if (curRepeat === 'repeat_folder' && curQueue.length > 0) {
      await playTrack(curQueue[0], curQueue, 0);
    } else {
      setIsPlaying(false);
    }
  };

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
          pauseAudio();
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
    if (sleepTimer === 'end_of_file' && duration > 0) {
      if (duration - position <= 2) {
        pauseAudio();
        setSleepTimerState(null);
      }
    }
  }, [sleepTimer, position, duration]);

  const pauseAudio = async () => {
    if (isNativePlayerAvailable) {
      try {
        await TrackPlayer.pause();
      } catch {}
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript('window.pauseAudio && window.pauseAudio(); true;');
      setIsPlaying(false);
    }
  };

  // Play a specific track
  const playTrack = async (
    track: AudioFile,
    trackQueue: AudioFile[] = [],
    initialPosition: number = 0
  ) => {
    if (!track) return;
    const cleanQueue = (trackQueue && trackQueue.length > 0 ? trackQueue : [track]).filter(
      (t) => t && t.audio_url
    );
    const effectiveQueue = cleanQueue.length > 0 ? cleanQueue : [track];
    setQueue(effectiveQueue);
    setCurrentTrack(track);
    setIsMiniPlayerDismissed(false);
    setPosition(Math.max(0, initialPosition || 0));
    setDuration(track.duration_seconds || 0);

    // Check if file is downloaded locally
    let audioUrl = track.audio_url;
    try {
      const localUri = await getLocalAudioUri(track.id);
      if (localUri) audioUrl = localUri;
    } catch {}

    if (!audioUrl || !audioUrl.trim()) {
      console.warn('Cannot play track without valid audio URL');
      return;
    }

    if (isNativePlayerAvailable) {
      try {
        const setupSuccess = await setupTrackPlayer();
        if (setupSuccess) {
          try {
            await TrackPlayer.reset();
            await TrackPlayer.add({
              id: track.id,
              url: audioUrl,
              title: track.title || 'تسجيل قرآني',
              artist: track.speaker || 'قارئ',
              duration:
                typeof track.duration_seconds === 'number' && !isNaN(track.duration_seconds) && track.duration_seconds > 0
                  ? track.duration_seconds
                  : 0,
            });

            if (initialPosition > 0 && initialPosition < (track.duration_seconds || 0) - 5) {
              await TrackPlayer.seekTo(initialPosition);
            }

            const currentSpeed = playbackSpeedRef.current || 1.0;
            await TrackPlayer.setRate(currentSpeed);
            await TrackPlayer.play();
            return;
          } catch (err) {
            console.warn('TrackPlayer play error, falling back:', err);
          }
        }
      } catch (nativeSetupErr) {
        console.warn('setupTrackPlayer failed, falling back:', nativeSetupErr);
      }
    }

    // In Expo Go or Native fallback: stream through HTML5 audio WebView
    setIsBuffering(true);
    const speed = playbackSpeedRef.current || 1.0;
    if (isWebViewReadyRef.current && webViewRef.current) {
      try {
        webViewRef.current.injectJavaScript(
          `window.playAudio(${JSON.stringify(audioUrl)}, ${initialPosition || 0}, ${speed}); true;`
        );
      } catch {}
    } else {
      pendingPlayRef.current = { url: audioUrl, pos: initialPosition || 0, speed };
    }
  };

  const togglePlayPause = async () => {
    if (isNativePlayerAvailable) {
      try {
        if (isPlaying) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.play();
        }
      } catch (err) {
        console.warn('TrackPlayer toggle error:', err);
      }
    } else if (webViewRef.current) {
      if (isPlaying) {
        webViewRef.current.injectJavaScript('window.pauseAudio && window.pauseAudio(); true;');
      } else {
        webViewRef.current.injectJavaScript('window.resumeAudio && window.resumeAudio(); true;');
      }
    } else if (currentTrack) {
      await playTrack(currentTrack, queue, position);
    }
  };

  const seekTo = async (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return;
    const safeSeconds = Math.max(0, seconds);
    setPosition(safeSeconds);
    if (isNativePlayerAvailable) {
      try {
        await TrackPlayer.seekTo(safeSeconds);
      } catch (err) {
        console.warn('TrackPlayer seek error:', err);
      }
    } else if (webViewRef.current) {
      try {
        webViewRef.current.injectJavaScript(`window.seekAudio && window.seekAudio(${safeSeconds}); true;`);
      } catch {}
    }
  };

  const skipForward15 = async () => {
    const newPos = Math.min(position + 15, duration);
    await seekTo(newPos);
  };

  const skipBackward15 = async () => {
    const newPos = Math.max(position - 15, 0);
    await seekTo(newPos);
  };

  const skipToNext = async () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((item) => item.id === currentTrack.id);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      await playTrack(queue[currentIndex + 1], queue, 0);
    }
  };

  const skipToPrevious = async () => {
    if (!currentTrack || queue.length === 0) return;
    if (position > 5) {
      await seekTo(0);
      return;
    }
    const currentIndex = queue.findIndex((item) => item.id === currentTrack.id);
    if (currentIndex > 0) {
      await playTrack(queue[currentIndex - 1], queue, 0);
    } else {
      await seekTo(0);
    }
  };

  const setPlaybackSpeed = async (speed: number) => {
    if (typeof speed !== 'number' || isNaN(speed) || speed <= 0) return;
    setPlaybackSpeedState(speed);
    playbackSpeedRef.current = speed;
    if (isNativePlayerAvailable) {
      try {
        await TrackPlayer.setRate(speed);
      } catch (err) {
        console.warn('TrackPlayer rate error:', err);
      }
    } else if (webViewRef.current) {
      try {
        webViewRef.current.injectJavaScript(`window.setSpeed && window.setSpeed(${speed}); true;`);
      } catch {}
    }
  };

  const setRepeatMode = async (mode: RepeatMode) => {
    setRepeatModeState(mode);
    repeatModeRef.current = mode;
    if (isNativePlayerAvailable) {
      try {
        let tpMode = TPRepeatMode.Off;
        if (mode === 'repeat_one') tpMode = TPRepeatMode.Track;
        else if (mode === 'repeat_folder') tpMode = TPRepeatMode.Queue;
        await TrackPlayer.setRepeatMode(tpMode);
      } catch (err) {
        console.warn('TrackPlayer repeatMode error:', err);
      }
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

  const dismissMiniPlayer = () => {
    setIsMiniPlayerDismissed(true);
  };

  const toggleFavourite = async (): Promise<boolean> => {
    if (!currentTrack) return false;
    const nextState = !isFavourite;
    setIsFavourite(nextState);

    try {
      if (user && !isDemoMode) {
        if (nextState) {
          await supabase.from('favourites').insert({
            user_id: user.id,
            audio_id: currentTrack.id,
          });
        } else {
          await supabase
            .from('favourites')
            .delete()
            .eq('user_id', user.id)
            .eq('audio_id', currentTrack.id);
        }
      } else {
        await toggleLocalFavourite(currentTrack.id);
      }
      return nextState;
    } catch {
      setIsFavourite(!nextState);
      return !nextState;
    }
  };

  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        isWebViewReadyRef.current = true;
        if (pendingPlayRef.current && webViewRef.current) {
          const { url, pos, speed } = pendingPlayRef.current;
          pendingPlayRef.current = null;
          webViewRef.current.injectJavaScript(
            `window.playAudio(${JSON.stringify(url)}, ${pos}, ${speed}); true;`
          );
        }
      } else if (data.type === 'status') {
        if (typeof data.playing === 'boolean') setIsPlaying(data.playing);
        if (typeof data.buffering === 'boolean') setIsBuffering(data.buffering);
      } else if (data.type === 'duration') {
        if (data.duration > 0) setDuration(data.duration);
      } else if (data.type === 'time') {
        setPosition(data.position || 0);
        if (data.duration > 0) setDuration(data.duration);
        setIsBuffering(false);
      } else if (data.type === 'ended') {
        handleTrackFinished();
      } else if (data.type === 'error') {
        console.warn('WebView Audio error:', data.message);
        setIsBuffering(false);
        setIsPlaying(false);
      }
    } catch {}
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        isBuffering,
        position,
        duration,
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
      {/* Hidden WebView audio player fallback for Expo Go and native failsafe */}
      <View style={styles.hiddenWebView}>
        {React.createElement(WebView as any, {
          ref: webViewRef,
          source: { html: WEBVIEW_HTML },
          originWhitelist: ['*'],
          javaScriptEnabled: true,
          domStorageEnabled: true,
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          mixedContentMode: 'always',
          onMessage: onWebViewMessage,
        })}
      </View>
    </AudioPlayerContext.Provider>
  );
};

const styles = StyleSheet.create({
  hiddenWebView: {
    width: 0,
    height: 0,
    position: 'absolute',
    opacity: 0,
  },
});

export const useAudioPlayer = (): AudioPlayerContextType => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
