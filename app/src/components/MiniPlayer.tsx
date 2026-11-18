import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { typography } from '../theme/typography';

export const MiniPlayer: React.FC = () => {
  const { colors } = useAppTheme();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    togglePlayPause,
    openFullPlayer,
    dismissMiniPlayer,
    isMiniPlayerDismissed,
  } = useAudioPlayer();

  if (!currentTrack || isMiniPlayerDismissed) {
    return null;
  }

  const progressPercent = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
      {/* Top progress line */}
      <View style={[styles.progressBarTrack, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: colors.primary,
              width: `${progressPercent}%`,
            },
          ]}
        />
      </View>

      <TouchableOpacity
        style={styles.innerRow}
        onPress={openFullPlayer}
        activeOpacity={0.9}
      >
        {/* Play / Pause */}
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colors.primary }]}
          onPress={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={colors.textInverse}
            style={!isPlaying ? { marginRight: -2 } : undefined}
          />
        </TouchableOpacity>

        {/* Track info */}
        <View style={styles.textColumn}>
          <Text
            style={[styles.title, { color: colors.text, fontFamily: typography.fontFamilyBold }]}
            numberOfLines={1}
          >
            {currentTrack.title}
          </Text>
          <Text
            style={[styles.speaker, { color: colors.textMuted, fontFamily: typography.fontFamily }]}
            numberOfLines={1}
          >
            {currentTrack.speaker}
          </Text>
        </View>

        {/* Dismiss mini-player button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={(e) => {
            e.stopPropagation();
            dismissMiniPlayer();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  progressBarTrack: {
    height: 3,
    width: '100%',
  },
  progressBarFill: {
    height: 3,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  textColumn: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: typography.sizes.sm,
    writingDirection: 'rtl',
  },
  speaker: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  closeButton: {
    padding: 6,
    marginRight: 4,
  },
});
