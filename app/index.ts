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

// Register background audio playback service
// Must be registered unconditionally at root entry point for Android HeadlessJsTaskService
try {
  TrackPlayer.registerPlaybackService(() => PlaybackService);
} catch (e) {
  console.warn('TrackPlayer service registration warning:', e);
}

// Global JS Exception Handler to prevent process termination on unhandled errors
const globalScope = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
if (globalScope?.ErrorUtils) {
  const defaultHandler = globalScope.ErrorUtils.getGlobalHandler();
  globalScope.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.warn('Global error caught:', error);
    if (__DEV__ && defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

registerRootComponent(App);
