import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODE_ICON, PaymentSheet } from '@/components/payment-sheet';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, ErrorState, Icon, Skeleton, StatusBadge } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { confirmationText, whatsappUrl } from '@/lib/bill';
import { longDate, phone, quantity, rupees, shortDate, time12 } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useDeletePayment, useOrder, useSetOrderStatus } from '@/lib/queries';
import { colors, font, radius, serif, space } from '@/lib/theme';
import type { Order, OrderStatus, Payment } from '@/lib/types';

// What the big button does next: Booked → Ready → Delivered.
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: 'order.markReady' | 'order.markDelivered' }>> = {
  booked: { status: 'ready', label: 'order.markReady' },
  ready: { status: 'delivered', label: 'order.markDelivered' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const order = useOrder(Number(id));

  return (
    <Screen
      title={t('order.title', { id })}
      back
      right={order.data ? <StatusBadge status={order.data.status} /> : null}
    >
      {order.isPending ? <Skeleton count={2} /> : null}
      {order.isError ? <ErrorState error={order.error} onRetry={() => order.refetch()} /> : null}
      {order.data ? <OrderDetail order={order.data} onReload={() => order.refetch()} /> : null}
    </Screen>
  );
}

function OrderDetail({ order, onReload }: { order: Order; onReload: () => void }) {
  const { t, locale } = useI18n();
  const setStatus = useSetOrderStatus();
  const deletePayment = useDeletePayment();
  const [conflict, setConflict] = useState(false);
  const [paying, setPaying] = useState(false);
  const next = NEXT[order.status];

  // Opens the customer's WhatsApp chat with the confirmation typed in; the parent just taps send.
  const sendConfirmation = (accepted: Order) =>
    Linking.openURL(whatsappUrl(confirmationText(accepted), accepted.customer.phone));

  const changeStatus = async (status: OrderStatus) => {
    try {
      const saved = await setStatus.mutateAsync({ id: order.id, status, version: order.version });
      // Web customers are waiting to hear back, so accepting offers the confirmation message straight away.
      if (order.status === 'requested' && status === 'booked' && saved.customer.phone) {
        Alert.alert(t('order.acceptedSend', { name: saved.customer.name }), undefined, [
          { text: t('order.later'), style: 'cancel' },
          { text: t('order.sendConfirmation'), onPress: () => sendConfirmation(saved) },
        ]);
      }
    } catch (e) {
      // 409: another phone changed this order since we loaded it (D6). Show the banner instead of guessing.
      if (e instanceof ApiError && e.status === 409) setConflict(true);
      else Alert.alert(t(e instanceof ApiError && e.status === 0 ? 'common.noInternet' : 'common.error'));
    }
  };

  const decline = () =>
    Alert.alert(t('order.declineConfirm', { id: order.id }), undefined, [
      { text: t('common.no'), style: 'cancel' },
      { text: t('order.decline'), style: 'destructive', onPress: () => changeStatus('declined') },
    ]);

  // Requests are declined, not cancelled; a declined request is final (D19).
  const more = () =>
    Alert.alert(t('order.title', { id: order.id }), undefined, [
      order.status === 'requested'
        ? { text: t('order.decline'), style: 'destructive', onPress: decline }
        : order.status === 'declined'
          ? { text: t('common.cancel'), style: 'cancel' }
          : order.status === 'cancelled'
            ? { text: t('order.reopen'), onPress: () => changeStatus('booked') }
            : {
                text: t('order.cancel'),
                style: 'destructive',
                onPress: () =>
                  Alert.alert(t('order.cancelConfirm', { id: order.id }), undefined, [
                    { text: t('common.no'), style: 'cancel' },
                    { text: t('common.yes'), style: 'destructive', onPress: () => changeStatus('cancelled') },
                  ]),
              },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const removePayment = (payment: Payment) =>
    Alert.alert(t('order.deletePayment', { amount: rupees(payment.amountPaise) }), undefined, [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deletePayment.mutate({ orderId: order.id, paymentId: payment.id }),
      },
    ]);

  const customerPhone = order.customer.phone;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {conflict ? (
          <View style={styles.conflict}>
            <Icon name="sync-outline" color={colors.danger} />
            <Text style={styles.conflictText}>{t('order.conflict')}</Text>
            <Button
              label={t('order.reload')}
              icon="refresh"
              onPress={() => {
                setConflict(false);
                onReload();
              }}
              style={styles.reload}
            />
          </View>
        ) : null}

        <Card style={styles.tinted}>
          <View style={styles.row}>
            <Icon name="calendar-outline" color={colors.primary} />
            <Text style={styles.strong}>
              {longDate(order.deliveryDate, locale)}
              {order.deliveryTime ? ` · ${time12(order.deliveryTime)}` : ''}
            </Text>
          </View>
          <Badge
            label={t(`fulfilment.${order.fulfilment}`)}
            icon={order.fulfilment === 'parcel' ? 'bicycle-outline' : 'storefront-outline'}
            tone="danger"
          />
          {order.fulfilment === 'parcel' && order.address ? (
            <View style={styles.row}>
              <Icon name="location-outline" color={colors.muted} />
              <Text style={[styles.body, styles.flex]}>{order.address}</Text>
            </View>
          ) : null}
        </Card>

        {order.status === 'requested' ? (
          <View style={styles.request}>
            <Text style={styles.requestTitle}>{t('order.webRequest')}</Text>
            <Text style={styles.body}>{t('order.webRequestHint')}</Text>
            {order.requestedName ? (
              <Text style={styles.strong}>{t('order.typedName', { name: order.requestedName })}</Text>
            ) : null}
            <View style={styles.row}>
              <Button
                label={t('order.decline')}
                variant="danger"
                onPress={decline}
                disabled={setStatus.isPending}
                style={styles.flex}
              />
              <Button
                label={t('order.accept')}
                icon="checkmark-circle-outline"
                onPress={() => changeStatus('booked')}
                loading={setStatus.isPending}
                style={styles.flex}
              />
            </View>
          </View>
        ) : null}

        {next ? (
          <Button
            label={t(next.label)}
            icon="checkmark-circle-outline"
            onPress={() => changeStatus(next.status)}
            loading={setStatus.isPending}
          />
        ) : null}

        {/* Also here, for when "Later" was tapped after accepting. */}
        {order.source === 'web' && order.status === 'booked' && customerPhone ? (
          <Button
            label={t('order.sendConfirmation')}
            icon="logo-whatsapp"
            variant="whatsapp"
            onPress={() => sendConfirmation(order)}
          />
        ) : null}

        <Card>
          <Text style={styles.name}>{order.customer.name}</Text>
          {customerPhone ? <Text style={styles.muted}>{phone(customerPhone)}</Text> : null}
          {customerPhone ? (
            <View style={styles.row}>
              <Button
                label={t('order.call')}
                icon="call-outline"
                variant="secondary"
                onPress={() => Linking.openURL(`tel:+${customerPhone}`)}
                style={styles.flex}
              />
              <Button
                label={t('order.whatsapp')}
                icon="logo-whatsapp"
                variant="whatsapp"
                onPress={() => Linking.openURL(whatsappUrl('', customerPhone))}
                style={styles.flex}
              />
            </View>
          ) : null}
        </Card>

        {order.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>! {t('order.notes')}</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>{t('order.items')}</Text>
          {order.items.map((item) => {
            const edited = item.unitPricePaise !== item.menuPricePaise;
            return (
              <View key={item.id} style={styles.line}>
                <View style={styles.flex}>
                  <Text style={styles.strong}>
                    {item.name} · {quantity(item.qty, item.unit)}
                  </Text>
                  <View style={styles.rateRow}>
                    {edited ? <Text style={styles.struck}>{rupees(item.menuPricePaise)}</Text> : null}
                    <Text style={styles.muted}>
                      {rupees(item.unitPricePaise)}/{item.unit}
                    </Text>
                    {edited ? <Badge label={t('review.edited')} tone="accent" /> : null}
                    {item.menuItemId == null ? <Badge label={t('review.custom')} tone="danger" /> : null}
                  </View>
                </View>
                <Text style={styles.strong}>{rupees(item.lineTotalPaise)}</Text>
              </View>
            );
          })}
          <View style={styles.totals}>
            {order.discountPaise > 0 ? (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.body}>{t('review.subtotal')}</Text>
                  <Text style={styles.body}>{rupees(order.subtotalPaise)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.body, styles.discount]}>{t('review.discount')}</Text>
                  <Text style={[styles.body, styles.discount]}>− {rupees(order.discountPaise)}</Text>
                </View>
              </>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('order.total')}</Text>
              <Text style={styles.totalValue}>{rupees(order.totalPaise)}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>{t('order.payments')}</Text>
          {order.payments.length === 0 ? <Text style={styles.muted}>{t('order.noPayments')}</Text> : null}
          {order.payments.map((p) => (
            <Pressable key={p.id} onLongPress={() => removePayment(p)} style={styles.payment}>
              <Icon name={p.amountPaise < 0 ? 'arrow-undo-outline' : MODE_ICON[p.mode]} color={colors.muted} />
              <View style={styles.flex}>
                <Text style={styles.strong}>
                  {t(`mode.${p.mode}`)}
                  {p.amountPaise < 0 ? ` · ${t('order.refund')}` : ''}
                </Text>
                <Text style={styles.muted}>{shortDate(p.paidOn, locale)}</Text>
              </View>
              <Text style={[styles.strong, p.amountPaise < 0 ? styles.negative : styles.positive]}>
                {p.amountPaise < 0 ? '− ' : ''}
                {rupees(Math.abs(p.amountPaise))}
              </Text>
            </Pressable>
          ))}
          <View style={[styles.balance, order.balancePaise <= 0 && styles.balanceClear]}>
            <Text style={styles.muted}>{t('order.paid', { amount: rupees(order.paidPaise) })}</Text>
            <Text style={[styles.balanceText, order.balancePaise <= 0 && styles.positive]}>
              {order.status === 'cancelled'
                ? order.paidPaise > 0
                  ? t('orders.refundDue', { amount: rupees(order.paidPaise) })
                  : t('status.cancelled')
                : order.balancePaise > 0
                  ? t('orders.balanceDue', { amount: rupees(order.balancePaise) })
                  : t('orders.paidFull')}
            </Text>
          </View>
          <Button label={`+ ${t('order.addPayment')}`} variant="secondary" onPress={() => setPaying(true)} />
        </Card>
      </ScrollView>

      <View style={styles.bar}>
        <Button
          label={t('order.sendBill')}
          icon="receipt-outline"
          variant="whatsapp"
          onPress={() => router.push({ pathname: '/order/[id]/bill', params: { id: order.id } })}
          style={styles.flex}
        />
        <Button
          label={t('order.edit')}
          icon="pencil"
          variant="secondary"
          onPress={() => router.push({ pathname: '/order/form', params: { id: order.id } })}
        />
        <Pressable onPress={more} style={styles.more} accessibilityLabel="More">
          <Icon name="ellipsis-horizontal" size={26} />
        </Pressable>
      </View>

      {paying ? (
        <PaymentSheet
          target={{
            orderId: order.id,
            customerName: order.customer.name,
            totalPaise: order.totalPaise,
            paidPaise: order.paidPaise,
            balancePaise: order.status === 'cancelled' ? -order.paidPaise : order.balancePaise,
          }}
          onClose={() => setPaying(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  request: { gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.dangerSoft },
  requestTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.danger },
  flex: { flex: 1 },
  content: { gap: space.md, paddingBottom: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tinted: { backgroundColor: colors.tint, borderColor: colors.tint },
  strong: { fontSize: font.body, fontWeight: '700', color: colors.text },
  body: { fontSize: font.body, color: colors.text },
  muted: { fontSize: font.label, color: colors.muted },
  name: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  conflict: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  conflictText: { fontSize: font.body, fontWeight: '700', color: colors.danger },
  reload: { backgroundColor: colors.danger },
  notes: { backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  notesTitle: { fontSize: font.label, fontWeight: '800', color: colors.danger },
  notesText: { fontSize: font.body, fontStyle: 'italic', color: colors.danger, lineHeight: 26 },
  sectionTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  rateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  struck: { fontSize: font.label, color: colors.muted, textDecorationLine: 'line-through' },
  totals: {
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
    marginTop: space.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  discount: { color: colors.success, fontWeight: '700' },
  totalLabel: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  totalValue: { fontFamily: serif, fontSize: font.title, fontWeight: '800', color: colors.primary },
  payment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: space.sm,
    minHeight: 56,
  },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  balance: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md, gap: 2 },
  balanceClear: { backgroundColor: colors.successSoft },
  balanceText: { fontSize: font.title, fontWeight: '800', color: colors.danger },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  more: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
