import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Button, Card, EmptyState, ErrorState, Field, FormError, Icon, Sheet, Skeleton } from '@/components/ui';
import { parseISO, shortDate, toISO, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useAddHoliday, useDeleteHoliday, useHolidays } from '@/lib/queries';
import { colors, font, radius, space } from '@/lib/theme';
import type { Holiday } from '@/lib/types';

// Settings → Kitchen holidays (D18). The menu link tells customers; New Order only warns,
// because parents may still take an order for a holiday by choice.
export default function HolidaysScreen() {
  const { t, locale } = useI18n();
  const holidays = useHolidays();
  const remove = useDeleteHoliday();
  const [adding, setAdding] = useState(false);

  const confirmDelete = (h: Holiday) =>
    Alert.alert(t('holidays.deleteConfirm'), range(h, locale), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate(h.id) },
    ]);

  const content = () => {
    if (holidays.isPending) return <Skeleton count={2} />;
    if (holidays.isError) return <ErrorState error={holidays.error} onRetry={() => holidays.refetch()} />;
    return (
      <FlatList
        data={holidays.data}
        keyExtractor={(h) => String(h.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.hint}>{t('holidays.hint')}</Text>}
        ListEmptyComponent={<EmptyState icon="sunny-outline" title={t('holidays.none')} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Icon name="calendar-outline" color={colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.dates}>{range(item, locale)}</Text>
                {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
              </View>
              <Pressable
                onPress={() => confirmDelete(item)}
                style={styles.delete}
                accessibilityLabel={t('common.delete')}
                hitSlop={8}
              >
                <Icon name="trash-outline" color={colors.danger} />
              </Pressable>
            </View>
          </Card>
        )}
      />
    );
  };

  return (
    <Screen title={t('settings.holidays')} back>
      {content()}
      <Button label={t('holidays.add')} icon="add" onPress={() => setAdding(true)} style={styles.add} />
      <AddHolidaySheet visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function AddHolidaySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const add = useAddHoliday();
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [note, setNote] = useState('');

  // Picking a later start moves the end with it, so the range can't end before it starts.
  const pick = (which: 'start' | 'end') =>
    DateTimePickerAndroid.open({
      value: parseISO(which === 'start' ? startDate : endDate),
      mode: 'date',
      minimumDate: parseISO(which === 'start' ? todayISO() : startDate),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        const iso = toISO(date);
        if (which === 'start') {
          setStartDate(iso);
          if (endDate < iso) setEndDate(iso);
        } else {
          setEndDate(iso);
        }
      },
    });

  const save = () =>
    add.mutate(
      { startDate, endDate, note: note.trim() || null },
      {
        onSuccess: () => {
          setNote('');
          onClose();
        },
      },
    );

  return (
    <Sheet visible={visible} title={t('holidays.add')} onClose={onClose}>
      <View style={styles.dateRow}>
        <DateButton label={t('holidays.from')} value={shortDate(startDate, locale)} onPress={() => pick('start')} />
        <DateButton label={t('holidays.to')} value={shortDate(endDate, locale)} onPress={() => pick('end')} />
      </View>
      <Field label={t('holidays.note')} value={note} onChangeText={setNote} maxLength={80} />
      <FormError message={add.isError ? t('common.error') : null} />
      <Button label={t('common.save')} onPress={save} loading={add.isPending} />
    </Sheet>
  );
}

function DateButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.dateButton} accessibilityRole="button">
      <Text style={styles.note}>{label}</Text>
      <Text style={styles.dates}>{value}</Text>
    </Pressable>
  );
}

const range = (h: Holiday, locale: string) =>
  h.startDate === h.endDate
    ? shortDate(h.startDate, locale)
    : `${shortDate(h.startDate, locale)} – ${shortDate(h.endDate, locale)}`;

const styles = StyleSheet.create({
  list: { gap: space.sm, paddingBottom: 96 },
  hint: { fontSize: font.label, color: colors.muted, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  dates: { fontSize: font.body, fontWeight: '700', color: colors.text },
  note: { fontSize: font.label, color: colors.muted },
  delete: { padding: space.sm },
  add: { position: 'absolute', left: space.md, right: space.md, bottom: space.md },
  dateRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  dateButton: {
    flex: 1,
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
