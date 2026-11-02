import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Icon, type IconName } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { type Language, useI18n } from '@/lib/i18n';
import { colors, font, radius, serif, space } from '@/lib/theme';

const LANGUAGES: { value: Language; label: string; sub: string }[] = [
  { value: 'en', label: 'English', sub: 'अंग्रेज़ी' },
  { value: 'hi', label: 'हिंदी', sub: 'Hindi' },
];

export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { logout } = useAuth();
  const [checking, setChecking] = useState(false);

  // Fixes ship as over-the-air updates (EAS Update). This pulls one now instead of on next launch.
  const checkForUpdate = async () => {
    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(t('settings.updateFound'));
        await Updates.reloadAsync();
      } else {
        Alert.alert(t('settings.updateLatest'));
      }
    } catch {
      Alert.alert(t('settings.updateFailed'));
    } finally {
      setChecking(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert(t('settings.logoutConfirm'), undefined, [
      { text: t('common.no'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: logout },
    ]);

  return (
    <Screen title={t('tabs.settings')}>
      <Text style={styles.label}>{t('settings.language')}</Text>
      <View style={styles.languages}>
        {LANGUAGES.map((l) => {
          const active = language === l.value;
          return (
            <Pressable
              key={l.value}
              onPress={() => setLanguage(l.value)}
              style={[styles.language, active && styles.languageActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.languageText, active && styles.onPrimary]}>{l.label}</Text>
              <Text style={[styles.languageSub, active && styles.onPrimary]}>{l.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      <Row icon="cloud-download-outline" label={t('settings.update')} onPress={checkForUpdate} busy={checking} />
      <Row icon="log-out-outline" label={t('settings.logout')} onPress={confirmLogout} danger />

      {/* Shows which over-the-air update is running: useful when checking a fix reached Mum's phone. */}
      <Text style={styles.version}>
        {t('appName')} · {t('settings.version')} {Constants.expoConfig?.version} ·{' '}
        {Updates.updateId?.slice(0, 8) ?? 'dev'}
      </Text>
    </Screen>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
  busy,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Icon name={icon} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.rowText, { color }]}>{label}</Text>
      {busy ? <ActivityIndicator color={colors.primary} /> : <Icon name="chevron-forward" color={colors.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text, marginBottom: space.sm },
  languages: { flexDirection: 'row', gap: space.md, marginBottom: space.lg },
  language: {
    flex: 1,
    minHeight: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  languageActive: { backgroundColor: colors.primary },
  languageText: { fontSize: font.title, fontWeight: '700', color: colors.text },
  languageSub: { fontSize: font.small, color: colors.muted },
  onPrimary: { color: colors.onPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 72,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    marginBottom: space.md,
  },
  pressed: { opacity: 0.7 },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: colors.dangerSoft },
  rowText: { flex: 1, fontSize: font.body, fontWeight: '700' },
  version: { marginTop: 'auto', marginBottom: space.md, color: colors.muted, fontSize: font.small, textAlign: 'center' },
});
