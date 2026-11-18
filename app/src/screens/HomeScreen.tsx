import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { Header } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { FolderCard } from '../components/FolderCard';
import { SkeletonList } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { useAppTheme } from '../context/ThemeContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { Folder, AudioFile, supabase, isDemoMode } from '../lib/supabase';
import {
  getCachedFolders,
  setCachedFolders,
  getLocalContinueListening,
  ContinueListeningItem,
  MOCK_ROOT_FOLDERS,
} from '../lib/cache';
import { typography } from '../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../lib/formatters';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { playTrack } = useAudioPlayer();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [continueListening, setContinueListening] = useState<ContinueListeningItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Load Continue Listening items
      const recent = await getLocalContinueListening();
      setContinueListening(recent);

      // 2. Try loading cached folders first for instant offline rendering
      const cached = await getCachedFolders(null);
      if (cached && cached.length > 0) {
        setFolders(cached);
        setIsLoading(false);
      }

      // 3. Fetch fresh root folders from Supabase
      if (!isDemoMode) {
        const { data, error } = await supabase
          .from('folders')
          .select('*')
          .is('parent_id', null)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (!error && data) {
          setFolders(data as Folder[]);
          await setCachedFolders(null, data as Folder[]);
        }
      } else {
        // Demo fallback
        setFolders(MOCK_ROOT_FOLDERS);
        await setCachedFolders(null, MOCK_ROOT_FOLDERS);
      }
    } catch (err) {
      console.warn('Error loading home data:', err);
      if (folders.length === 0) {
        setFolders(MOCK_ROOT_FOLDERS);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh continue listening on focus
      getLocalContinueListening().then(setContinueListening);
    });
    return unsubscribe;
  }, [loadData, navigation]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      navigation.navigate('SearchScreen', { initialQuery: query.trim(), scopePath: null });
    }
  };

  return (
    <ScreenBackground>
      <Header title="تلاوات المسجد الكبير" subtitle="التسجيلات والخطب والتلاوات القرآنية" />

      {/* Global Search Bar */}
      <SearchBar
        placeholder="ابحث في جميع التسجيلات والمجلدات..."
        onSearch={handleSearchSubmit}
      />

      <FlatList
        data={folders}
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
            {/* Continue Listening Section (متابعة الاستماع) */}
            {continueListening.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
                    متابعة الاستماع
                  </Text>
                  <Ionicons name="time-outline" size={18} color={colors.accent} />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.continueList}
                >
                  {continueListening.map((item) => {
                    const ratio =
                      item.audio.duration_seconds > 0
                        ? Math.min(1, item.positionSeconds / item.audio.duration_seconds)
                        : 0;

                    return (
                      <TouchableOpacity
                        key={item.audio.id}
                        style={[
                          styles.continueCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.borderLight,
                          },
                        ]}
                        onPress={() => playTrack(item.audio, [], item.positionSeconds)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.continueCardContent}>
                          <Text
                            style={[
                              styles.continueTitle,
                              { color: colors.text, fontFamily: typography.fontFamilyBold },
                            ]}
                            numberOfLines={1}
                          >
                            {item.audio.title}
                          </Text>
                          <Text
                            style={[
                              styles.continueSpeaker,
                              { color: colors.textMuted, fontFamily: typography.fontFamily },
                            ]}
                            numberOfLines={1}
                          >
                            {item.audio.speaker}
                          </Text>

                          <View style={styles.continueMeta}>
                            <Text style={[styles.continueTime, { color: colors.accent }]}>
                              {formatDuration(item.positionSeconds)}
                            </Text>
                            <Ionicons name="play-circle" size={24} color={colors.primary} />
                          </View>

                          {/* Mini Progress */}
                          <View style={[styles.progressBg, { backgroundColor: colors.borderLight }]}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  backgroundColor: colors.primary,
                                  width: `${ratio * 100}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Folders Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
                الأقسام والمكتبة الصوتية
              </Text>
              <Ionicons name="folder-outline" size={18} color={colors.primary} />
            </View>
          </>
        }
        renderItem={({ item }) => (
          <FolderCard
            folder={item}
            onPress={() => navigation.navigate('FolderScreen', { folder: item })}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList count={3} />
          ) : (
            <EmptyState
              icon="folder-open-outline"
              title="لا توجد مجلدات حالياً"
              description="سيتم إضافة التلاوات والخطب قريباً."
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
    paddingBottom: 80,
  },
  sectionContainer: {
    marginVertical: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    writingDirection: 'rtl',
  },
  continueList: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 12,
  },
  continueCard: {
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  continueCardContent: {
    padding: 12,
  },
  continueTitle: {
    fontSize: typography.sizes.sm,
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  continueSpeaker: {
    fontSize: typography.sizes.xs,
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  continueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  continueTime: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
