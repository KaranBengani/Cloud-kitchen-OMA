import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { OrderCard } from '@/components/order-card';
import { Screen } from '@/components/screen';
import { Button, EmptyState, ErrorState, Icon, Skeleton } from '@/components/ui';
import {
  addDays,
  longDate,
  mondayOf,
  monthTitle,
  parseISO,
  rupees,
  shortDate,
  toISO,
  todayISO,
  weekdayShort,
} from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useOrders, useRequests } from '@/lib/queries';
import { colors, font, minTouch, radius, serif, space } from '@/lib/theme';
import type { Order } from '@/lib/types';

type Mode = 'week' | 'month';

export default function OrdersScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('week');

  return (
    <Screen
      title={t('tabs.orders')}
      right={
        <View style={styles.toggle}>
          {(['week', 'month'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.toggleItem, mode === m && styles.toggleActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {t(m === 'week' ? 'orders.week' : 'orders.month')}
              </Text>
            </Pressable>
          ))}
        </View>
      }
    >
      {mode === 'week' ? <UpcomingList /> : <MonthView />}
    </Screen>
  );
}

// Orders from today onwards, grouped by day. The week strip jumps to a day's section.
function UpcomingList() {
  const { t, locale } = useI18n();
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(mondayOf(today));
  const orders = useOrders();
  const list = useRef<SectionList<Order, Section>>(null);

  if (orders.isPending) return <Skeleton />;
  if (orders.isError) return <ErrorState error={orders.error} onRetry={() => orders.refetch()} />;

  const sections = groupByDay(orders.data);
  const daysWithOrders = new Set(sections.map((s) => s.date));

  const jumpTo = (date: string) => {
    // The first section on or after the tapped day.
    const index = sections.findIndex((s) => s.date >= date);
    if (index >= 0) list.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, viewOffset: 64 });
  };

  return (
    <>
      <View style={styles.weekRow}>
        <Pressable
          onPress={() => setWeekStart(addDays(weekStart, -7))}
          disabled={weekStart <= mondayOf(today)}
          style={styles.weekArrow}
          accessibilityLabel="Previous week"
        >
          <Icon name="chevron-back" color={weekStart <= mondayOf(today) ? colors.border : colors.text} />
        </Pressable>
        {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => {
          const isToday = date === today;
          const past = date < today;
          return (
            <Pressable
              key={date}
              onPress={() => jumpTo(date)}
              disabled={past}
              style={[styles.day, isToday && styles.dayToday, past && styles.dayPast]}
            >
              {/* Seven narrow cells: with a large phone font, "मंगल" wrapped mid-word. Shrink to fit instead. */}
              <Text style={[styles.dayName, isToday && styles.dayTextToday]} numberOfLines={1} adjustsFontSizeToFit>
                {weekdayShort(date, locale)}
              </Text>
              <Text
                style={[styles.dayNumber, isToday && styles.dayTextToday]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {parseISO(date).getDate()}
              </Text>
              <View style={[styles.dot, daysWithOrders.has(date) && styles.dotOn]} />
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setWeekStart(addDays(weekStart, 7))}
          style={styles.weekArrow}
          accessibilityLabel="Next week"
        >
          <Icon name="chevron-forward" />
        </Pressable>
      </View>

      <SectionList
        ref={list}
        sections={sections}
        ListHeaderComponent={<Requests />}
        keyExtractor={(order) => String(order.id)}
        renderItem={({ item }) => <OrderCard order={item} />}
        renderSectionHeader={({ section }) => <DayHeader section={section} />}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} />}
        onScrollToIndexFailed={() => {}}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title={t('orders.noUpcoming')}
            hint={t('orders.noUpcomingHint')}
            action={
              <Button
                label={t('tabs.newOrder')}
                icon="add"
                onPress={() => router.push('/order/form')}
                style={styles.emptyButton}
              />
            }
          />
        }
      />
    </>
  );

}

// Web orders waiting for a decision (D19), shown above the day list until they're accepted or declined.
function Requests() {
  const { t } = useI18n();
  const requests = useRequests();
  if (!requests.data?.length) return null;
  return (
    <View style={styles.requests}>
      <Text style={styles.requestsTitle}>
        {t('orders.requests')} ({requests.data.length})
      </Text>
      <Text style={styles.requestsHint}>{t('orders.requestsHint')}</Text>
      {requests.data.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </View>
  );
}

// Month grid with order counts per day; tapping a day lists its orders underneath.
function MonthView() {
  const { t, locale } = useI18n();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 8) + '01');
  const [selected, setSelected] = useState(today);

  const first = parseISO(month);
  const last = toISO(new Date(first.getFullYear(), first.getMonth() + 1, 0));
  const orders = useOrders(month, last);

  const gridStart = mondayOf(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).filter(
    (d, i) => i < 35 || d.slice(0, 7) === month.slice(0, 7),
  );

  const byDay = new Map<string, Order[]>();
  for (const o of orders.data ?? []) byDay.set(o.deliveryDate, [...(byDay.get(o.deliveryDate) ?? []), o]);
  const dayOrders = byDay.get(selected) ?? [];

  const changeMonth = (delta: number) => {
    const next = toISO(new Date(first.getFullYear(), first.getMonth() + delta, 1));
    setMonth(next);
    setSelected(next);
  };

  return (
    <FlatList
      data={orders.isPending || orders.isError ? [] : dayOrders}
      keyExtractor={(o) => String(o.id)}
      renderItem={({ item }) => <OrderCard order={item} />}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} />}
      ListHeaderComponent={
        <>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>{monthTitle(month, locale)}</Text>
            <Pressable onPress={() => changeMonth(-1)} style={styles.weekArrow} accessibilityLabel="Previous month">
              <Icon name="chevron-back" />
            </Pressable>
            <Pressable onPress={() => changeMonth(1)} style={styles.weekArrow} accessibilityLabel="Next month">
              <Icon name="chevron-forward" />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {Array.from({ length: 7 }, (_, i) => addDays(gridStart, i)).map((d) => (
              <Text key={d} style={styles.gridWeekday}>
                {weekdayShort(d, locale).slice(0, locale === 'hi-IN' ? 4 : 1)}
              </Text>
            ))}
            {cells.map((date) => {
              const inMonth = date.slice(0, 7) === month.slice(0, 7);
              const count = (byDay.get(date) ?? []).filter((o) => o.status !== 'cancelled').length;
              const isSelected = date === selected;
              return (
                <Pressable
                  key={date}
                  onPress={() => inMonth && setSelected(date)}
                  style={[styles.cell, isSelected && styles.cellSelected, date === today && styles.cellToday]}
                >
                  <Text style={[styles.cellDate, !inMonth && styles.cellOut, isSelected && styles.cellDateSelected]}>
                    {parseISO(date).getDate()}
                  </Text>
                  {inMonth && count > 0 ? (
                    <View style={[styles.count, isSelected && styles.countSelected]}>
                      <Text style={styles.countText}>{count}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {orders.isPending ? <Skeleton count={1} /> : null}
          {orders.isError ? <ErrorState error={orders.error} onRetry={() => orders.refetch()} /> : null}

          {!orders.isPending && !orders.isError ? (
            <>
              <View style={styles.selectedDay}>
                <Text style={styles.selectedTitle}>{longDate(selected, locale)}</Text>
                <DaySummary orders={dayOrders} />
              </View>
              {selected >= today ? (
                <Button
                  label={t('orders.addFor', { date: shortDate(selected, locale) })}
                  icon="add-circle-outline"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/order/form', params: { date: selected } })}
                  style={styles.addFor}
                />
              ) : null}
              {dayOrders.length === 0 ? <Text style={styles.noneOnDay}>{t('orders.emptyDay')}</Text> : null}
            </>
          ) : null}
        </>
      }
    />
  );
}

function DayHeader({ section }: { section: Section }) {
  const { t, locale } = useI18n();
  const today = todayISO();
  const label =
    section.date === today ? t('common.today') : section.date === addDays(today, 1) ? t('common.tomorrow') : null;
  return (
    <View style={styles.dayHeader}>
      <Text style={styles.dayHeaderTitle}>
        {label ?? shortDate(section.date, locale)}
        {label ? <Text style={styles.dayHeaderDate}> · {shortDate(section.date, locale)}</Text> : null}
      </Text>
      <DaySummary orders={section.data} />
    </View>
  );
}

// "4 orders · ₹2,510": cancelled orders don't count towards the day.
function DaySummary({ orders }: { orders: Order[] }) {
  const { t } = useI18n();
  const active = orders.filter((o) => o.status !== 'cancelled');
  if (active.length === 0) return null;
  const total = active.reduce((sum, o) => sum + o.totalPaise, 0);
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryText}>
        {active.length === 1 ? t('orders.countOne') : t('orders.count', { n: active.length })} · {rupees(total)}
      </Text>
    </View>
  );
}

type Section = { date: string; data: Order[] };

function groupByDay(orders: Order[]): Section[] {
  const sections: Section[] = [];
  for (const order of orders) {
    const last = sections.at(-1);
    if (last?.date === order.deliveryDate) last.data.push(order);
    else sections.push({ date: order.deliveryDate, data: [order] });
  }
  return sections;
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: colors.tint, borderRadius: radius.pill, padding: 4 },
  toggleItem: { paddingHorizontal: space.md, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { fontSize: font.label, color: colors.muted, fontWeight: '600' },
  toggleTextActive: { color: colors.text },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingBottom: space.sm },
  weekArrow: { width: 32, minHeight: minTouch, alignItems: 'center', justifyContent: 'center' },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
  },
  dayToday: { backgroundColor: colors.accent },
  dayPast: { opacity: 0.4 },
  dayName: { fontSize: 12, color: colors.muted },
  dayNumber: { fontSize: font.body, fontWeight: '700', color: colors.text },
  dayTextToday: { color: colors.text, fontWeight: '800' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
  dotOn: { backgroundColor: colors.primary },
  listContent: { paddingBottom: space.xl * 2 },
  requests: {
    gap: space.md,
    padding: space.md,
    marginBottom: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
  },
  requestsTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.danger },
  requestsHint: { fontSize: font.label, color: colors.text, marginTop: -space.sm },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
    marginBottom: space.md,
    gap: space.sm,
  },
  dayHeaderTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text, flexShrink: 1 },
  dayHeaderDate: { fontFamily: undefined, fontSize: font.label, fontWeight: '400', color: colors.muted },
  summary: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  summaryText: { fontSize: font.small, fontWeight: '700', color: colors.text },
  emptyButton: { alignSelf: 'stretch', marginTop: space.md },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm },
  monthTitle: { flex: 1, fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.sm,
  },
  gridWeekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: font.small, color: colors.muted, paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  cellSelected: { backgroundColor: colors.accent },
  cellToday: { borderWidth: 2, borderColor: colors.accent },
  cellDate: { fontSize: font.label, color: colors.text, fontWeight: '600' },
  cellDateSelected: { fontWeight: '800' },
  cellOut: { color: colors.border },
  count: { marginTop: 2, minWidth: 22, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  countSelected: { backgroundColor: colors.surface },
  countText: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' },
  selectedDay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  selectedTitle: { fontFamily: serif, fontSize: font.body, fontWeight: '700', color: colors.text },
  addFor: { marginBottom: space.md },
  noneOnDay: { fontSize: font.label, color: colors.muted, textAlign: 'center', marginTop: space.md },
});
