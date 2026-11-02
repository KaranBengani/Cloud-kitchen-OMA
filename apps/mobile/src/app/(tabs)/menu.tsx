import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Card, Chip, ChipRow, EmptyState, ErrorState, Icon, SearchBox, Skeleton } from '@/components/ui';
import { menuText, whatsappUrl } from '@/lib/bill';
import { quantity, rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useMenu, useSaveMenuItem } from '@/lib/queries';
import { colors, font, radius, serif, space } from '@/lib/theme';
import type { MenuItem } from '@/lib/types';

// The app is the source of truth for prices (D8). The switch hides seasonal items from New Order.
export default function MenuScreen() {
  const { t } = useI18n();
  const menu = useMenu();
  const save = useSaveMenuItem();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const content = () => {
    if (menu.isPending) return <Skeleton />;
    if (menu.isError) return <ErrorState error={menu.error} onRetry={() => menu.refetch()} />;

    const categories = [...new Set(menu.data.map((m) => m.category))];
    const q = query.trim().toLowerCase();
    const items = menu.data.filter(
      (m) => (!category || m.category === category) && (!q || `${m.name} ${m.category}`.toLowerCase().includes(q)),
    );

    return (
      <FlatList
        data={items}
        keyExtractor={(m) => String(m.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        refreshControl={<RefreshControl refreshing={menu.isRefetching} onRefresh={() => void menu.refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card onPress={() => Linking.openURL(whatsappUrl(menuText(menu.data)))} style={styles.share}>
              <View style={styles.row}>
                <View style={styles.shareIcon}>
                  <Icon name="share-social" color={colors.onPrimary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.shareTitle}>{t('menu.share')}</Text>
                  <Text style={styles.muted}>{t('menu.shareHint')}</Text>
                </View>
                <Icon name="logo-whatsapp" color={colors.whatsapp} size={28} />
              </View>
            </Card>
            <SearchBox value={query} onChangeText={setQuery} placeholder={t('menu.search')} />
            <ChipRow>
              <Chip label={t('items.all')} selected={!category} onPress={() => setCategory(null)} />
              {categories.map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </ChipRow>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="search-outline" title={t('items.noneFound')} />}
        renderItem={({ item }) => (
          <MenuRow item={item} onToggle={(isAvailable) => save.mutate({ id: item.id, isAvailable })} />
        )}
      />
    );
  };

  return (
    <Screen title={t('tabs.menu')}>
      {content()}
      <Pressable
        onPress={() => router.push({ pathname: '/menu-item/[id]', params: { id: 'new' } })}
        style={styles.fab}
        accessibilityRole="button"
      >
        <Icon name="add" color={colors.onPrimary} size={26} />
        <Text style={styles.fabText}>{t('menu.add')}</Text>
      </Pressable>
    </Screen>
  );
}

function MenuRow({ item, onToggle }: { item: MenuItem; onToggle: (available: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Card
      onPress={() => router.push({ pathname: '/menu-item/[id]', params: { id: item.id } })}
      style={!item.isAvailable && styles.hidden}
    >
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.muted}>
            {rupees(item.pricePaise)} / {item.unit}
            {item.minQty ? ` · ${t('menu.min', { qty: quantity(item.minQty, item.unit) })}` : ''}
          </Text>
        </View>
        <Icon name="pencil" color={colors.muted} />
        <Switch
          value={item.isAvailable}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel={t('item.available')}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingBottom: 120 },
  header: { gap: space.sm, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  share: { backgroundColor: colors.tint, borderColor: colors.tint },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.whatsapp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.label, color: colors.muted },
  name: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  hidden: { opacity: 0.5 },
  fab: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    elevation: 4,
  },
  fabText: { fontSize: font.body, fontWeight: '700', color: colors.onPrimary },
});
