import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { type Language, useI18n } from '@/lib/i18n';
import { colors, font, minTouch, space } from '@/lib/theme';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
];

export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { logout } = useAuth();

  return (
    <Screen title={t('tabs.settings')}>
      <Text style={styles.label}>{t('settings.language')}</Text>
      <View style={styles.row}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.value}
            onPress={() => setLanguage(l.value)}
            style={[styles.choice, language === l.value && styles.choiceActive]}
          >
            <Text style={[styles.choiceText, language === l.value && styles.choiceTextActive]}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>

      {/* Shows which over-the-air update is running: useful when checking a fix reached Mum's phone. */}
      <Text style={styles.version}>
        {t('settings.version')} {Constants.expoConfig?.version} · {Updates.updateId?.slice(0, 8) ?? 'dev'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.label, color: colors.muted, marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  choice: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  choiceText: { fontSize: font.body, color: colors.text },
  choiceTextActive: { color: '#fff', fontWeight: '700' },
  logout: { marginTop: space.xl, minHeight: minTouch, justifyContent: 'center' },
  logoutText: { fontSize: font.body, color: colors.danger, fontWeight: '600' },
  version: { marginTop: 'auto', marginBottom: space.md, color: colors.muted, fontSize: 13 },
});
