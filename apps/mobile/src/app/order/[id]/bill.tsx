import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Button, ErrorState, Skeleton } from '@/components/ui';
import { billText, whatsappUrl } from '@/lib/bill';
import { phone } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useOrder } from '@/lib/queries';
import { colors, font, radius, space } from '@/lib/theme';

// The WhatsApp text bill (D10): a preview styled like a chat bubble, then send or copy.
export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const order = useOrder(Number(id));
  const [copied, setCopied] = useState(false);

  if (order.isPending) {
    return (
      <Screen title={t('bill.title')} back>
        <Skeleton count={1} />
      </Screen>
    );
  }
  if (order.isError) {
    return (
      <Screen title={t('bill.title')} back>
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </Screen>
    );
  }

  const text = billText(order.data);
  const customerPhone = order.data.customer.phone;

  return (
    <Screen title={t('bill.title')} back>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.to}>
          {order.data.customer.name}
          {customerPhone ? ` · ${phone(customerPhone)}` : ''}
        </Text>
        <View style={styles.bubble}>
          <Text style={styles.text} selectable>
            {text}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Button
          label={t('bill.send')}
          icon="logo-whatsapp"
          variant="whatsapp"
          onPress={() => Linking.openURL(whatsappUrl(text, customerPhone))}
        />
        <Button
          label={copied ? t('bill.copied') : t('bill.copy')}
          icon={copied ? 'checkmark' : 'copy-outline'}
          variant="secondary"
          onPress={async () => {
            await Clipboard.setStringAsync(text);
            setCopied(true);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.lg, gap: space.md },
  to: { fontSize: font.label, color: colors.muted },
  bubble: {
    backgroundColor: '#E7F8DC',
    borderRadius: radius.lg,
    borderTopLeftRadius: 4,
    padding: space.md,
  },
  text: { fontSize: font.label, lineHeight: 24, color: colors.text },
  actions: { gap: space.sm, paddingVertical: space.md },
});
