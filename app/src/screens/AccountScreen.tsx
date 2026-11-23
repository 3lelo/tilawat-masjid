import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBackground } from '../components/ScreenBackground';
import { Header } from '../components/Header';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import {
  getDownloadedFiles,
  deleteDownloadedFile,
  clearAllDownloads,
  getTotalDownloadsSize,
  DownloadedAudioItem,
} from '../lib/storage';
import { formatFileSize, formatDuration } from '../lib/formatters';
import { typography } from '../theme/typography';

export const AccountScreen: React.FC = () => {
  const { colors, mode, isDark, toggleTheme } = useAppTheme();
  const { user, profile, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { playTrack } = useAudioPlayer();

  const [downloadedItems, setDownloadedItems] = useState<DownloadedAudioItem[]>([]);
  const [totalDownloadsSize, setTotalDownloadsSize] = useState<number>(0);

  const loadDownloads = async () => {
    const list = await getDownloadedFiles();
    const size = await getTotalDownloadsSize();
    setDownloadedItems(list);
    setTotalDownloadsSize(size);
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const handleDeleteDownload = (item: DownloadedAudioItem) => {
    Alert.alert(
      'حذف الملف الصوتي',
      `هل تريد حذف "${item.audio.title}" من التخزين المحلي؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await deleteDownloadedFile(item.audio.id);
            loadDownloads();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'حذف جميع التنزيلات',
      'هل تريد مسح جميع الملفات الصوتية المخزنة على جهازك؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح الكل',
          style: 'destructive',
          onPress: async () => {
            await clearAllDownloads();
            loadDownloads();
          },
        },
      ]
    );
  };

  return (
    <ScreenBackground>
      <Header title="حسابي والإعدادات" subtitle="الملف الشخصي والتحكم بالتنزيلات" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          {user ? (
            <View style={styles.profileRow}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                  <Ionicons name="person" size={28} color="#FFFFFF" />
                </View>
              )}

              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      styles.profileName,
                      { color: colors.text, fontFamily: typography.fontFamilyBold },
                    ]}
                  >
                    {profile?.display_name || user.email || 'المستخدم'}
                  </Text>
                  {isAdmin && (
                    <View style={[styles.adminBadge, { backgroundColor: colors.accent }]}>
                      <Text style={styles.adminBadgeText}>مسؤول</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.profileEmail,
                    { color: colors.textMuted, fontFamily: typography.fontFamily },
                  ]}
                >
                  {user.email || 'حساب Google متصل'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.signOutBtn, { borderColor: colors.border }]}
                onPress={signOut}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.guestLoginBox}>
              <View style={[styles.guestIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="person-outline" size={32} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.guestTitle,
                  { color: colors.text, fontFamily: typography.fontFamilyBold },
                ]}
              >
                أنت تتصفح كضيف
              </Text>
              <Text
                style={[
                  styles.guestSub,
                  { color: colors.textMuted, fontFamily: typography.fontFamily },
                ]}
              >
                سجّل دخولك بحساب Google لمزامنة مفضلتك ومتابعة الاستماع على جميع أجهزتك.
              </Text>
              <TouchableOpacity
                style={[styles.googleSignInBtn, { backgroundColor: colors.primary }]}
                onPress={signInWithGoogle}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                <Text
                  style={[
                    styles.googleSignInText,
                    { fontFamily: typography.fontFamilyBold },
                  ]}
                >
                  تسجيل الدخول باستخدام Google
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Admin Web Panel Shortcut (If user is Admin) */}
        {isAdmin && (
          <TouchableOpacity
            style={[
              styles.adminLinkCard,
              { backgroundColor: `${colors.accent}15`, borderColor: colors.accent },
            ]}
            onPress={() => {
              Linking.openURL('https://tilawat-admin.vercel.app').catch(() => {
                Alert.alert('رابط لوحة الإدارة', 'لوحة التحكم متاحة عبر المتصفح: https://tilawat-admin.vercel.app');
              });
            }}
          >
            <View style={styles.adminLinkRow}>
              <Ionicons name="settings" size={24} color={colors.accent} />
              <View style={styles.adminLinkTextCol}>
                <Text
                  style={[
                    styles.adminLinkTitle,
                    { color: colors.accent, fontFamily: typography.fontFamilyBold },
                  ]}
                >
                  لوحة تحكم المشرف (Web Admin)
                </Text>
                <Text
                  style={[
                    styles.adminLinkSub,
                    { color: colors.textMuted, fontFamily: typography.fontFamily },
                  ]}
                >
                  إضافة وتعديل التسجيلات والمجلدات والمقاطع القصيرة
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.accent} />
            </View>
          </TouchableOpacity>
        )}

        {/* Display Settings Section */}
        <Text
          style={[
            styles.sectionHeading,
            { color: colors.text, fontFamily: typography.fontFamilyBold },
          ]}
        >
          المظهر والعرض
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text
                style={[
                  styles.settingTitle,
                  { color: colors.text, fontFamily: typography.fontFamilyBold },
                ]}
              >
                الوضع الداكن (Dark Mode)
              </Text>
              <Text
                style={[
                  styles.settingSub,
                  { color: colors.textMuted, fontFamily: typography.fontFamily },
                ]}
              >
                تفعيل الألوان الليلية الهادئة والمريحة للعين
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              thumbColor={isDark ? colors.primary : '#FFFFFF'}
              trackColor={{ false: colors.border, true: `${colors.primary}60` }}
            />
          </View>
        </View>

        {/* Offline Downloads Management Section */}
        <View style={styles.downloadsSectionHeader}>
          <Text
            style={[
              styles.sectionHeading,
              { color: colors.text, fontFamily: typography.fontFamilyBold },
            ]}
          >
            التنزيلات والاستماع بدون إنترنت
          </Text>
          {downloadedItems.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={[styles.clearAllText, { color: colors.danger }]}>مسح الكل</Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.storageUsageRow}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.accent} />
            <Text
              style={[
                styles.storageUsageText,
                { color: colors.text, fontFamily: typography.fontFamily },
              ]}
            >
              إجمالي المساحة المستخدمة: {formatFileSize(totalDownloadsSize)} ({downloadedItems.length} تسجيل)
            </Text>
          </View>

          {downloadedItems.length > 0 ? (
            downloadedItems.map((item) => (
              <View
                key={item.audio.id}
                style={[styles.downloadedItemRow, { borderTopColor: colors.borderLight }]}
              >
                <TouchableOpacity
                  style={styles.downloadedInfo}
                  onPress={() => playTrack(item.audio)}
                >
                  <Text
                    style={[
                      styles.downloadedTitle,
                      { color: colors.text, fontFamily: typography.fontFamilyBold },
                    ]}
                    numberOfLines={1}
                  >
                    {item.audio.title}
                  </Text>
                  <View style={styles.downloadedMetaRow}>
                    <Text style={[styles.downloadedSub, { color: colors.textMuted }]}>
                      {item.audio.speaker}
                    </Text>
                    <Text style={[styles.downloadedDot, { color: colors.border }]}>•</Text>
                    <Text style={[styles.downloadedSub, { color: colors.textMuted }]}>
                      {formatFileSize(item.fileSizeBytes)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteDownloadBtn}
                  onPress={() => handleDeleteDownload(item)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text
              style={[
                styles.noDownloadsText,
                { color: colors.textMuted, fontFamily: typography.fontFamily },
              ]}
            >
              لا توجد تلاوات محملة حالياً. يمكنك الضغط على زر التنزيل في المشغل لأي تلاوة للاستماع لها أوفلاين.
            </Text>
          )}
        </View>

        {/* Mosque Info & Developer Credits Card */}
        <View style={styles.mosqueCard}>
          <Text
            style={[
              styles.mosqueName,
              { color: colors.text, fontFamily: typography.fontFamilyBold },
            ]}
          >
            تلاوات المسجد الكبير
          </Text>
          <Text
            style={[
              styles.mosqueSub,
              { color: colors.textMuted, fontFamily: typography.fontFamily },
            ]}
          >
            الإصدار 1.0.0 • وقف لله تعالى
          </Text>

          {/* Developer Credits */}
          <View
            style={[
              styles.creditsBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.creditsTitle,
                { color: colors.text, fontFamily: typography.fontFamilyBold },
              ]}
            >
              تطوير وبرمجة: علي عدنان (Ali Adnan)
            </Text>

            <View style={styles.creditsRow}>
              <TouchableOpacity
                onPress={() => Linking.openURL('tel:+972595547471').catch(() => {})}
                style={[
                  styles.creditBtn,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="call-outline" size={16} color={colors.primary} />
                <Text
                  style={[
                    styles.creditBtnText,
                    { color: colors.primary, fontFamily: typography.fontFamilyBold },
                  ]}
                >
                  +972 595547471
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL('https://www.facebook.com/ali08adnan').catch(() => {})}
                style={[
                  styles.creditBtn,
                  { backgroundColor: '#1877F215' },
                ]}
              >
                <Ionicons name="logo-facebook" size={16} color="#1877F2" />
                <Text
                  style={[
                    styles.creditBtnText,
                    { color: '#1877F2', fontFamily: typography.fontFamilyBold },
                  ]}
                >
                  Facebook
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginLeft: 12,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  profileDetails: {
    flex: 1,
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: typography.sizes.md,
    writingDirection: 'rtl',
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: typography.sizes.xs,
    marginTop: 4,
    writingDirection: 'rtl',
  },
  signOutBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  guestLoginBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  guestTitle: {
    fontSize: typography.sizes.md,
    marginBottom: 4,
  },
  guestSub: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
  },
  googleSignInText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
  },
  adminLinkCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  adminLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminLinkTextCol: {
    flex: 1,
  },
  adminLinkTitle: {
    fontSize: typography.sizes.sm,
    writingDirection: 'rtl',
  },
  adminLinkSub: {
    fontSize: 11,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    marginBottom: 8,
    writingDirection: 'rtl',
    paddingHorizontal: 4,
  },
  downloadsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: typography.sizes.sm,
    writingDirection: 'rtl',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  storageUsageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  storageUsageText: {
    fontSize: 12,
    writingDirection: 'rtl',
  },
  downloadedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    justifyContent: 'space-between',
  },
  downloadedInfo: {
    flex: 1,
    marginRight: 12,
  },
  downloadedTitle: {
    fontSize: typography.sizes.xs,
    writingDirection: 'rtl',
  },
  downloadedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  downloadedSub: {
    fontSize: 11,
    writingDirection: 'rtl',
  },
  downloadedDot: {
    fontSize: 10,
  },
  deleteDownloadBtn: {
    padding: 6,
  },
  noDownloadsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingVertical: 12,
  },
  mosqueCard: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  mosqueName: {
    fontSize: typography.sizes.sm,
  },
  mosqueSub: {
    fontSize: 11,
    marginTop: 4,
  },
  creditsBox: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  creditsTitle: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  creditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  creditBtnText: {
    fontSize: 11,
    direction: 'ltr',
  },
});
