import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';

type ViewToken = {
  item: any;
  key: string;
  index: number | null;
  isViewable: boolean;
  section?: any;
};
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBackground } from '../components/ScreenBackground';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { useAppTheme } from '../context/ThemeContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { Reel, supabase, isDemoMode } from '../lib/supabase';
import { MOCK_REELS } from '../lib/cache';
import { typography } from '../theme/typography';

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get('window');
// Account for header and bottom tab bar height (~140)
const REEL_HEIGHT = WINDOW_HEIGHT - 140;

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  onOpenApp: () => void;
}

const ReelItem: React.FC<ReelItemProps> = ({ reel, isActive, onOpenApp }) => {
  const { colors } = useAppTheme();
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Generate embed HTML
  const getEmbedHtml = () => {
    if (reel.platform === 'youtube') {
      // Extract video ID from youtube short URL or normal video
      let videoId = '';
      if (reel.url.includes('/shorts/')) {
        videoId = reel.url.split('/shorts/')[1]?.split('?')[0] || '';
      } else if (reel.url.includes('v=')) {
        videoId = reel.url.split('v=')[1]?.split('&')[0] || '';
      } else if (reel.url.includes('youtu.be/')) {
        videoId = reel.url.split('youtu.be/')[1]?.split('?')[0] || '';
      }

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            iframe { width: 100%; height: 100%; border: none; }
          </style>
        </head>
        <body>
          <iframe
            src="https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&playsinline=1&controls=1&modestbranding=1&rel=0&loop=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </body>
        </html>
      `;
    }

    // TikTok / Instagram / Facebook best-effort web view
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; font-family: sans-serif; text-align: center; }
          a { color: #2DD4BF; text-decoration: none; font-size: 18px; padding: 12px 20px; border: 1px solid #2DD4BF; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div>
          <p style="margin-bottom: 20px;">اضغط للمشاهدة في التطبيق الأصلي</p>
          <a href="${reel.url}">فتح المقطع</a>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <View style={[styles.reelContainer, { backgroundColor: '#000000', height: REEL_HEIGHT }]}>
      {isActive && !hasError ? (
        <WebView
          source={{ html: getEmbedHtml(), baseUrl: 'https://youtube.com' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : (
        <View style={styles.fallbackContainer}>
          <Ionicons
            name={
              reel.platform === 'youtube'
                ? 'logo-youtube'
                : reel.platform === 'instagram'
                ? 'logo-instagram'
                : 'videocam-outline'
            }
            size={64}
            color={colors.accent}
          />
          <Text style={[styles.fallbackTitle, { color: '#FFFFFF', fontFamily: typography.fontFamilyBold }]}>
            {reel.title || 'مقطع مرئي'}
          </Text>
          <Text style={[styles.fallbackSubtitle, { color: '#CCCCCC', fontFamily: typography.fontFamily }]}>
            {hasError
              ? 'تعذر تحميل المشغل المباشر، يمكنك فتح المقطع بالتطبيق'
              : 'اضغط لفتح المقطع ومشاهدته بجودة عالية'}
          </Text>
        </View>
      )}

      {/* Floating Info Overlay */}
      <View style={styles.overlayBottom}>
        <View style={styles.reelInfo}>
          {reel.title ? (
            <Text style={[styles.reelTitleText, { fontFamily: typography.fontFamilyBold }]}>
              {reel.title}
            </Text>
          ) : null}

          <View style={styles.platformBadge}>
            <Ionicons
              name={
                reel.platform === 'youtube'
                  ? 'logo-youtube'
                  : reel.platform === 'instagram'
                  ? 'logo-instagram'
                  : 'play-circle'
              }
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.platformBadgeText}>
              {reel.platform === 'youtube'
                ? 'YouTube Shorts'
                : reel.platform === 'instagram'
                ? 'Instagram'
                : reel.platform === 'tiktok'
                ? 'TikTok'
                : 'Facebook'}
            </Text>
          </View>
        </View>

        {/* Visible "فتح في التطبيق" button */}
        <TouchableOpacity
          style={[styles.openAppButton, { backgroundColor: colors.primary }]}
          onPress={onOpenApp}
          activeOpacity={0.8}
        >
          <Ionicons name="open-outline" size={16} color="#FFFFFF" />
          <Text style={[styles.openAppButtonText, { fontFamily: typography.fontFamilyBold }]}>
            فتح في التطبيق
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const ReelsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { isPlaying, togglePlayPause } = useAudioPlayer();

  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReels();
  }, []);

  // When reel tab is active and user plays a reel, pause audio player to avoid mixing sounds
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      // Pause track player if running
      if (isPlaying) {
        togglePlayPause();
      }
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      // Pause reels when tab is blurred
      setActiveIndex(-1);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, isPlaying, togglePlayPause]);

  const loadReels = async () => {
    setIsLoading(true);
    try {
      if (!isDemoMode) {
        const { data, error } = await supabase
          .from('reels')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && data) {
          setReels(data as Reel[]);
        }
      } else {
        setReels(MOCK_REELS);
      }
    } catch (err) {
      console.warn('Error loading reels:', err);
      setReels(MOCK_REELS);
    } finally {
      setIsLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(
    (info: { viewableItems: Array<any>; changed?: Array<any> }) => {
      if (info.viewableItems.length > 0 && info.viewableItems[0].index !== undefined && info.viewableItems[0].index !== null) {
        setActiveIndex(info.viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  return (
    <ScreenBackground showPattern={false} style={{ backgroundColor: '#000000' }}>
      <Header title="المقاطع المرئية" subtitle="مقتطفات وتلاوات قصيرة" />

      {reels.length > 0 ? (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          pagingEnabled={true}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }) => (
            <ReelItem
              reel={item}
              isActive={index === activeIndex}
              onOpenApp={() => Linking.openURL(item.url).catch(() => {})}
            />
          )}
        />
      ) : isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <EmptyState
          icon="videocam-outline"
          title="لا توجد مقاطع حالياً"
          description="سيتم إضافة مقاطع مرئية قصيرة قريباً."
        />
      )}
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  reelContainer: {
    width: WINDOW_WIDTH,
    position: 'relative',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    fontSize: typography.sizes.lg,
    marginTop: 16,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    fontSize: typography.sizes.sm,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  reelInfo: {
    flex: 1,
    marginRight: 12,
  },
  reelTitleText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    writingDirection: 'rtl',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  platformBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  openAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    elevation: 4,
  },
  openAppButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
