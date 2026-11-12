import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge, Button, Card, Chip, FormError, Icon } from '@/components/ui';
import { longDate, parseISO, phone, quantity, rupees, time12, toISO } from '@/lib/format';
import { type TranslationKey, useI18n } from '@/lib/i18n';
import { useMenuNames } from '@/lib/menu-names';
import { holidayOn, useHolidays } from '@/lib/queries';
import { colors, font, radius, serif, space } from '@/lib/theme';
import { PAYMENT_MODES } from '@/lib/types';
import { type CartLine, lineTotal, type OrderDraft, rupeesToPaise, subtotal, unitPrice } from './cart';
import { AmountSheet } from './sheets';

const NOTE_CHIPS: TranslationKey[] = [
  'chip.lessSpicy',
  'chip.lessOil',
  'chip.noOnionGarlic',
  'chip.extraChutney',
  'chip.separateBoxes',
];
const TIME_SLOTS = ['12:30', '16:30', '19:30'];

type Editing = { kind: 'price'; line: CartLine } | { kind: 'discount' } | null;

// Step 3: everything about the order on one scrolling page, with a fixed Save button.
export function ReviewStep({
  draft,
  update,
  isEdit,
  error,
  saving,
  onSave,
  onChangeCustomer,
  onAddMore,
}: {
  draft: OrderDraft;
  update: (patch: Partial<OrderDraft>) => void;
  isEdit: boolean;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onChangeCustomer: () => void;
  onAddMore: () => void;
}) {
  const { t, locale } = useI18n();
  const { itemName } = useMenuNames();
  const [editing, setEditing] = useState<Editing>(null);
  // Warn, don't block: parents may take an order on a holiday by choice (D18).
  const holiday = holidayOn(useHolidays().data, draft.deliveryDate);

  const itemsTotal = subtotal(draft.lines);
  const total = itemsTotal - draft.discountPaise;
  const advance = rupeesToPaise(draft.advanceRupees);
  const advancePaise = Number.isNaN(advance) ? 0 : advance;
  const customer = draft.customer!;

  const toggleNote = (phrase: string) => {
    const parts = draft.notes
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const next = parts.includes(phrase) ? parts.filter((p) => p !== phrase) : [...parts, phrase];
    update({ notes: next.join(', ') });
  };

  const pickDate = () =>
    DateTimePickerAndroid.open({
      value: parseISO(draft.deliveryDate),
      mode: 'date',
      onChange: (event, date) => {
        if (event.type === 'set' && date) update({ deliveryDate: toISO(date) });
      },
    });

  const pickTime = () => {
    const [h, m] = (draft.deliveryTime ?? '12:00').split(':').map(Number);
    const value = new Date();
    value.setHours(h, m, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: false,
      onChange: (event, date) => {
        if (event.type === 'set' && date) {
          update({
            deliveryTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
          });
        }
      },
    });
  };

  const setLinePrice = (line: CartLine, paise: number) =>
    update({
      lines: draft.lines.map((l) =>
        l.key !== line.key
          ? l
          : l.menuItemId == null
            ? { ...l, menuPricePaise: paise } // custom line: its typed price is the price
            : { ...l, unitPricePaise: paise === l.menuPricePaise ? undefined : paise },
      ),
    });

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Customer */}
        <Card>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.name}>{customer.name}</Text>
              {customer.phone ? <Text style={styles.muted}>{phone(customer.phone)}</Text> : null}
            </View>
            {!isEdit ? <Button label={t('common.change')} variant="secondary" onPress={onChangeCustomer} /> : null}
          </View>
        </Card>

        {/* Items */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('review.items')}</Text>
          <Pressable onPress={onAddMore} hitSlop={8} style={styles.row}>
            <Icon name="add-circle-outline" color={colors.primary} />
            <Text style={styles.link}>{t('review.addMore')}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>{t('review.tapPrice')}</Text>
        <Card>
          {draft.lines.map((line) => {
            const edited = line.unitPricePaise !== undefined;
            return (
              <Pressable
                key={line.key}
                onPress={() => setEditing({ kind: 'price', line })}
                style={({ pressed }) => [styles.line, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.lineName}>
                    {itemName(line)} · {quantity(line.qty, line.unit)}
                  </Text>
                  <View style={styles.rateRow}>
                    {edited ? <Text style={styles.struck}>{rupees(line.menuPricePaise)}</Text> : null}
                    <Text style={[styles.rate, edited && styles.rateEdited]}>
                      {rupees(unitPrice(line))}/{line.unit}
                    </Text>
                    <Icon name="pencil" size={14} color={colors.muted} />
                    {edited ? <Badge label={t('review.edited')} tone="accent" /> : null}
                    {line.menuItemId == null ? <Badge label={t('review.custom')} tone="danger" /> : null}
                  </View>
                </View>
                <Text style={styles.amount}>{rupees(lineTotal(line))}</Text>
              </Pressable>
            );
          })}
        </Card>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.body}>{t('review.subtotal')}</Text>
            <Text style={styles.body}>{rupees(itemsTotal)}</Text>
          </View>
          <Pressable onPress={() => setEditing({ kind: 'discount' })} style={styles.totalRow} hitSlop={6}>
            <Text style={[styles.body, styles.discount]}>
              {draft.discountPaise ? t('review.discount') : `+ ${t('review.addDiscount')}`}{' '}
              <Icon name="pencil" size={14} color={colors.success} />
            </Text>
            {draft.discountPaise ? <Text style={[styles.body, styles.discount]}>− {rupees(draft.discountPaise)}</Text> : null}
          </Pressable>
          <View style={[styles.totalRow, styles.finalRow]}>
            <Text style={styles.finalLabel}>{t('review.total')}</Text>
            <Text style={styles.finalValue}>{rupees(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>{t('review.notes')}</Text>
        <View style={styles.chips}>
          {NOTE_CHIPS.map((key) => {
            const phrase = t(key);
            const on = draft.notes.split(',').map((p) => p.trim()).includes(phrase);
            return <Chip key={key} label={phrase} selected={on} onPress={() => toggleNote(phrase)} />;
          })}
        </View>
        <TextInput
          value={draft.notes}
          onChangeText={(notes) => update({ notes })}
          placeholder={t('review.notesPlaceholder')}
          placeholderTextColor={colors.disabled}
          multiline
          style={styles.notes}
        />

        {/* Delivery */}
        <Text style={styles.sectionTitle}>{t('review.delivery')}</Text>
        <View style={styles.segment}>
          {(['pickup', 'parcel'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => update({ fulfilment: f, address: draft.address || customer.address || '' })}
              style={[styles.segmentItem, draft.fulfilment === f && styles.segmentActive]}
            >
              <Icon
                name={f === 'parcel' ? 'bicycle-outline' : 'storefront-outline'}
                color={draft.fulfilment === f ? colors.onPrimary : colors.text}
              />
              <Text style={[styles.segmentText, draft.fulfilment === f && styles.segmentTextActive]}>
                {t(`fulfilment.${f}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        {/* The customer's address book (D19): one tap fills the address. A new address typed below is
            saved to the book when the order is saved. */}
        {draft.fulfilment === 'parcel' && customer.addresses?.length ? (
          <>
            <Text style={[styles.muted, styles.timeLabel]}>{t('review.savedAddresses')}</Text>
            <View style={styles.chips}>
              {customer.addresses.map((a) => (
                <Chip
                  key={a.id}
                  label={`${t(`address.${a.label}`)}: ${a.address.length > 28 ? `${a.address.slice(0, 28)}…` : a.address}`}
                  icon="location-outline"
                  selected={draft.address.trim() === a.address}
                  onPress={() => update({ address: a.address })}
                />
              ))}
            </View>
          </>
        ) : null}
        {draft.fulfilment === 'parcel' ? (
          <TextInput
            value={draft.address}
            onChangeText={(address) => update({ address })}
            placeholder={t('review.address')}
            placeholderTextColor={colors.disabled}
            multiline
            style={styles.notes}
          />
        ) : null}

        <Pressable onPress={pickDate} style={styles.dateButton}>
          <Icon name="calendar-outline" color={colors.primary} />
          <View style={styles.flex}>
            <Text style={styles.muted}>{t('review.date')}</Text>
            <Text style={styles.dateText}>{longDate(draft.deliveryDate, locale)}</Text>
          </View>
          <Text style={styles.link}>{t('common.change')}</Text>
        </Pressable>
        {holiday ? (
          <Text style={styles.holiday}>
            {t('review.holiday')}
            {holiday.note ? ` · ${holiday.note}` : ''}
          </Text>
        ) : null}

        <Text style={[styles.muted, styles.timeLabel]}>{t('review.time')}</Text>
        <View style={styles.chips}>
          {TIME_SLOTS.map((slot) => (
            <Chip
              key={slot}
              label={time12(slot)}
              selected={draft.deliveryTime === slot}
              onPress={() => update({ deliveryTime: slot })}
            />
          ))}
          <Chip
            label={
              draft.deliveryTime && !TIME_SLOTS.includes(draft.deliveryTime)
                ? time12(draft.deliveryTime)
                : t('review.otherTime')
            }
            icon="time-outline"
            selected={!!draft.deliveryTime && !TIME_SLOTS.includes(draft.deliveryTime)}
            onPress={pickTime}
          />
          <Chip label={t('review.noTime')} selected={!draft.deliveryTime} onPress={() => update({ deliveryTime: null })} />
        </View>

        {/* Advance: only when booking. Later payments are added from the order screen. */}
        {!isEdit ? (
          <>
            <Text style={styles.sectionTitle}>{t('review.advance')}</Text>
            <View style={styles.advanceRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                value={draft.advanceRupees}
                onChangeText={(advanceRupees) => update({ advanceRupees })}
                placeholder={t('review.advanceHint')}
                placeholderTextColor={colors.disabled}
                keyboardType="decimal-pad"
                style={styles.advanceInput}
              />
            </View>
            <View style={styles.chips}>
              {PAYMENT_MODES.map((m) => (
                <Chip
                  key={m}
                  label={t(`mode.${m}`)}
                  selected={draft.advanceMode === m}
                  onPress={() => update({ advanceMode: m })}
                />
              ))}
            </View>
            <View style={[styles.totalRow, styles.balanceRow]}>
              <Text style={styles.body}>{t('review.balance')}</Text>
              <Text style={styles.balance}>{rupees(Math.max(total - advancePaise, 0))}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.bar}>
        <FormError message={error} />
        <Button
          label={t(isEdit ? 'review.update' : 'review.save', { amount: rupees(total) })}
          icon="checkmark-circle-outline"
          onPress={onSave}
          loading={saving}
        />
      </View>

      {editing?.kind === 'price' ? (
        <AmountSheet
          title={itemName(editing.line)}
          label={t('review.unitPrice', { name: itemName(editing.line) })}
          initialPaise={unitPrice(editing.line)}
          onSave={(paise) => setLinePrice(editing.line, paise)}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {editing?.kind === 'discount' ? (
        <AmountSheet
          title={t('review.discount')}
          label={t('review.discountAmount')}
          initialPaise={draft.discountPaise}
          validate={(paise) => (paise > itemsTotal ? t('review.discountTooBig') : null)}
          onSave={(discountPaise) => update({ discountPaise })}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: space.xl, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pressed: { opacity: 0.6 },
  name: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.label, color: colors.muted },
  hint: { fontSize: font.small, color: colors.muted, marginTop: -space.xs },
  body: { fontSize: font.body, color: colors.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  sectionTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text, marginTop: space.md },
  link: { fontSize: font.label, fontWeight: '700', color: colors.primary },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  rateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  rate: { fontSize: font.label, color: colors.muted },
  rateEdited: { color: colors.primary, fontWeight: '700' },
  struck: { fontSize: font.label, color: colors.muted, textDecorationLine: 'line-through' },
  amount: { fontSize: font.body, fontWeight: '800', color: colors.text },
  totals: { backgroundColor: colors.tint, borderRadius: radius.lg, padding: space.md, gap: space.sm, marginTop: space.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  discount: { color: colors.success, fontWeight: '700' },
  finalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  finalLabel: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  finalValue: { fontFamily: serif, fontSize: font.heading, fontWeight: '800', color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  notes: {
    minHeight: 80,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    fontSize: font.body,
    color: colors.text,
    textAlignVertical: 'top',
  },
  segment: { flexDirection: 'row', backgroundColor: colors.tint, borderRadius: radius.md, padding: 4, gap: 4 },
  segmentItem: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: font.body, fontWeight: '700', color: colors.text },
  segmentTextActive: { color: colors.onPrimary },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    minHeight: 64,
  },
  holiday: { color: colors.danger, fontSize: font.label, fontWeight: '700', marginTop: space.xs },
  dateText: { fontSize: font.body, fontWeight: '700', color: colors.text },
  timeLabel: { marginTop: space.sm },
  advanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
  },
  rupee: { fontSize: font.title, fontWeight: '700', color: colors.text },
  advanceInput: { flex: 1, minHeight: 56, fontSize: font.title, color: colors.text, paddingHorizontal: space.sm },
  balanceRow: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md },
  balance: { fontSize: font.title, fontWeight: '800', color: colors.danger },
  bar: { paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
});
