import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { quantity, rupees, time12 } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useMenuNames } from '@/lib/menu-names';
import { colors, font, radius, serif, space } from '@/lib/theme';
import type { Order } from '@/lib/types';
import { Card, Icon, StatusBadge } from './ui';

// "Khandvi 1 kg, Dal Kachori 20 pc, Thali 2 plate"
export function itemSummary(order: Pick<Order, 'items'>, itemName: (i: Order['items'][number]) => string): string {
  return order.items.map((i) => `${itemName(i)} ${quantity(i.qty, i.unit)}`).join(', ');
}

// The tall order card from the approved design (docs/design/v2/Orders_ Upcoming List.png),
// shared by the upcoming list and the month calendar.
export function OrderCard({ order }: { order: Order }) {
  const { t } = useI18n();
  const { itemName } = useMenuNames();
  const cancelled = order.status === 'cancelled';

  return (
    <Card
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
      style={[styles.card, cancelled && styles.cancelled]}
    >
      <View style={styles.top}>
        <Text style={[styles.number, cancelled && styles.struck]}>#{order.id}</Text>
        {order.deliveryTime ? <Text style={styles.time}>· {time12(order.deliveryTime)}</Text> : null}
        <View style={styles.spacer} />
        <StatusBadge status={order.status} />
      </View>

      <View style={styles.customer}>
        <View style={styles.row}>
          <Icon name="person-outline" size={20} color={colors.primary} />
          <Text style={[styles.name, cancelled && styles.struck]} numberOfLines={1}>
            {order.customer.name}
          </Text>
        </View>
        <View style={styles.row}>
          <Icon
            name={order.fulfilment === 'parcel' ? 'bicycle-outline' : 'storefront-outline'}
            size={20}
            color={colors.muted}
          />
          <Text style={styles.address} numberOfLines={2}>
            {order.fulfilment === 'parcel' ? (order.address ?? t('fulfilment.parcel')) : t('orders.pickupCounter')}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>{t('orders.items').toUpperCase()}</Text>
      <Text style={styles.items} numberOfLines={3}>
        {itemSummary(order, itemName)}
      </Text>

      <View style={styles.footer}>
        <Text style={[styles.total, cancelled && styles.struck]}>
          {t('orders.total')} {rupees(order.totalPaise)}
        </Text>
        <PaymentStatus order={order} />
      </View>
    </Card>
  );
}

function PaymentStatus({ order }: { order: Order }) {
  const { t } = useI18n();
  if (order.status === 'cancelled') {
    return order.paidPaise > 0 ? (
      <Text style={[styles.pay, styles.danger]}>{t('orders.refundDue', { amount: rupees(order.paidPaise) })}</Text>
    ) : null;
  }
  if (order.balancePaise <= 0) {
    return (
      <View style={styles.row}>
        <Icon name="checkmark-circle" size={18} color={colors.success} />
        <Text style={[styles.pay, styles.success]}>{t('orders.paidFull')}</Text>
      </View>
    );
  }
  return (
    <View style={styles.payBlock}>
      <Text style={[styles.pay, styles.danger]}>{t('orders.balanceDue', { amount: rupees(order.balancePaise) })}</Text>
      {order.paidPaise > 0 ? (
        <Text style={styles.advance}>
          {t('orders.advance')} {rupees(order.paidPaise)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  cancelled: { opacity: 0.55 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  number: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  time: { fontSize: font.label, color: colors.muted },
  spacer: { flex: 1 },
  customer: { backgroundColor: colors.tint, borderRadius: radius.md, padding: space.md, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flex: 1, fontSize: font.title, fontWeight: '700', color: colors.text },
  address: { flex: 1, fontSize: font.label, color: colors.muted },
  label: { fontSize: 13, letterSpacing: 1, color: colors.muted, marginTop: space.xs },
  items: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.sm,
    marginTop: space.xs,
  },
  total: { fontSize: font.body, fontWeight: '700', color: colors.text },
  struck: { textDecorationLine: 'line-through' },
  payBlock: { alignItems: 'flex-end', flexShrink: 1 },
  pay: { fontSize: font.label, fontWeight: '700', textAlign: 'right' },
  advance: { fontSize: font.small, color: colors.muted },
  danger: { color: colors.danger },
  success: { color: colors.success },
});
