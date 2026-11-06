import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { wakeServer } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

// React Query only knows about browser tabs. Tell it when the app comes to the foreground, so lists
// refresh then (new web orders show up when a parent opens the app) without polling the server.
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

const queryClient = new QueryClient({
  defaultOptions: {
    // Kitchen data changes when another family member edits it, so refetch when the app regains focus.
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

// Protected routes: only one of these groups exists at a time, so a logged-out phone can't
// navigate into the tabs, and a logged-in one never sees the PIN screen.
// This is UX only; the API's AuthGuard is what actually protects the data.
function RootNavigator() {
  const { isLoading, isLoggedIn } = useAuth();

  useEffect(() => {
    wakeServer();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && wakeServer());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="order/form" />
        <Stack.Screen name="order/[id]/index" />
        <Stack.Screen name="order/[id]/bill" />
        <Stack.Screen name="menu-item/[id]" />
        <Stack.Screen name="holidays" />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
