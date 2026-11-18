import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { Folder } from '../lib/supabase';
import { typography } from '../theme/typography';

interface FolderCardProps {
  folder: Folder;
  onPress: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onPress }) => {
  const { colors } = useAppTheme();
  const isYearMonth = folder.type === 'year_month';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contentRow}>
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: isYearMonth ? `${colors.accent}15` : `${colors.primary}15` },
          ]}
        >
          <Ionicons
            name={isYearMonth ? 'calendar-outline' : 'folder-outline'}
            size={24}
            color={isYearMonth ? colors.accent : colors.primary}
          />
        </View>

        <View style={styles.infoColumn}>
          <Text
            style={[styles.name, { color: colors.text, fontFamily: typography.fontFamilyBold }]}
            numberOfLines={1}
          >
            {folder.name}
          </Text>

          {isYearMonth ? (
            <View style={[styles.badge, { backgroundColor: `${colors.accent}15` }]}>
              <Text style={[styles.badgeText, { color: colors.accent, fontFamily: typography.fontFamily }]}>
                سنة مرتبة بالأشهر
              </Text>
            </View>
          ) : (
            <Text style={[styles.subText, { color: colors.textMuted, fontFamily: typography.fontFamily }]}>
              مجلد
            </Text>
          )}
        </View>

        {/* Backwards chevron for RTL navigation */}
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  infoColumn: {
    flex: 1,
    alignItems: 'flex-start',
  },
  name: {
    fontSize: typography.sizes.md,
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  subText: {
    fontSize: typography.sizes.xs,
    writingDirection: 'rtl',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 11,
    writingDirection: 'rtl',
  },
});
