import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
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

/**
 * Auth Guard Component - Stabilized
 * 
 * STABILITY FIX:
 * - Consolidated all state transitions into a single atomic flow
 * - Removed overlapping useEffect hooks that caused rapid-fire updates
 * - Single source of truth for hydration and navigation readiness
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  
  // Zustand state - accessed directly to prevent selector re-renders
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const hasHydrated = useHasHydrated();
  const user = useAppStore((state) => state.user);
  const currentMood = useAppStore((state) => state.currentMood);
  
  // Refs for service initialization (prevents re-runs)
  const servicesInitialized = useRef(false);
  const navigationHandled = useRef(false);
  const adminsLoaded = useRef(false);
  
  // Single consolidated state for UI
  const [appState, setAppState] = useState<'loading' | 'ready'>('loading');

  /**
   * Initialize core services on app startup - runs ONCE
   */
  useEffect(() => {
    const initializeServices = async () => {
      if (servicesInitialized.current) return;
      servicesInitialized.current = true;

      console.log('[App] Initializing services...');

      try {
        // Initialize offline database (SQLite)
        await offlineDatabaseService.initialize();

        // Initialize network monitoring
        await networkService.initialize();

        // Initialize screenshot protection
        await screenshotProtectionService.initialize();

        // Initialize auto-logout service
        const { logout } = useAppStore.getState();
        await autoLogoutService.initialize(() => {
          console.log('[App] Auto-logout triggered after 90 days inactivity');
          logout();
          router.replace('/login');
        });

        // Start sync service
        syncService.start();

        console.log('[App] All services initialized');
      } catch (error) {
        console.error('[App] Service initialization error:', error);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      networkService.cleanup();
      screenshotProtectionService.cleanup();
      autoLogoutService.cleanup();
      syncService.stop();
      offlineDatabaseService.close();
    };
  }, [router]);

  /**
   * CONSOLIDATED STATE TRANSITION
   * Single effect that handles hydration → ready state transition
   */
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    // If hydrated, show content immediately
    if (hasHydrated) {
      setAppState('ready');
      return;
    }
    
    // Fallback: Force show content after 1.5s even if hydration fails
    timeout = setTimeout(() => {
      console.log('[AuthGuard] Force showing content (hydration timeout)');
      const { setHasHydrated } = useAppStore.getState();
      setHasHydrated(true);
      setAppState('ready');
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [hasHydrated]);

  /**
   * Update screenshot protection based on current screen
   */
  useEffect(() => {
    if (pathname && appState === 'ready') {
      screenshotProtectionService.updateForScreen(pathname);
    }
  }, [pathname, appState]);

  /**
   * Record user activity for auto-logout tracking
   */
  useEffect(() => {
    if (appState === 'ready' && isAuthenticated && user) {
      autoLogoutService.recordUserActivity();
      offlineDatabaseService.updateLastActivity(user.id);
    }
  }, [appState, isAuthenticated, user, pathname]);

  /**
   * Fetch admins list for access control - runs ONCE per session
   */
  useEffect(() => {
    if (appState !== 'ready' || !isAuthenticated || adminsLoaded.current) return;
    
    const fetchAdmins = async () => {
      try {
        const response = await adminApi.checkAccess();
        if (response.data) {
          const { setAdmins } = useAppStore.getState();
          setAdmins(response.data);
          adminsLoaded.current = true;
          console.log('[AuthGuard] Admins list loaded');
        }
      } catch (error) {
        console.log('[AuthGuard] Could not fetch admins list');
      }
    };

    fetchAdmins();
  }, [appState, isAuthenticated]);

  /**
   * NAVIGATION GUARD
   * Handles auth-based routing with debounced navigation
   */
  useEffect(() => {
    if (appState !== 'ready') return;
    
    // Prevent rapid-fire navigation calls
    const navigateTimeout = setTimeout(() => {
      const inAuthGroup = segments[0] === 'login';
      const inProtectedRoute = 
        segments[0] === 'admin' || 
        segments[0] === 'owner' || 
        segments[0] === 'checkout' || 
        segments[0] === 'orders' ||
        segments[0] === 'favorites';

      // Authenticated user on login page → redirect to home
      if (isAuthenticated && inAuthGroup) {
        console.log('[AuthGuard] Redirecting authenticated user to home');
        router.replace('/(tabs)');
        return;
      }
      
      // Unauthenticated user on protected route → redirect to login
      if (!isAuthenticated && inProtectedRoute) {
        console.log('[AuthGuard] Redirecting unauthenticated user to login');
        router.replace('/login');
        return;
      }
    }, 100); // Debounce navigation by 100ms
    
    return () => clearTimeout(navigateTimeout);
  }, [appState, isAuthenticated, segments, router]);

  // Loading state
  if (appState === 'loading') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentMood?.background || '#0F172A' }]}>
        <ActivityIndicator size="large" color={currentMood?.primary || '#3B82F6'} />
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Root Layout - Minimal and Stable
 */
export default function RootLayout() {
  const theme = useAppStore((state) => state.theme);

  return (
    <QueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
