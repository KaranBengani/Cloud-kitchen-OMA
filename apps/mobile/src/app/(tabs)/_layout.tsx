import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useI18n } from '@/lib/i18n';
import { colors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13 },
        tabBarStyle: { height: 64, paddingTop: 6 },
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
