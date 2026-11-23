import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { useAudioPlayer, RepeatMode, SleepTimerOption } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';
import { IslamicPattern } from '../theme/IslamicPattern';
import { typography } from '../theme/typography';
import { formatDuration } from '../lib/formatters';
import { downloadAudioFile, isAudioDownloaded } from '../lib/storage';

export const FullPlayerModal: React.FC = () => {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const {
    currentTrack,
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
    closeFullPlayer,
    togglePlayPause,
    seekTo,
    skipForward15,
    skipBackward15,
    skipToNext,
    skipToPrevious,
    setPlaybackSpeed,
    setRepeatMode,
    setSleepTimer,
    toggleFavourite,
  } = useAudioPlayer();

  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showSleepMenu, setShowSleepMenu] = useState<boolean>(false);

  // Check download state
  useEffect(() => {
    if (currentTrack) {
      isAudioDownloaded(currentTrack.id)
        .then(setIsDownloaded)
        .catch(() => {});
    }
  }, [currentTrack]);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

  const handleDownload = async () => {
    if (!currentTrack || isDownloaded || isDownloading) return;
    try {
      setIsDownloading(true);
      await downloadAudioFile(currentTrack, (p) => setDownloadProgress(p));
      setIsDownloaded(true);
      Alert.alert('تم التنزيل بنجاح', 'تم حفظ التلاوة للاستماع بدون إنترنت.');
    } catch (err: any) {
      Alert.alert('خطأ في التنزيل', err.message || 'تعذر تنزيل الملف');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleToggleFavourite = async () => {
    if (!user) {
      Alert.alert(
        'تسجيل الدخول مطلوب',
        'يرجى تسجيل الدخول بحساب Google لحفظ التلاوة في قائمة المفضلة ومزامنتها.',
        [{ text: 'حسناً' }]
      );
      return;
    }
    await toggleFavourite();
  };

  const cycleRepeatMode = () => {
    const modes: RepeatMode[] = ['off', 'repeat_one', 'repeat_folder'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];
  const sleepOptions: { label: string; value: SleepTimerOption }[] = [
    { label: 'إيقاف المؤقت', value: null },
    { label: '15 دقيقة', value: 15 },
    { label: '30 دقيقة', value: 30 },
    { label: '60 دقيقة', value: 60 },
    { label: 'نهاية المقطع', value: 'end_of_file' },
  ];

  return (
    <Modal
      visible={isFullPlayerVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeFullPlayer}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <IslamicPattern color={colors.patternFill} opacity={colors.patternOpacity * 1.5} />

        {/* Top bar with dismiss button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.iconCircle, { backgroundColor: colors.surface }]}
            onPress={closeFullPlayer}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-down" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.nowPlayingTitle, { color: colors.textMuted, fontFamily: typography.fontFamilyMedium }]}>
            مشغل التلاوات
          </Text>

          <TouchableOpacity
            style={[styles.iconCircle, { backgroundColor: colors.surface }]}
            onPress={handleToggleFavourite}
          >
            <Ionicons
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavourite ? colors.danger : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Central Artwork Card */}
        <View style={styles.artworkContainer}>
          <View
            style={[
              styles.artworkCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <IslamicPattern color={colors.primary} opacity={0.12} />
            <View style={[styles.emblemCircle, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="mic-outline" size={54} color={colors.primary} />
            </View>
            <Text style={[styles.mosqueBadge, { color: colors.primary, fontFamily: typography.fontFamilyBold }]}>
              تلاوات المسجد الكبير
            </Text>
          </View>
        </View>

        {/* Track Metadata */}
        <View style={styles.metaContainer}>
          <Text
            style={[styles.trackTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}
            numberOfLines={2}
          >
            {currentTrack.title}
          </Text>
          <Text
            style={[styles.trackSpeaker, { color: colors.accent, fontFamily: typography.fontFamilyMedium }]}
          >
            {currentTrack.speaker}
          </Text>
        </View>

        {/* Progress Bar & Seek */}
        <View style={styles.seekContainer}>
          <TouchableOpacity
            style={[styles.seekTrack, { backgroundColor: colors.border }]}
            activeOpacity={1}
            onPress={(e) => {
              const { locationX } = e.nativeEvent || {};
              if (typeof locationX === 'number' && !isNaN(locationX) && duration > 0) {
                // seek on tap approximate width ~ 320
                const ratio = Math.max(0, Math.min(1, locationX / 320));
                seekTo(ratio * duration);
              }
            }}
          >
            <View
              style={[
                styles.seekFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progressPercent * 100}%`,
                },
              ]}
            />
          </TouchableOpacity>

          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {formatDuration(position)}
            </Text>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {formatDuration(Math.max(0, duration - position))}
            </Text>
          </View>
        </View>

        {/* Main Controls Row */}
        <View style={styles.controlsRow}>
          {/* Previous Track */}
          <TouchableOpacity style={styles.navButton} onPress={skipToPrevious}>
            <Ionicons name="play-skip-back" size={26} color={colors.text} />
          </TouchableOpacity>

          {/* Backward 15s */}
          <TouchableOpacity style={styles.seek15Button} onPress={skipBackward15}>
            <Ionicons name="refresh" size={24} color={colors.text} style={{ transform: [{ scaleX: -1 }] }} />
            <Text style={[styles.seek15Text, { color: colors.text }]}>15</Text>
          </TouchableOpacity>

          {/* Big Play / Pause */}
          <TouchableOpacity
            style={[styles.mainPlayButton, { backgroundColor: colors.primary }]}
            onPress={togglePlayPause}
            activeOpacity={0.8}
          >
            {isBuffering ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={34}
                color={colors.textInverse}
                style={!isPlaying ? { marginRight: -3 } : undefined}
              />
            )}
          </TouchableOpacity>

          {/* Forward 15s */}
          <TouchableOpacity style={styles.seek15Button} onPress={skipForward15}>
            <Ionicons name="refresh" size={24} color={colors.text} />
            <Text style={[styles.seek15Text, { color: colors.text }]}>15</Text>
          </TouchableOpacity>

          {/* Next Track */}
          <TouchableOpacity style={styles.navButton} onPress={skipToNext}>
            <Ionicons name="play-skip-forward" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Bottom Options Row (Speed, Repeat, Sleep, Download) */}
        <View style={styles.optionsRow}>
          {/* Repeat */}
          <TouchableOpacity
            style={[
              styles.optionItem,
              repeatMode !== 'off' && { backgroundColor: `${colors.primary}18`, borderRadius: 12 },
            ]}
            onPress={cycleRepeatMode}
          >
            <Ionicons
              name={repeatMode === 'repeat_one' ? 'repeat' : 'repeat-outline'}
              size={22}
              color={repeatMode !== 'off' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.optionLabel,
                { color: repeatMode !== 'off' ? colors.primary : colors.textMuted },
              ]}
            >
              {repeatMode === 'repeat_one' ? 'مقطع' : repeatMode === 'repeat_folder' ? 'مجلد' : 'تكرار'}
            </Text>
          </TouchableOpacity>

          {/* Speed */}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => setShowSpeedMenu(!showSpeedMenu)}
          >
            <Text style={[styles.speedText, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
              {playbackSpeed}x
            </Text>
            <Text style={[styles.optionLabel, { color: colors.textMuted }]}>السرعة</Text>
          </TouchableOpacity>

          {/* Sleep Timer */}
          <TouchableOpacity
            style={[
              styles.optionItem,
              sleepTimer !== null && { backgroundColor: `${colors.primary}18`, borderRadius: 12 },
            ]}
            onPress={() => setShowSleepMenu(!showSleepMenu)}
          >
            <Ionicons
              name={sleepTimer !== null ? 'timer' : 'timer-outline'}
              size={22}
              color={sleepTimer !== null ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.optionLabel,
                { color: sleepTimer !== null ? colors.primary : colors.textMuted },
              ]}
            >
              {sleepTimerRemainingSeconds
                ? `${Math.ceil(sleepTimerRemainingSeconds / 60)} د`
                : 'نوم'}
            </Text>
          </TouchableOpacity>

          {/* Download Offline */}
          <TouchableOpacity style={styles.optionItem} onPress={handleDownload}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={isDownloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                size={22}
                color={isDownloaded ? colors.primary : colors.textMuted}
              />
            )}
            <Text
              style={[
                styles.optionLabel,
                { color: isDownloaded ? colors.primary : colors.textMuted },
              ]}
            >
              {isDownloaded ? 'محمّل' : isDownloading ? `${Math.round(downloadProgress * 100)}%` : 'تنزيل'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Speed Selection Overlay */}
        {showSpeedMenu && (
          <View style={[styles.popupOverlay, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.popupTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
              سرعة التشغيل
            </Text>
            <View style={styles.speedOptionsGrid}>
              {speedOptions.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.speedOptionBtn,
                    {
                      backgroundColor: playbackSpeed === speed ? colors.primary : colors.cardHighlight,
                    },
                  ]}
                  onPress={() => {
                    setPlaybackSpeed(speed);
                    setShowSpeedMenu(false);
                  }}
                >
                  <Text
                    style={{
                      color: playbackSpeed === speed ? colors.textInverse : colors.text,
                      fontFamily: typography.fontFamilyBold,
                    }}
                  >
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sleep Timer Selection Overlay */}
        {showSleepMenu && (
          <View style={[styles.popupOverlay, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.popupTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
              مؤقت إيقاف التشغيل
            </Text>
            {sleepOptions.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[
                  styles.sleepOptionRow,
                  {
                    backgroundColor: sleepTimer === opt.value ? `${colors.primary}18` : 'transparent',
                  },
                ]}
                onPress={() => {
                  setSleepTimer(opt.value);
                  setShowSleepMenu(false);
                }}
              >
                <Text
                  style={{
                    color: sleepTimer === opt.value ? colors.primary : colors.text,
                    fontFamily: typography.fontFamily,
                  }}
                >
                  {opt.label}
                </Text>
                {sleepTimer === opt.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  nowPlayingTitle: {
    fontSize: typography.sizes.sm,
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  artworkCard: {
    width: 260,
    height: 260,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  emblemCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mosqueBadge: {
    fontSize: typography.sizes.md,
  },
  metaContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  trackTitle: {
    fontSize: typography.sizes.lg,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 6,
  },
  trackSpeaker: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  seekContainer: {
    marginVertical: 8,
  },
  seekTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  seekFill: {
    height: '100%',
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 10,
  },
  navButton: {
    padding: 10,
  },
  seek15Button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  seek15Text: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: -8,
  },
  mainPlayButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  optionItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  optionLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  speedText: {
    fontSize: 15,
  },
  popupOverlay: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 10,
    zIndex: 99,
  },
  popupTitle: {
    fontSize: typography.sizes.md,
    textAlign: 'right',
    marginBottom: 12,
  },
  speedOptionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedOptionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  sleepOptionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
});
