import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';

interface SearchBarProps {
  placeholder?: string;
  initialValue?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'ابحث عن سورة، تلاوة، أو قارئ...',
  initialValue = '',
  onSearch,
  debounceMs = 300,
}) => {
  const { colors } = useAppTheme();
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(text);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [text, debounceMs]);

  const handleClear = () => {
    setText('');
    onSearch('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            fontFamily: typography.fontFamily,
          },
        ]}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        textAlign="right"
      />
      {text.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  searchIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.sm,
    paddingVertical: 0,
    writingDirection: 'rtl',
  },
});
