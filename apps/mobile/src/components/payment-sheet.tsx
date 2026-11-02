import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ApiError } from '@/lib/api';
import { longDate, parseISO, rupees, toISO, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useAddPayment } from '@/lib/queries';
import { colors, font, radius, space } from '@/lib/theme';
import { PAYMENT_MODES, type PaymentMode } from '@/lib/types';
import { rupeesToPaise } from './order-form/cart';
import { Button, Chip, FormError, Icon, type IconName, Sheet } from './ui';

export const MODE_ICON: Record<PaymentMode, IconName> = {
  cash: 'cash-outline',
  upi_papa: 'phone-portrait-outline',
  upi_mummy: 'wallet-outline',
};

export interface PaymentTarget {
  orderId: number;
  customerName: string;
  totalPaise: number;
  paidPaise: number;
  balancePaise: number; // negative when a refund is owed
}

// Record a payment or a refund against an order (D9, D12). Used from order detail and Dues.
// Mounted only while open, so it always starts from the current balance.
export function PaymentSheet({ target, onClose }: { target: PaymentTarget; onClose: () => void }) {
  const { t, locale } = useI18n();
  const owedBack = target.balancePaise < 0;
  const [refund, setRefund] = useState(owedBack);
  const [amount, setAmount] = useState(target.balancePaise !== 0 ? String(Math.abs(target.balancePaise) / 100) : '');
  const [mode, setMode] = useState<PaymentMode | null>(null);
  const [paidOn, setPaidOn] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const addPayment = useAddPayment();

  const pickDate = () =>
    DateTimePickerAndroid.open({
      value: parseISO(paidOn),
      mode: 'date',
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type === 'set' && date) setPaidOn(toISO(date));
      },
    });

  const paise = rupeesToPaise(amount);

  const save = async () => {
    if (Number.isNaN(paise) || paise <= 0) return setError(t('pay.invalid'));
    if (!mode) return setError(t('pay.chooseMode'));
    try {
      await addPayment.mutateAsync({
        orderId: target.orderId,
        amountPaise: refund ? -paise : paise,
        mode,
        paidOn,
      });
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 0 ? t('common.noInternet') : t('common.error'));
    }
  };

  return (
    <Sheet visible title={t('pay.title')} onClose={onClose}>
      <View style={styles.summary}>
        <Text style={styles.customer}>
          {target.customerName} · #{target.orderId}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.muted}>{t('pay.total')}</Text>
            <Text style={styles.value}>{rupees(target.totalPaise)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.muted}>{t('pay.paid')}</Text>
            <Text style={[styles.value, styles.success]}>{rupees(target.paidPaise)}</Text>
          </View>
        </View>
        <View style={styles.outstanding}>
          <Text style={styles.outstandingLabel}>{t(owedBack ? 'pay.refundOwed' : 'pay.outstanding')}</Text>
          <Text style={styles.outstandingValue}>{rupees(Math.abs(target.balancePaise))}</Text>
        </View>
      </View>

      <Text style={styles.label}>{t('pay.amount')}</Text>
      <View style={styles.amountBox}>
        <Text style={styles.rupee}>₹</Text>
        <TextInputAmount value={amount} onChange={setAmount} />
      </View>
      {target.balancePaise > 0 ? (
        <View style={styles.chipRow}>
          <Chip
            label={t('pay.fullDue', { amount: rupees(target.balancePaise) })}
            icon="checkmark-circle-outline"
            selected={paise === target.balancePaise}
            onPress={() => setAmount(String(target.balancePaise / 100))}
          />
        </View>
      ) : null}

      <Text style={styles.label}>{t('pay.mode')}</Text>
      <View style={styles.modes}>
        {PAYMENT_MODES.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.mode, mode === m && styles.modeActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
          >
            <Icon name={MODE_ICON[m]} size={26} color={mode === m ? colors.onPrimary : colors.text} />
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{t(`mode.${m}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={pickDate} style={styles.row}>
        <Icon name="calendar-outline" color={colors.primary} />
        <View style={styles.flex}>
          <Text style={styles.muted}>{t('pay.date')}</Text>
          <Text style={styles.value}>{longDate(paidOn, locale)}</Text>
        </View>
        <Text style={styles.link}>{t('common.change')}</Text>
      </Pressable>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.value}>{t('pay.refund')}</Text>
          <Text style={styles.muted}>{t('pay.refundHint')}</Text>
        </View>
        <Switch
          value={refund}
          onValueChange={setRefund}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
        />
      </View>

      <FormError message={error} />
      <Button
        label={t(refund ? 'pay.saveRefund' : 'pay.save', { amount: rupees(Number.isNaN(paise) ? 0 : paise) })}
        icon="checkmark-circle-outline"
        onPress={save}
        loading={addPayment.isPending}
      />
    </Sheet>
  );
}

// Big numeric input for the amount, styled like the design's "₹ 950" box.
function TextInputAmount({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      selectTextOnFocus
      style={styles.amountInput}
      accessibilityLabel="Amount"
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  customer: { fontSize: font.body, fontWeight: '700', color: colors.text },
  summaryRow: { flexDirection: 'row', gap: space.sm },
  summaryCell: { flex: 1, backgroundColor: colors.tint, borderRadius: radius.md, padding: space.sm },
  muted: { fontSize: font.small, color: colors.muted },
  value: { fontSize: font.body, fontWeight: '700', color: colors.text },
  success: { color: colors.success },
  outstanding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: space.md,
  },
  outstandingLabel: { fontSize: font.label, fontWeight: '700', color: colors.text },
  outstandingValue: { fontSize: font.title, fontWeight: '800', color: colors.danger },
  label: { fontSize: font.label, fontWeight: '700', color: colors.text, marginTop: space.lg, marginBottom: space.sm },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
  },
  rupee: { fontSize: font.huge, fontWeight: '700', color: colors.text },
  amountInput: { flex: 1, minHeight: 64, fontSize: font.huge, fontWeight: '700', color: colors.text, paddingLeft: space.sm },
  chipRow: { flexDirection: 'row', marginTop: space.sm },
  modes: { flexDirection: 'row', gap: space.sm },
  mode: {
    flex: 1,
    minHeight: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: space.xs,
  },
  modeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeText: { fontSize: font.label, fontWeight: '700', color: colors.text, textAlign: 'center' },
  modeTextActive: { color: colors.onPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
    minHeight: 64,
  },
  link: { fontSize: font.label, fontWeight: '700', color: colors.primary },
});
