import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

export const SkeletonCard: React.FC = () => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={[styles.circle, { backgroundColor: colors.borderLight }]} />
      <View style={styles.lines}>
        <View style={[styles.lineLong, { backgroundColor: colors.borderLight }]} />
        <View style={[styles.lineShort, { backgroundColor: colors.borderLight }]} />
      </View>
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 12,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  lineLong: {
    height: 14,
    borderRadius: 7,
    width: '75%',
  },
  lineShort: {
    height: 10,
    borderRadius: 5,
    width: '40%',
  },
});
