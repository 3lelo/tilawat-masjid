import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { IslamicPattern } from '../theme/IslamicPattern';

interface ScreenBackgroundProps extends ViewProps {
  showPattern?: boolean;
}

export const ScreenBackground: React.FC<ScreenBackgroundProps> = ({
  children,
  style,
  showPattern = true,
  ...rest
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]} {...rest}>
      {showPattern && (
        <IslamicPattern
          color={colors.patternFill}
          opacity={colors.patternOpacity}
        />
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
