import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { type ColorValue, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/lib/i18n';
import { useDues } from '@/lib/queries';
import { colors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const { t } = useI18n();
  const { bottom } = useSafeAreaInsets();
  const dues = useDues();
  const owing = dues.data?.filter((d) => d.balancePaise > 0).length ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        // Five labels share the width; with a large phone font they were cut off ("नया ऑ...").
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          height: 68 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.orders'), tabBarIcon: icon('receipt-outline') }} />
      <Tabs.Screen name="menu" options={{ title: t('tabs.menu'), tabBarIcon: icon('restaurant-outline') }} />
      {/* Not a real tab: the raised centre button opens the New Order flow as its own screen. */}
      <Tabs.Screen
        name="new-order"
        options={{
          title: t('tabs.newOrder'),
          tabBarButton: () => (
            <Pressable
              onPress={() => router.push('/order/form')}
              style={styles.newOrder}
              accessibilityRole="button"
              accessibilityLabel={t('tabs.newOrder')}
            >
              <View style={styles.fab}>
                <Ionicons name="add" size={34} color={colors.onPrimary} />
              </View>
              <Text style={styles.newOrderLabel} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>
                {t('tabs.newOrder')}
              </Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="dues"
        options={{
          title: t('tabs.dues'),
          tabBarIcon: icon('wallet-outline'),
          tabBarBadge: owing > 0 ? owing : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary },
        }}
      />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  newOrder: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    elevation: 6,
  },
  newOrderLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
});
