import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, G, Defs, Pattern, Rect } from 'react-native-svg';

interface IslamicPatternProps {
  color: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}

/**
 * Islamic Geometric Pattern (8-point Star & Octagram arabesque)
 * Rendered using lightweight SVG vector pattern.
 * High performance, zero image asset overhead, crisp on all screen densities.
 */
export const IslamicPattern: React.FC<IslamicPatternProps> = ({
  color,
  opacity = 0.05,
  style,
  pointerEvents = 'none',
}) => {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents={pointerEvents}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="islamic-tile"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <G fill="none" stroke={color} strokeWidth="1" opacity={opacity}>
              {/* Outer 8-point geometric star lines */}
              <Path d="M30 0 L39 21 L60 30 L39 39 L30 60 L21 39 L0 30 L21 21 Z" />
              {/* Secondary rotated diamond */}
              <Path d="M30 8 L52 30 L30 52 L8 30 Z" />
              {/* Corner intersecting ornaments */}
              <Path d="M0 0 L9 9 M60 0 L51 9 M0 60 L9 51 M60 60 L51 51" />
              <Path d="M30 18 L36 24 L42 30 L36 36 L30 42 L24 36 L18 30 L24 24 Z" />
            </G>
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#islamic-tile)" />
      </Svg>
    </View>
  );
};
