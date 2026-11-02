import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/lib/i18n';
import { colors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const { t } = useI18n();
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13 },
        tabBarStyle: { height: 64 + bottom, paddingTop: 6, paddingBottom: bottom },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.orders'), tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="new-order" options={{ title: t('tabs.newOrder'), tabBarIcon: icon('add-circle') }} />
      <Tabs.Screen name="menu" options={{ title: t('tabs.menu'), tabBarIcon: icon('restaurant') }} />
      <Tabs.Screen name="dues" options={{ title: t('tabs.dues'), tabBarIcon: icon('wallet') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
