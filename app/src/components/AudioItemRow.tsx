import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { AudioFile } from '../lib/supabase';
import { typography } from '../theme/typography';
import { formatDuration, formatArabicDate } from '../lib/formatters';

interface AudioItemRowProps {
  audio: AudioFile;
  isCurrent?: boolean;
  isPlaying?: boolean;
  isFavourite?: boolean;
  onPress: () => void;
  onToggleFavourite?: () => void;
}

export const AudioItemRow: React.FC<AudioItemRowProps> = ({
  audio,
  isCurrent = false,
  isPlaying = false,
  isFavourite = false,
  onPress,
  onToggleFavourite,
}) => {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isCurrent ? colors.cardHighlight : colors.card,
          borderColor: isCurrent ? colors.primary : colors.borderLight,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contentRow}>
        {/* Play / Playing Indicator */}
        <View
          style={[
            styles.playButton,
            {
              backgroundColor: isCurrent ? colors.primary : `${colors.primary}12`,
            },
          ]}
        >
          <Ionicons
            name={isCurrent && isPlaying ? 'pause' : 'play'}
            size={18}
            color={isCurrent ? colors.textInverse : colors.primary}
            style={!isCurrent || !isPlaying ? { marginRight: -2 } : undefined}
          />
        </View>

        {/* Audio Details */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: isCurrent ? colors.primary : colors.text,
                fontFamily: typography.fontFamilyBold,
              },
            ]}
            numberOfLines={1}
          >
            {audio.title}
          </Text>

          <Text
            style={[styles.speaker, { color: colors.textMuted, fontFamily: typography.fontFamily }]}
            numberOfLines={1}
          >
            {audio.speaker}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {formatDuration(audio.duration_seconds)}
            </Text>
            <Text style={[styles.dot, { color: colors.border }]}>•</Text>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {formatArabicDate(audio.recorded_at)}
            </Text>
          </View>
        </View>

        {/* Favourite Button */}
        {onToggleFavourite && (
          <TouchableOpacity
            style={styles.favButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavourite();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavourite ? colors.danger : colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  textContainer: {
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    writingDirection: 'rtl',
  },
  dot: {
    fontSize: 10,
  },
  favButton: {
    padding: 4,
    marginRight: 4,
  },
});
