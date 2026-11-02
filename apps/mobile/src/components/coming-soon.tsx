import { StyleSheet, Text } from 'react-native';
import { useI18n } from '@/lib/i18n';
import { colors, font, space } from '@/lib/theme';
import { Screen } from './screen';

// Placeholder for tabs whose screens arrive through over-the-air updates after the first install.
export function ComingSoon({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <Screen title={title}>
      <Text style={styles.text}>{t('common.comingSoon')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: font.body, color: colors.muted, marginTop: space.lg, textAlign: 'center' },
});
