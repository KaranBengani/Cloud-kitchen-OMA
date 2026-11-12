import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { rupeesToPaise } from '@/components/order-form/cart';
import { Screen } from '@/components/screen';
import { Button, Chip, ErrorState, Field, FormError, Skeleton, Stepper } from '@/components/ui';
import { quantity, stepFor } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useDeleteMenuItem, useMenu, useSaveMenuItem } from '@/lib/queries';
import { colors, font, radius, space } from '@/lib/theme';
import { MENU_UNITS, type MenuItem, type MenuUnit } from '@/lib/types';

// /menu-item/new to add, /menu-item/12 to edit. Full screen with a fixed Save button.
export default function MenuItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const menu = useMenu();
  const isNew = id === 'new';
  const title = t(isNew ? 'item.add' : 'item.edit');

  if (menu.isPending) {
    return (
      <Screen title={title} back>
        <Skeleton count={1} />
      </Screen>
    );
  }
  if (menu.isError) {
    return (
      <Screen title={title} back>
        <ErrorState error={menu.error} onRetry={() => menu.refetch()} />
      </Screen>
    );
  }

  const item = isNew ? null : (menu.data.find((m) => m.id === Number(id)) ?? null);
  const categories = [...new Set(menu.data.map((m) => m.category))];
  return (
    <Screen title={title} back>
      <ItemForm item={item} categories={categories} />
    </Screen>
  );
}

function ItemForm({ item, categories }: { item: MenuItem | null; categories: string[] }) {
  const { t } = useI18n();
  const save = useSaveMenuItem();
  const remove = useDeleteMenuItem();
  const [name, setName] = useState(item?.name ?? '');
  const [nameHi, setNameHi] = useState(item?.nameHi ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [addingCategory, setAddingCategory] = useState(false);
  const [unit, setUnit] = useState<MenuUnit>(item?.unit ?? 'kg');
  const [price, setPrice] = useState(item ? String(item.pricePaise / 100) : '');
  const [minQty, setMinQty] = useState<number | null>(item?.minQty ?? null);
  const [description, setDescription] = useState(item?.description ?? '');
  const [available, setAvailable] = useState(item?.isAvailable ?? true);
  const [error, setError] = useState<string | null>(null);

  const step = stepFor(unit);

  const submit = async () => {
    const pricePaise = rupeesToPaise(price);
    if (!name.trim() || !category.trim() || Number.isNaN(pricePaise) || pricePaise < 0) {
      return setError(t('item.required'));
    }
    try {
      await save.mutateAsync({
        id: item?.id,
        name: name.trim(),
        nameHi: nameHi.trim() || null,
        category: category.trim(),
        unit,
        pricePaise,
        minQty,
        description: description.trim() || null,
        isAvailable: available,
      });
      router.back();
    } catch {
      setError(t('common.error'));
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('item.deleteConfirm', { name: item!.name }), undefined, [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync(item!.id);
          router.back();
        },
      },
    ]);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label={t('item.name')} value={name} onChangeText={setName} />
        <Field label={t('item.nameHi')} value={nameHi} onChangeText={setNameHi} placeholder="जैसे: दही वड़ा" />

        <Text style={styles.label}>{t('item.category')}</Text>
        <View style={styles.wrap}>
          {categories.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={!addingCategory && category === c}
              onPress={() => {
                setAddingCategory(false);
                setCategory(c);
              }}
            />
          ))}
          <Chip
            label={`+ ${t('item.newCategory')}`}
            selected={addingCategory}
            onPress={() => {
              setAddingCategory(true);
              setCategory('');
            }}
          />
        </View>
        {addingCategory ? (
          <Field label={t('item.newCategoryName')} value={category} onChangeText={setCategory} autoFocus />
        ) : null}

        <Text style={styles.label}>{t('item.unit')}</Text>
        <View style={styles.units}>
          {MENU_UNITS.map((u) => (
            <Pressable
              key={u}
              onPress={() => {
                setUnit(u);
                setMinQty(null);
              }}
              style={[styles.unit, unit === u && styles.unitActive]}
            >
              <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
            </Pressable>
          ))}
        </View>

        <Field label={t('item.price')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />

        <Text style={styles.label}>{t('item.minQty')}</Text>
        <View style={styles.minRow}>
          <Stepper
            label={minQty ? quantity(minQty, unit) : t('item.noMin')}
            onMinus={() => setMinQty((q) => (q && q - step > 0 ? +(q - step).toFixed(3) : null))}
            onPlus={() => setMinQty((q) => +((q ?? 0) + step).toFixed(3))}
          />
        </View>
        <Text style={styles.hint}>{t('item.minHint')}</Text>

        <Field
          label={t('item.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('item.descriptionPlaceholder')}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.label, styles.flex]}>{t('item.available')}</Text>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ true: colors.success, false: colors.border }}
            thumbColor={colors.surface}
          />
        </View>

        {item ? (
          <Button label={t('item.delete')} icon="trash-outline" variant="danger" onPress={confirmDelete} />
        ) : null}
      </ScrollView>
      <View style={styles.bar}>
        <FormError message={error} />
        <Button label={t('common.save')} icon="checkmark-circle-outline" onPress={submit} loading={save.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: space.xl, gap: space.xs },
  label: { fontSize: font.label, fontWeight: '600', color: colors.text, marginBottom: space.sm, marginTop: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  unit: {
    width: '31%',
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitActive: { backgroundColor: colors.primary },
  unitText: { fontSize: font.body, fontWeight: '700', color: colors.text },
  unitTextActive: { color: colors.onPrimary },
  minRow: { flexDirection: 'row' },
  hint: { fontSize: font.small, color: colors.muted, marginTop: space.xs, marginBottom: space.md },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 64,
    marginBottom: space.lg,
  },
  bar: { paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
});
