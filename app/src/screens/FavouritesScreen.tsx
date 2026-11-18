import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBackground } from '../components/ScreenBackground';
import { Header } from '../components/Header';
import { AudioItemRow } from '../components/AudioItemRow';
import { SkeletonList } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { AudioFile, supabase, isDemoMode } from '../lib/supabase';
import { getLocalFavourites, MOCK_AUDIO_FILES } from '../lib/cache';
import { typography } from '../theme/typography';

export const FavouritesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { user, signInWithGoogle } = useAuth();
  const { currentTrack, isPlaying, playTrack, toggleFavourite } = useAudioPlayer();

  const [favouriteFiles, setFavouriteFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadFavourites = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user && !isDemoMode) {
        // Fetch from Supabase for logged-in user
        const { data, error } = await supabase
          .from('favourites')
          .select('audio_id, audio_files(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const files = data
            .map((item: any) => item.audio_files)
            .filter((f: any) => f !== null) as AudioFile[];
          setFavouriteFiles(files);
        }
      } else {
        // Guest or demo mode: load from local favourites
        const localFavIds = await getLocalFavourites();
        const allAudio = Object.values(MOCK_AUDIO_FILES).flat();
        const matched = allAudio.filter((a) => localFavIds.includes(a.id));
        setFavouriteFiles(matched);
      }
    } catch (err) {
      console.warn('Error loading favourites:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadFavourites();
  };

  return (
    <ScreenBackground>
      <Header title="التلاوات المفضلة" subtitle="تسجيلاتك المحفوظة للاستماع السريع" />

      {/* Guest Banner if not logged in */}
      {!user && (
        <View style={[styles.guestBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
          <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
          <View style={styles.bannerTextCol}>
            <Text style={[styles.bannerTitle, { color: colors.text, fontFamily: typography.fontFamilyBold }]}>
              سجّل دخولك لحفظ مفضلتك عبر الأجهزة
            </Text>
            <Text style={[styles.bannerSub, { color: colors.textMuted, fontFamily: typography.fontFamily }]}>
              يمكنك الاستماع وحفظ المفضلة على هذا الجهاز، أو تسجيل الدخول بحساب Google للمزامنة.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
            onPress={signInWithGoogle}
          >
            <Text style={[styles.signInBtnText, { fontFamily: typography.fontFamilyBold }]}>
              دخول
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={favouriteFiles}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <AudioItemRow
            audio={item}
            isCurrent={currentTrack?.id === item.id}
            isPlaying={isPlaying}
            isFavourite={true}
            onPress={() => playTrack(item, favouriteFiles)}
            onToggleFavourite={async () => {
              await toggleFavourite();
              loadFavourites();
            }}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList count={3} />
          ) : (
            <EmptyState
              icon="heart-outline"
              title="قائمة المفضلة فارغة"
              description="اضغط على أيقونة القلب في أي تلاوة لحفظها هنا والرجوع إليها بسهولة."
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
    paddingTop: 8,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: typography.sizes.xs,
    writingDirection: 'rtl',
  },
  bannerSub: {
    fontSize: 11,
    marginTop: 2,
    writingDirection: 'rtl',
    lineHeight: 16,
  },
  signInBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
