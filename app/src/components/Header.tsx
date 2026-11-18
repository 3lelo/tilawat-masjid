import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.cardHighlight }]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            {/* In RTL, forward arrow points left for back */}
            <Ionicons name="arrow-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.textColumn}>
          <Text
            style={[styles.title, { color: colors.text, fontFamily: typography.fontFamilyBold }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textMuted, fontFamily: typography.fontFamily }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightAction && (
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.cardHighlight }]}
          onPress={rightAction.onPress}
          activeOpacity={0.7}
        >
          <Ionicons name={rightAction.icon} size={20} color={colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.lg,
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    writingDirection: 'rtl',
  },
});
