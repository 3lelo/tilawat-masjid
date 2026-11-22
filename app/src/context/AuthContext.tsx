import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Alert, NativeModules } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { supabase, Profile, isDemoMode } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Check if running inside Expo Go or without custom native Google Sign-in binary
export const isExpoGo = Constants.appOwnership === 'expo';
export const isNativeGoogleAuthAvailable = !isExpoGo && Boolean(NativeModules.RNGoogleSignin);

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Web client ID configured in Google Cloud Console
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '123456789-dummy.apps.googleusercontent.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Configure Google Sign In only when native module is present
  useEffect(() => {
    if (isNativeGoogleAuthAvailable) {
      try {
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
        });
      } catch (e) {
        console.warn('GoogleSignin configure error:', e);
      }
    }
  }, []);

  // Listen to Supabase auth changes
  useEffect(() => {
    if (isDemoMode) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.warn('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);

      // In Expo Go or demo mode, provide demo account for full functionality preview
      if (isDemoMode || !isNativeGoogleAuthAvailable) {
        const mockProfile: Profile = {
          id: 'demo-user-123',
          display_name: 'أحمد عبد الله (حساب تجريبي)',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
          role: 'admin',
          created_at: new Date().toISOString(),
        };
        setProfile(mockProfile);
        setUser({ id: mockProfile.id, email: 'demo@example.com' } as any);

        if (!isNativeGoogleAuthAvailable && !isDemoMode) {
          Alert.alert(
            'وضع التجربة (Expo Go)',
            'تم تسجيل الدخول بحساب تجريبي لأن تسجيل الدخول عبر Google الأصلي يتطلب حزمة الإنتاج (Production APK / Development Build). في تطبيق الإنتاج سيعمل تسجيل الدخول عبر Google الحقيقي مباشرة.',
            [{ text: 'حسناً' }]
          );
        }
        setIsLoading(false);
        return;
      }

      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('لم يتم استلام معرف الدخول (ID Token) من Google');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await fetchProfile(data.user.id);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Sign in in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('خدمات Google Play غير متوفرة أو غير محدثة');
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      if (!isDemoMode && isNativeGoogleAuthAvailable) {
        await GoogleSignin.signOut().catch(() => {});
        await supabase.auth.signOut().catch(() => {});
      } else if (!isDemoMode) {
        await supabase.auth.signOut().catch(() => {});
      }
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.warn('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isAdmin,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
