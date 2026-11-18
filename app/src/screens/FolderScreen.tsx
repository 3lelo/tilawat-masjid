import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBackground } from '../components/ScreenBackground';
import { Header } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { FolderCard } from '../components/FolderCard';
import { AudioItemRow } from '../components/AudioItemRow';
import { SkeletonList } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { useAppTheme } from '../context/ThemeContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { Folder, AudioFile, supabase, isDemoMode } from '../lib/supabase';
import {
  getCachedFolders,
  setCachedFolders,
  getCachedAudioFiles,
  setCachedAudioFiles,
  MOCK_SUBFOLDERS,
  MOCK_AUDIO_FILES,
} from '../lib/cache';
import { typography } from '../theme/typography';
import { getYearMonthSectionKey } from '../lib/formatters';

interface FolderScreenProps {
  route: any;
  navigation: any;
}

export const FolderScreen: React.FC<FolderScreenProps> = ({ route, navigation }) => {
  const { folder, breadcrumbs = [] } = route.params as { folder: Folder; breadcrumbs?: Folder[] };
  const { colors } = useAppTheme();
  const { currentTrack, isPlaying, playTrack, toggleFavourite } = useAudioPlayer();

  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const isYearMonthFolder = folder.type === 'year_month';
  const updatedBreadcrumbs = useMemo(() => [...breadcrumbs, folder], [breadcrumbs, folder]);

  const loadFolderContent = useCallback(async () => {
    try {
      // 1. Try loading cached subfolders and audio files
      const cachedSub = await getCachedFolders(folder.id);
      const cachedFiles = await getCachedAudioFiles(folder.id);

      if (cachedSub) setSubfolders(cachedSub);
      if (cachedFiles) setAudioFiles(cachedFiles);
      if (cachedSub || cachedFiles) setIsLoading(false);

      if (!isDemoMode) {
        // Fetch subfolders from Supabase
        const { data: subData } = await supabase
          .from('folders')
          .select('*')
          .eq('parent_id', folder.id)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (subData) {
          setSubfolders(subData as Folder[]);
          await setCachedFolders(folder.id, subData as Folder[]);
        }

        // Fetch audio files for this folder
        const { data: filesData } = await supabase
          .from('audio_files')
          .select('*')
          .eq('folder_id', folder.id)
          .order('recorded_at', { ascending: false });

        if (filesData) {
          setAudioFiles(filesData as AudioFile[]);
          await setCachedAudioFiles(folder.id, filesData as AudioFile[]);
        }
      } else {
        // Demo mode fallback
        const mockSubs = MOCK_SUBFOLDERS[folder.id] || [];
        const mockFiles = MOCK_AUDIO_FILES[folder.id] || [];
        setSubfolders(mockSubs);
        setAudioFiles(mockFiles);
        await setCachedFolders(folder.id, mockSubs);
        await setCachedAudioFiles(folder.id, mockFiles);
      }
    } catch (err) {
      console.warn('Error loading folder content:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [folder.id]);

  useEffect(() => {
    loadFolderContent();
  }, [loadFolderContent]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadFolderContent();
  };

  const handleScopedSearch = (query: string) => {
    if (query.trim()) {
      navigation.navigate('SearchScreen', {
        initialQuery: query.trim(),
        scopePath: folder.path,
        folderName: folder.name,
      });
    }
  };

  // Group audio files by month if year_month folder
  const groupedSections = useMemo(() => {
    if (!isYearMonthFolder) return [];

    const map = new Map<string, { label: string; year: number; month: number; data: AudioFile[] }>();

    for (const file of audioFiles) {
      const sectionInfo = getYearMonthSectionKey(file.recorded_at);
      if (!map.has(sectionInfo.key)) {
        map.set(sectionInfo.key, {
          label: sectionInfo.label,
          year: sectionInfo.year,
          month: sectionInfo.month,
          data: [],
        });
      }
      map.get(sectionInfo.key)!.data.push(file);
    }

    // Sort sections newest month first
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [audioFiles, isYearMonthFolder]);

  return (
    <ScreenBackground>
      <Header
        title={folder.name}
        subtitle={isYearMonthFolder ? 'سنة مرتبة تلقائياً بالأشهر' : undefined}
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      {/* Scoped Search Bar */}
      <SearchBar
        placeholder={`ابحث داخل "${folder.name}"...`}
        onSearch={handleScopedSearch}
      />

      {/* Breadcrumbs Row */}
      {updatedBreadcrumbs.length > 1 && (
        <View style={styles.breadcrumbRow}>
          <TouchableOpacity onPress={() => navigation.popToTop()}>
            <Text style={[styles.breadcrumbText, { color: colors.primary }]}>الرئيسية</Text>
          </TouchableOpacity>
          {updatedBreadcrumbs.slice(0, -1).map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <Ionicons name="chevron-back" size={14} color={colors.textMuted} style={styles.crumbSep} />
              <TouchableOpacity
                onPress={() => {
                  const popCount = updatedBreadcrumbs.length - 1 - idx;
                  if (popCount > 0) navigation.pop(popCount);
                }}
              >
                <Text style={[styles.breadcrumbText, { color: colors.textMuted }]} numberOfLines={1}>
                  {crumb.name}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}

      {isYearMonthFolder ? (
        // Year-Month View: SectionList grouped by month
        <SectionList
          sections={groupedSections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            subfolders.length > 0 ? (
              <View style={styles.subfolderSection}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
                  المجلدات الفرعية
                </Text>
                {subfolders.map((sub) => (
                  <FolderCard
                    key={sub.id}
                    folder={sub}
                    onPress={() =>
                      navigation.push('FolderScreen', {
                        folder: sub,
                        breadcrumbs: updatedBreadcrumbs,
                      })
                    }
                  />
                ))}
              </View>
            ) : undefined
          }
          renderSectionHeader={({ section: { label, data } }) => (
            <View style={[styles.monthHeaderContainer, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="calendar-outline" size={16} color={colors.accent} />
              <Text style={[styles.monthHeaderText, { color: colors.accent, fontFamily: typography.fontFamilyBold }]}>
                {label} ({data.length} تلاوة)
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <AudioItemRow
              audio={item}
              isCurrent={currentTrack?.id === item.id}
              isPlaying={isPlaying}
              onPress={() => playTrack(item, audioFiles)}
              onToggleFavourite={toggleFavourite}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <SkeletonList count={3} />
            ) : (
              <EmptyState
                icon="calendar-outline"
                title="لا توجد تلاوات في هذه السنة"
                description="لم يتم رفع تسجيلات بعد لهذا المجلد."
              />
            )
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        // Normal Folder View: FlatList with subfolders then files
        <FlatList
          data={audioFiles}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <>
              {subfolders.length > 0 && (
                <View style={styles.subfolderSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
                    المجلدات الفرعية
                  </Text>
                  {subfolders.map((sub) => (
                    <FolderCard
                      key={sub.id}
                      folder={sub}
                      onPress={() =>
                        navigation.push('FolderScreen', {
                          folder: sub,
                          breadcrumbs: updatedBreadcrumbs,
                        })
                      }
                    />
                  ))}
                </View>
              )}

              {audioFiles.length > 0 && (
                <View style={styles.filesSectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
                    التسجيلات والتلاوات ({audioFiles.length})
                  </Text>
                  <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
                </View>
              )}
            </>
          }
          renderItem={({ item }) => (
            <AudioItemRow
              audio={item}
              isCurrent={currentTrack?.id === item.id}
              isPlaying={isPlaying}
              onPress={() => playTrack(item, audioFiles)}
              onToggleFavourite={toggleFavourite}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <SkeletonList count={3} />
            ) : subfolders.length === 0 ? (
              <EmptyState
                icon="folder-open-outline"
                title="المجلد فارغ"
                description="لم يتم إضافة تسجيلات أو مجلدات فرعية هنا بعد."
              />
            ) : undefined
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 90,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    flexWrap: 'wrap',
  },
  breadcrumbText: {
    fontSize: 12,
  },
  crumbSep: {
    marginHorizontal: 6,
  },
  subfolderSection: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    paddingHorizontal: 20,
    marginBottom: 8,
    writingDirection: 'rtl',
  },
  filesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
  },
  monthHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    marginVertical: 10,
    gap: 8,
  },
  monthHeaderText: {
    fontSize: typography.sizes.sm,
    writingDirection: 'rtl',
  },
});
