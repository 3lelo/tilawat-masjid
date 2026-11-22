import { registerRootComponent } from 'expo';
import { I18nManager, NativeModules } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { PlaybackService } from './src/lib/playbackService';

// Force Arabic RTL layout
if (!I18nManager.isRTL) {
  try {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  } catch (e) {
    console.warn('Failed to force RTL:', e);
  }
}

// Register background audio playback service only when native TrackPlayer is available
// (In Expo Go, TrackPlayer native module is absent and expo-audio is used instead)
if (NativeModules.TrackPlayerModule) {
  try {
    TrackPlayer.registerPlaybackService(() => PlaybackService);
  } catch (e) {
    console.warn('TrackPlayer service registration warning:', e);
  }
}

registerRootComponent(App);
