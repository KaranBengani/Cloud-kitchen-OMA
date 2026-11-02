import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type PaymentTarget, PaymentSheet } from '@/components/payment-sheet';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Chip, ChipRow, EmptyState, ErrorState, Icon, Skeleton } from '@/components/ui';
import { reminderText, whatsappUrl } from '@/lib/bill';
import { daysBetween, longDate, rupees, shortDate, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useDues } from '@/lib/queries';
import { colors, font, radius, serif, space } from '@/lib/theme';
import type { Due } from '@/lib/types';

type Filter = 'all' | 'overdue' | 'upcoming';

// Who owes money (D9), oldest first, plus refunds we owe on cancelled orders.
export default function DuesScreen() {
  const { t, locale } = useI18n();
  const dues = useDues();
  const [filter, setFilter] = useState<Filter>('all');
  const [paying, setPaying] = useState<PaymentTarget | null>(null);
  const today = todayISO();

  const content = () => {
    if (dues.isPending) return <Skeleton />;
    if (dues.isError) return <ErrorState error={dues.error} onRetry={() => dues.refetch()} />;

    const owed = dues.data.filter((d) => d.balancePaise > 0);
    const refunds = dues.data.filter((d) => d.balancePaise < 0);
    const overdue = owed.filter((d) => d.deliveryDate < today);
    const upcoming = owed.filter((d) => d.deliveryDate >= today);
    const shown = filter === 'overdue' ? overdue : filter === 'upcoming' ? upcoming : owed;
    const total = owed.reduce((sum, d) => sum + d.balancePaise, 0);

    if (owed.length === 0 && refunds.length === 0) {
      return <EmptyState icon="checkmark-done-circle-outline" title={t('dues.empty')} hint={t('dues.emptyHint')} />;
    }

    return (
      <>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{t('dues.total')}</Text>
          <Text style={styles.totalValue}>{rupees(total)}</Text>
          <Text style={styles.muted}>
            {owed.length === 1 ? t('dues.acrossOne') : t('dues.across', { n: owed.length })}
            {owed[0] ? ` · ${t('dues.oldest', { date: shortDate(owed[0].deliveryDate, locale) })}` : ''}
          </Text>
        </View>

        <ChipRow>
          <Chip label={`${t('dues.all')} (${owed.length})`} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip
            label={`${t('dues.overdue')} (${overdue.length})`}
            selected={filter === 'overdue'}
            onPress={() => setFilter('overdue')}
          />
          <Chip
            label={`${t('dues.upcoming')} (${upcoming.length})`}
            selected={filter === 'upcoming'}
            onPress={() => setFilter('upcoming')}
          />
        </ChipRow>

        {shown.map((due) => (
          <DueCard key={due.orderId} due={due} today={today} onPay={() => setPaying(target(due))} />
        ))}

        {refunds.length > 0 ? (
          <>
            <View style={styles.refundHeader}>
              <Icon name="arrow-undo-outline" color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('dues.toRefund')}</Text>
            </View>
            {refunds.map((due) => (
              <Card key={due.orderId} onPress={() => openOrder(due.orderId)}>
                <View style={styles.row}>
                  <Text style={[styles.name, styles.flex]}>{due.customerName}</Text>
                  <Badge label={t('status.cancelled')} tone="muted" />
                </View>
                <Text style={styles.muted}>#{due.orderId}</Text>
                <View style={styles.refundBox}>
                  <Text style={[styles.body, styles.flex]}>
                    {t('dues.paidVia', { amount: rupees(due.paidPaise) })}
                  </Text>
                  <Text style={styles.balance}>{rupees(-due.balancePaise)}</Text>
                </View>
                <Button
                  label={t('dues.markRefunded')}
                  icon="checkmark-circle-outline"
                  onPress={() => setPaying(target(due))}
                  style={styles.darkButton}
                />
              </Card>
            ))}
          </>
        ) : null}
      </>
    );
  };

  return (
    <Screen title={t('tabs.dues')}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={dues.isRefetching} onRefresh={() => void dues.refetch()} />}
      >
        {content()}
      </ScrollView>
      {paying ? <PaymentSheet target={paying} onClose={() => setPaying(null)} /> : null}
    </Screen>
  );

}

function DueCard({ due, today: todayDate, onPay }: { due: Due; today: string; onPay: () => void }) {
  const { t, locale } = useI18n();
  const late = daysBetween(due.deliveryDate, todayDate);
  return (
    <Card onPress={() => openOrder(due.orderId)}>
      <View style={styles.row}>
        <Text style={[styles.name, styles.flex]} numberOfLines={1}>
          {due.customerName}
        </Text>
        {late > 0 ? (
          <Badge
            label={late === 1 ? t('dues.overdueByOne') : t('dues.overdueBy', { n: late })}
            tone="danger"
            icon="warning-outline"
          />
        ) : (
          <Badge label={t('dues.dueOnDelivery')} tone="accent" icon="time-outline" />
        )}
      </View>
      <Text style={styles.muted}>
        #{due.orderId} · {t('dues.delivery', { date: longDate(due.deliveryDate, locale) })}
      </Text>
      <View style={styles.figures}>
        <Figure label={t('orders.total')} value={rupees(due.totalPaise)} />
        <Figure label={t('dues.paid')} value={rupees(due.paidPaise)} color={colors.success} />
        <Figure label={t('dues.balance')} value={rupees(due.balancePaise)} color={colors.danger} />
      </View>
      <View style={styles.row}>
        {due.customerPhone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:+${due.customerPhone}`)}
            style={styles.callButton}
            accessibilityLabel={t('order.call')}
          >
            <Icon name="call-outline" />
          </Pressable>
        ) : null}
        <Button
          label={t('dues.remind')}
          icon="logo-whatsapp"
          variant="whatsapp"
          onPress={() => Linking.openURL(whatsappUrl(reminderText(due), due.customerPhone))}
          style={styles.flex}
        />
        <Button label={t('dues.record')} onPress={onPay} style={styles.flex} />
      </View>
    </Card>
  );
}

function Figure({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, { color }]}>{value}</Text>
    </View>
  );
}

const openOrder = (id: number) => router.push({ pathname: '/order/[id]', params: { id } });

const target = (due: Due): PaymentTarget => ({
  orderId: due.orderId,
  customerName: due.customerName,
  totalPaise: due.totalPaise,
  paidPaise: due.paidPaise,
  balancePaise: due.balancePaise,
});

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.xl * 2 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  totalCard: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  totalLabel: { fontSize: font.label, color: colors.text, fontWeight: '600' },
  totalValue: { fontFamily: serif, fontSize: 40, fontWeight: '800', color: colors.primary },
  muted: { fontSize: font.label, color: colors.muted },
  body: { fontSize: font.body, color: colors.text },
  name: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  figures: { flexDirection: 'row', backgroundColor: colors.tint, borderRadius: radius.md, paddingVertical: space.sm },
  figure: { flex: 1, alignItems: 'center' },
  figureLabel: { fontSize: font.small, color: colors.muted },
  figureValue: { fontSize: font.body, fontWeight: '800' },
  callButton: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  sectionTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  refundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    padding: space.md,
  },
  balance: { fontSize: font.title, fontWeight: '800', color: colors.danger },
  darkButton: { backgroundColor: colors.text },
});
