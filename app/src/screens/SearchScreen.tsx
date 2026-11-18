import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBackground } from '../components/ScreenBackground';
import { Header } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { AudioItemRow } from '../components/AudioItemRow';
import { FolderCard } from '../components/FolderCard';
import { SkeletonList } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { useAppTheme } from '../context/ThemeContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { supabase, isDemoMode, Folder, AudioFile } from '../lib/supabase';
import { normalizeArabic } from '../lib/arabicNormalize';
import { MOCK_ROOT_FOLDERS, MOCK_AUDIO_FILES } from '../lib/cache';
import { typography } from '../theme/typography';

interface SearchResultItem {
  result_id: string;
  result_type: 'folder' | 'audio';
  title: string;
  speaker: string;
  duration_seconds: number;
  folder_id: string;
  folder_path: string;
  recorded_at: string;
  audio_url: string;
  status: string;
  rank: number;
}

interface SearchScreenProps {
  route: any;
  navigation: any;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ route, navigation }) => {
  const { initialQuery = '', scopePath = null, folderName = null } = route.params || {};
  const { colors } = useAppTheme();
  const { currentTrack, isPlaying, playTrack, toggleFavourite } = useAudioPlayer();

  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const executeSearch = useCallback(async (searchText: string) => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const normalized = normalizeArabic(trimmed);

    try {
      if (!isDemoMode) {
        // Execute Supabase RPC function search_content
        const { data, error } = await supabase.rpc('search_content', {
          query: trimmed,
          scope_path: scopePath,
          limit_count: 50,
          offset_count: 0,
        });

        if (!error && data) {
          setResults(data as SearchResultItem[]);
        }
      } else {
        // Demo client-side search simulation with identical normalization
        const allMockAudio: AudioFile[] = Object.values(MOCK_AUDIO_FILES).flat();
        const matchedAudio: SearchResultItem[] = allMockAudio
          .filter((a) => {
            if (scopePath && !a.folder_path.startsWith(scopePath)) return false;
            return (
              normalizeArabic(a.title).includes(normalized) ||
              normalizeArabic(a.speaker).includes(normalized)
            );
          })
          .map((a) => ({
            result_id: a.id,
            result_type: 'audio',
            title: a.title,
            speaker: a.speaker,
            duration_seconds: a.duration_seconds,
            folder_id: a.folder_id,
            folder_path: a.folder_path,
            recorded_at: a.recorded_at,
            audio_url: a.audio_url,
            status: a.status,
            rank: 1,
          }));

        const matchedFolders: SearchResultItem[] = scopePath
          ? []
          : MOCK_ROOT_FOLDERS.filter((f) =>
              normalizeArabic(f.name).includes(normalized)
            ).map((f) => ({
              result_id: f.id,
              result_type: 'folder',
              title: f.name,
              speaker: '',
              duration_seconds: 0,
              folder_id: f.parent_id || '',
              folder_path: f.path,
              recorded_at: f.created_at,
              audio_url: '',
              status: 'ready',
              rank: 1,
            }));

        setResults([...matchedFolders, ...matchedAudio]);
      }
    } catch (err) {
      console.warn('Search execution error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [scopePath]);

  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, [initialQuery, executeSearch]);

  const handleItemPress = (item: SearchResultItem) => {
    if (item.result_type === 'folder') {
      const folderObj: Folder = {
        id: item.result_id,
        parent_id: item.folder_id || null,
        path: item.folder_path,
        name: item.title,
        name_normalized: normalizeArabic(item.title),
        type: 'normal',
        sort_order: 0,
        created_at: item.recorded_at,
      };
      navigation.navigate('FolderScreen', { folder: folderObj });
    } else {
      const audioObj: AudioFile = {
        id: item.result_id,
        folder_id: item.folder_id,
        folder_path: item.folder_path,
        title: item.title,
        title_normalized: normalizeArabic(item.title),
        speaker: item.speaker,
        speaker_normalized: normalizeArabic(item.speaker),
        recorded_at: item.recorded_at,
        audio_url: item.audio_url,
        duration_seconds: item.duration_seconds,
        size_bytes: 0,
        status: 'ready',
        created_at: item.recorded_at,
      };
      playTrack(audioObj);
    }
  };

  return (
    <ScreenBackground>
      <Header
        title={scopePath && folderName ? `بحث في: ${folderName}` : 'البحث في المحتوى'}
        subtitle={scopePath ? 'بحث مخصص داخل نطاق المجلد' : 'بحث شامل'}
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <SearchBar
        initialValue={query}
        placeholder={scopePath ? `ابحث داخل هذا المجلد...` : 'ابحث عن سورة، خطبة، أو قارئ...'}
        onSearch={(text) => {
          setQuery(text);
          executeSearch(text);
        }}
      />

      {scopePath && (
        <View style={[styles.scopeBadge, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="filter" size={14} color={colors.accent} />
          <Text style={[styles.scopeBadgeText, { color: colors.accent, fontFamily: typography.fontFamily }]}>
            نطاق البحث محصور داخل: {folderName}
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.result_type}-${item.result_id}`}
        renderItem={({ item }) => {
          if (item.result_type === 'folder') {
            const folderObj: Folder = {
              id: item.result_id,
              parent_id: item.folder_id || null,
              path: item.folder_path,
              name: item.title,
              name_normalized: normalizeArabic(item.title),
              type: 'normal',
              sort_order: 0,
              created_at: item.recorded_at,
            };
            return <FolderCard folder={folderObj} onPress={() => handleItemPress(item)} />;
          }

          const audioObj: AudioFile = {
            id: item.result_id,
            folder_id: item.folder_id,
            folder_path: item.folder_path,
            title: item.title,
            title_normalized: normalizeArabic(item.title),
            speaker: item.speaker,
            speaker_normalized: normalizeArabic(item.speaker),
            recorded_at: item.recorded_at,
            audio_url: item.audio_url,
            duration_seconds: item.duration_seconds,
            size_bytes: 0,
            status: 'ready',
            created_at: item.recorded_at,
          };

          return (
            <AudioItemRow
              audio={audioObj}
              isCurrent={currentTrack?.id === audioObj.id}
              isPlaying={isPlaying}
              onPress={() => handleItemPress(item)}
              onToggleFavourite={toggleFavourite}
            />
          );
        }}
        ListEmptyComponent={
          isSearching ? (
            <SkeletonList count={4} />
          ) : query.trim() ? (
            <EmptyState
              icon="search-outline"
              title="لا توجد نتائج مطابقة"
              description={`لم نجد نتائج تطابق "${query}". جرب البحث بكلمة أخرى.`}
            />
          ) : (
            <EmptyState
              icon="search"
              title="ابدأ البحث"
              description="اكتب اسم السورة، الشيخ، أو الموضوع للبحث الفوري."
            />
          )
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 90,
    paddingTop: 6,
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    gap: 8,
  },
  scopeBadgeText: {
    fontSize: 12,
    writingDirection: 'rtl',
  },
});
