import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Keep the splash screen visible while loading resources
SplashScreen.preventAutoHideAsync().catch(() => {});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>حدث خطأ أثناء تشغيل التطبيق</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message || 'خطأ غير معروف'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#d32f2f',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
});

function MainApp() {
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Cairo-Regular': Cairo_400Regular,
    'Cairo-Medium': Cairo_600SemiBold,
    'Cairo-Bold': Cairo_700Bold,
  });
  const [safetyTimeoutPassed, setSafetyTimeoutPassed] = useState(false);

  useEffect(() => {
    // Safety timer to prevent splash screen from hanging indefinitely if fonts fail or delay
    const timer = setTimeout(() => {
      setSafetyTimeoutPassed(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && !safetyTimeoutPassed) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AudioPlayerProvider>
              <MainApp />
            </AudioPlayerProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
