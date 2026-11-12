import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, ChipRow, EmptyState, ErrorState, Icon, SearchBox, Skeleton, Stepper } from '@/components/ui';
import { quantity, rupees, stepFor } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useMenuNames } from '@/lib/menu-names';
import { useMenu } from '@/lib/queries';
import { colors, font, radius, serif, space } from '@/lib/theme';
import type { MenuItem } from '@/lib/types';
import { type CartLine, lineFromMenu, lineTotal, subtotal } from './cart';
import { CustomItemSheet } from './sheets';

const KG_PRESETS = [0.25, 0.5, 1, 2];

// Step 2. Items not in the order are one compact row with "+ Add"; added items expand to show
// the quantity controls. Keeps a 58-item menu scannable.
export function ItemsStep({
  lines,
  onChange,
  onNext,
}: {
  lines: CartLine[];
  onChange: (lines: CartLine[]) => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const { itemName, categoryName } = useMenuNames();
  const menu = useMenu();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  if (menu.isPending) return <Skeleton />;
  if (menu.isError) return <ErrorState error={menu.error} onRetry={() => menu.refetch()} />;

  const inCart = new Map(lines.map((l) => [l.key, l]));
  const categories = [...new Set(menu.data.map((m) => m.category))];
  const q = query.trim().toLowerCase();
  // Hidden (unavailable) items stay visible only if they're already on this order.
  const visible = menu.data.filter(
    (m) =>
      (m.isAvailable || inCart.has(`menu-${m.id}`)) &&
      (!category || m.category === category) &&
      (!q || `${m.name} ${m.nameHi ?? ''}`.toLowerCase().includes(q)),
  );
  const customLines = lines.filter((l) => l.menuItemId == null);

  const setQty = (line: CartLine, qty: number) =>
    onChange(qty > 0 ? lines.map((l) => (l.key === line.key ? { ...l, qty } : l)) : lines.filter((l) => l.key !== line.key));
  const add = (item: MenuItem) => onChange([...lines, lineFromMenu(item, Math.max(item.minQty ?? 0, stepFor(item.unit)))]);

  const total = subtotal(lines);

  return (
    <View style={styles.flex}>
      <FlatList
        data={visible}
        keyExtractor={(m) => String(m.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchBox value={query} onChangeText={setQuery} placeholder={t('items.search')} />
            <ChipRow>
              <Chip label={t('items.all')} selected={!category} onPress={() => setCategory(null)} />
              {categories.map((c) => (
                <Chip key={c} label={categoryName(c)} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </ChipRow>
            <Card onPress={() => setCustomOpen(true)} style={styles.customCard}>
              <View style={styles.row}>
                <Icon name="add-circle-outline" color={colors.primary} size={28} />
                <View style={styles.flex}>
                  <Text style={styles.customTitle}>+ {t('items.custom')}</Text>
                  <Text style={styles.muted}>{t('items.customHint')}</Text>
                </View>
                <Icon name="chevron-forward" color={colors.muted} />
              </View>
            </Card>
            {customLines.map((line) => (
              <ItemCard key={line.key} line={line} onQty={(qty) => setQty(line, qty)} custom />
            ))}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={t('items.noneFound')}
            hint={t('items.noneFoundHint')}
            action={
              <View style={styles.emptyActions}>
                <Button label={t('items.custom')} icon="add" onPress={() => setCustomOpen(true)} />
                <Button label={t('items.clearSearch')} variant="ghost" onPress={() => setQuery('')} />
              </View>
            }
          />
        }
        renderItem={({ item }) => {
          const line = inCart.get(`menu-${item.id}`);
          return line ? (
            <ItemCard line={line} onQty={(qty) => setQty(line, qty)} />
          ) : (
            <Card>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.name}>{itemName(item)}</Text>
                  {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
                  <Text style={styles.price}>
                    {rupees(item.pricePaise)} / {item.unit}
                  </Text>
                </View>
                <Pressable onPress={() => add(item)} style={styles.addButton} accessibilityRole="button">
                  <Text style={styles.addText}>+ {t('items.add')}</Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />

      <View style={styles.bar}>
        <View style={styles.flex}>
          <Text style={styles.muted}>
            {lines.length === 1 ? t('items.countOne') : t('items.count', { n: lines.length })}
          </Text>
          <Text style={styles.total}>{rupees(total)}</Text>
        </View>
        <Button label={t('items.next')} icon="arrow-forward" onPress={onNext} disabled={lines.length === 0} />
      </View>

      {customOpen ? (
        <CustomItemSheet
          initialName={visible.length === 0 ? query.trim() : undefined}
          onAdd={(line) => {
            onChange([...lines, line]);
            setQuery('');
          }}
          onClose={() => setCustomOpen(false)}
        />
      ) : null}
    </View>
  );
}

// An item that's on the order: kg presets, stepper, line total and the soft minimum warning.
function ItemCard({ line, onQty, custom }: { line: CartLine; onQty: (qty: number) => void; custom?: boolean }) {
  const { t } = useI18n();
  const { itemName } = useMenuNames();
  const step = stepFor(line.unit);
  const belowMin = line.minQty != null && line.qty < line.minQty;

  return (
    <Card style={styles.added}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.name}>
            <Text style={styles.dot}>● </Text>
            {itemName(line)}
          </Text>
          {line.description ? <Text style={styles.muted}>{line.description}</Text> : null}
          <Text style={styles.price}>
            {rupees(line.unitPricePaise ?? line.menuPricePaise)} / {line.unit}
            {custom ? ` · ${t('review.custom')}` : ''}
          </Text>
        </View>
        <Text style={styles.lineTotal}>{rupees(lineTotal(line))}</Text>
      </View>

      {line.unit === 'kg' ? (
        <View style={styles.presets}>
          {KG_PRESETS.map((kg) => (
            <Chip key={kg} label={quantity(kg, 'kg')} selected={line.qty === kg} onPress={() => onQty(kg)} />
          ))}
        </View>
      ) : null}

      {belowMin ? (
        <View style={styles.warning}>
          <Icon name="warning-outline" size={18} color={colors.text} />
          <Text style={styles.warningText}>{t('items.min', { qty: quantity(line.minQty!, line.unit) })}</Text>
        </View>
      ) : null}

      <View style={styles.stepRow}>
        <Pressable onPress={() => onQty(0)} hitSlop={8} accessibilityRole="button">
          <Text style={styles.remove}>{t('items.remove')}</Text>
        </Pressable>
        <Stepper
          label={quantity(line.qty, line.unit)}
          onMinus={() => onQty(Math.max(0, +(line.qty - step).toFixed(3)))}
          onPlus={() => onQty(+(line.qty + step).toFixed(3))}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingBottom: space.xl },
  header: { gap: space.sm, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  customCard: { backgroundColor: colors.tint, borderColor: colors.tint },
  customTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  name: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  dot: { color: colors.primary, fontSize: font.label },
  muted: { fontSize: font.label, color: colors.muted },
  price: { fontSize: font.label, fontWeight: '700', color: colors.primary, marginTop: 2 },
  addButton: {
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
    justifyContent: 'center',
  },
  addText: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  added: { borderColor: colors.accent, borderWidth: 2 },
  lineTotal: { fontSize: font.title, fontWeight: '800', color: colors.primary },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    padding: space.sm,
  },
  warningText: { fontSize: font.label, color: colors.text, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remove: { fontSize: font.label, color: colors.danger, fontWeight: '600' },
  emptyActions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  total: { fontFamily: serif, fontSize: font.heading, fontWeight: '700', color: colors.text },
});
