import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, ErrorState, Field, FormError, Icon, SearchBox, Skeleton } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { phone, rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useCustomers, useSaveCustomer } from '@/lib/queries';
import { colors, font, radius, serif, space } from '@/lib/theme';
import type { Customer } from '@/lib/types';

// Step 1. Tapping a customer moves straight on to items: one tap, not select + continue.
export function CustomerStep({ onSelect }: { onSelect: (customer: Customer) => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [creating, setCreating] = useState(false);
  const customers = useCustomers(debounced);

  // Wait for a pause in typing before searching, instead of one request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (creating) return <NewCustomerForm prefill={query} onSaved={onSelect} onCancel={() => setCreating(false)} />;

  return (
    <FlatList
      data={customers.data ?? []}
      keyExtractor={(c) => String(c.id)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <SearchBox value={query} onChangeText={setQuery} placeholder={t('customer.search')} />
          <Card onPress={() => setCreating(true)} style={styles.newCard}>
            <View style={styles.row}>
              <View style={styles.newIcon}>
                <Icon name="person-add" color={colors.onPrimary} />
              </View>
              <View style={styles.grow}>
                <Text style={styles.newTitle}>+ {t('customer.new')}</Text>
                <Text style={styles.muted}>{t('customer.newHint')}</Text>
              </View>
              <Icon name="chevron-forward" color={colors.primary} />
            </View>
          </Card>
          <Text style={styles.caption}>{(debounced ? t('customer.results') : t('customer.recent')).toUpperCase()}</Text>
          {customers.isPending ? <Skeleton count={2} /> : null}
          {customers.isError ? <ErrorState error={customers.error} onRetry={() => customers.refetch()} /> : null}
          {customers.data?.length === 0 ? <Text style={styles.muted}>{t('customer.none')}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Card onPress={() => onSelect(item)}>
          <View style={styles.row}>
            <View style={styles.grow}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? (
                <View style={styles.row}>
                  <Icon name="call-outline" size={18} color={colors.muted} />
                  <Text style={styles.detail}>{phone(item.phone)}</Text>
                </View>
              ) : null}
              {item.address ? (
                <View style={styles.row}>
                  <Icon name="location-outline" size={18} color={colors.muted} />
                  <Text style={[styles.detail, styles.grow]} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.right}>
              {item.duePaise ? (
                <Badge label={t('customer.due', { amount: rupees(item.duePaise) })} tone="danger" />
              ) : null}
              <Icon name="arrow-forward" color={colors.primary} />
            </View>
          </View>
        </Card>
      )}
    />
  );
}

function NewCustomerForm({
  prefill,
  onSaved,
  onCancel,
}: {
  prefill: string;
  onSaved: (customer: Customer) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const looksLikePhone = /^[\d\s+]{6,}$/.test(prefill);
  const [name, setName] = useState(looksLikePhone ? '' : prefill);
  const [mobile, setMobile] = useState(looksLikePhone ? prefill : '');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useSaveCustomer();

  const submit = async () => {
    if (!name.trim()) return setError(t('customer.nameRequired'));
    setError(null);
    try {
      const customer = await save.mutateAsync({
        name: name.trim(),
        phone: mobile.trim() || null,
        address: address.trim() || null,
      });
      onSaved(customer);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : -1;
      setError(
        status === 409 ? t('customer.phoneTaken') : status === 400 ? t('customer.invalidPhone') : t('common.error'),
      );
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
      <Text style={styles.formTitle}>{t('customer.new')}</Text>
      <Field label={t('customer.name')} value={name} onChangeText={setName} autoFocus={!name} />
      <Field
        label={t('customer.phone')}
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
        placeholder="98xxx xxxxx"
      />
      <Field label={t('customer.address')} value={address} onChangeText={setAddress} multiline />
      <FormError message={error} />
      <Button label={t('customer.saveContinue')} icon="arrow-forward" onPress={submit} loading={save.isPending} />
      <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: space.xl * 2 },
  header: { gap: space.md, marginBottom: space.sm },
  newCard: { backgroundColor: colors.tint, borderColor: colors.tint },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  right: { alignItems: 'flex-end', gap: space.sm },
  newIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  caption: { fontSize: font.small, letterSpacing: 1, color: colors.muted, fontWeight: '700' },
  name: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  detail: { fontSize: font.label, color: colors.muted },
  muted: { fontSize: font.label, color: colors.muted },
  formTitle: { fontFamily: serif, fontSize: font.heading, fontWeight: '700', color: colors.text, marginBottom: space.md },
});
