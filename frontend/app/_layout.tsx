/**
 * Root Layout - High-Performance Startup Architecture
 * 
 * Optimizations:
 * - Integrated asset loading with graceful degradation
 * - Reduced hydration timeout (16s max)
 * - Pre-fetching during native splash phase
 * - Mobile loop prevention maintained via refs
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '../src/providers/QueryProvider';
import { useAppStore, useHasHydrated } from '../src/store/appStore';
import { adminApi } from '../src/services/api';
import { syncService } from '../src/services/syncService';
import { networkService } from '../src/services/networkService';
import { screenshotProtectionService } from '../src/services/screenshotProtectionService';
import { autoLogoutService } from '../src/services/autoLogoutService';
import { offlineDatabaseService } from '../src/services/offlineDatabaseService';
import assetLoader from '../src/services/fontLoader';
import { DriftLoader } from '../src/components/ui/DriftLoader';

// Configuration Constants
const MIN_SPLASH_DISPLAY_MS = 2000;   // DriftLoader visible for at least 2s
const HYDRATION_TIMEOUT_MS = 16000;   // 16 second fallback (reduced from 37s)

/**
 * Auth Guard Component - Optimized Startup Lifecycle
 * 
 * Architecture:
 * 1. Asset prefetch during native splash
 * 2. Hydration with 16s timeout
 * 3. Minimum 2s DriftLoader display
 * 4. Graceful degradation for fonts
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  
  // Zustand state - minimal selectors for performance
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const hasHydrated = useHasHydrated();
  const user = useAppStore((state) => state.user);
  const currentMood = useAppStore((state) => state.currentMood);
  
  // Refs for preventing duplicate operations & mobile loop prevention
  const servicesInitialized = useRef(false);
  const adminsLoaded = useRef(false);
  const lastActivityRecorded = useRef(0);
  const assetsPreloaded = useRef(false);
  
  // App ready state
  const [appReady, setAppReady] = useState(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const [hydrationComplete, setHydrationComplete] = useState(false);

  /**
   * Phase 1: Asset Prefetch - runs once on mount
   * Prefetches fonts/assets during native splash
   */
  useEffect(() => {
    if (assetsPreloaded.current) return;
    assetsPreloaded.current = true;

    const prefetchAssets = async () => {
      try {
        await assetLoader.prefetchCriticalAssets();
        // Load custom fonts with graceful degradation (13.5s timeout)
        await assetLoader.loadFontsWithGracefulDegradation();
      } catch (error) {
        // Non-blocking - app proceeds with system fonts
      }
    };

    prefetchAssets();
  }, []);

  /**
   * Minimum splash display timer
   * Ensures DriftLoader animation is visible
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, MIN_SPLASH_DISPLAY_MS);
    
    return () => clearTimeout(timer);
  }, []);

  /**
   * Hydration handler - optimized timeout (16s)
   * NO pathname dependency - prevents mobile infinite loop
   */
  useEffect(() => {
    if (hasHydrated) {
      setHydrationComplete(true);
      return;
    }
    
    // Fallback timeout - 16 seconds max
    const timeout = setTimeout(() => {
      const { setHasHydrated } = useAppStore.getState();
      setHasHydrated(true);
      setHydrationComplete(true);
    }, HYDRATION_TIMEOUT_MS);
    
    return () => clearTimeout(timeout);
  }, [hasHydrated]);

  /**
   * App ready determination
   * Ready when both: hydration complete AND minimum splash elapsed
   */
  useEffect(() => {
    if (hydrationComplete && minSplashElapsed && !appReady) {
      // Hide native splash and show app
      assetLoader.hideSplashScreen();
      setAppReady(true);
    }
  }, [hydrationComplete, minSplashElapsed, appReady]);

  /**
   * Initialize core services - runs ONCE when app is ready
   */
  useEffect(() => {
    if (!appReady || servicesInitialized.current) return;
    servicesInitialized.current = true;

    const initializeServices = async () => {
      try {
        await offlineDatabaseService.initialize();
        await networkService.initialize();
        await screenshotProtectionService.initialize();
        
        const { logout } = useAppStore.getState();
        await autoLogoutService.initialize(() => {
          logout();
          router.replace('/login');
        });

        syncService.start();
      } catch (error) {
        // Services will retry on next app open
      }
    };

    initializeServices();

    return () => {
      networkService.cleanup();
      screenshotProtectionService.cleanup();
      autoLogoutService.cleanup();
      syncService.stop();
      offlineDatabaseService.close();
    };
  }, [appReady]);

  /**
   * User activity tracking - debounced interval-based
   * NO pathname dependency
   */
  useEffect(() => {
    if (!appReady || !isAuthenticated || !user) return;

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivityRecorded.current > 5000) {
        lastActivityRecorded.current = now;
        autoLogoutService.recordUserActivity();
        offlineDatabaseService.updateLastActivity(user.id);
      }
    };

    recordActivity();
    const interval = setInterval(recordActivity, 60000);

    return () => clearInterval(interval);
  }, [appReady, isAuthenticated, user?.id]);

  /**
   * Fetch admins list - runs ONCE when authenticated
   */
  useEffect(() => {
    if (!appReady || !isAuthenticated || adminsLoaded.current) return;

    const fetchAdmins = async () => {
      try {
        const response = await adminApi.checkAccess();
        if (response.data) {
          const { setAdmins } = useAppStore.getState();
          setAdmins(response.data);
          adminsLoaded.current = true;
        }
      } catch (error) {
        // Non-blocking
      }
    };

    fetchAdmins();
  }, [appReady, isAuthenticated]);

  /**
   * Navigation guard - auth-based routing
   * Uses segments only (stable on mobile)
   */
  useEffect(() => {
    if (!appReady) return;

    const timeout = setTimeout(() => {
      const inAuthGroup = segments[0] === 'login';
      const inProtectedRoute = 
        segments[0] === 'admin' || 
        segments[0] === 'owner' || 
        segments[0] === 'checkout' || 
        segments[0] === 'orders' ||
        segments[0] === 'favorites';

      if (isAuthenticated && inAuthGroup) {
        router.replace('/(tabs)');
      } else if (!isAuthenticated && inProtectedRoute) {
        router.replace('/login');
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [appReady, isAuthenticated, segments]);

  // Loading state - DriftLoader animation
  if (!appReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentMood?.background || '#0F172A' }]}>
        <DriftLoader size="large" color={currentMood?.primary || '#3B82F6'} />
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Root Layout - Minimal wrapper with providers
 */
export default function RootLayout() {
  const theme = useAppStore((state) => state.theme);

  return (
    <QueryProvider>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ presentation: 'modal' }} />
              <Stack.Screen name="product/[id]" />
              <Stack.Screen name="category/[id]" />
              <Stack.Screen name="car/[id]" />
              <Stack.Screen name="brand/[id]" />
              <Stack.Screen name="models" />
              <Stack.Screen name="search" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="orders" />
              <Stack.Screen name="favorites" />
            </Stack>
          </AuthGuard>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
