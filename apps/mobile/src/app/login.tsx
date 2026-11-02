import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { colors, font, serif, space } from '@/lib/theme';

const PIN_LENGTH = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

// A big on-screen keypad instead of a TextInput: no keyboard popping up, large targets,
// and it submits automatically on the 6th digit.
export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const press = async (key: string) => {
    if (busy || key === '') return;
    setError(null);
    if (key === '⌫') return setPin((p) => p.slice(0, -1));

    const next = pin + key;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    setBusy(true);
    try {
      await login(next);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setError(t(status === 429 ? 'login.tooMany' : status === 401 ? 'login.wrongPin' : 'login.offline'));
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.app}>{t('appName')}</Text>
        <Text style={styles.title}>{t('login.title')}</Text>
        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
          ))}
        </View>
        <View style={styles.status}>
          {busy ? <ActivityIndicator color={colors.primary} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
      <View style={styles.pad}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            onPress={() => press(key)}
            disabled={key === ''}
            accessibilityLabel={key === '⌫' ? 'Delete' : key}
            style={({ pressed }) => [styles.key, key === '' && styles.keyHidden, pressed && styles.keyPressed]}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.forgot}>{t('login.forgot')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: space.lg },
  logo: { width: 88, height: 88, borderRadius: 44, marginBottom: space.md },
  app: { fontFamily: serif, fontSize: font.huge, fontWeight: '700', color: colors.text },
  title: { fontSize: font.body, color: colors.muted, marginTop: space.sm },
  dots: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.tint, borderWidth: 2, borderColor: colors.border },
  dotFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
  status: { minHeight: 48, justifyContent: 'center', marginTop: space.md },
  error: { color: colors.danger, fontSize: font.body, fontWeight: '600', textAlign: 'center' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'auto', rowGap: space.md },
  key: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginHorizontal: '5%',
    // Darker than the design's pale peach: the keys must stand out clearly on the cream background.
    backgroundColor: '#F8D5C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyHidden: { opacity: 0 },
  keyPressed: { backgroundColor: colors.accent },
  keyText: { fontFamily: serif, fontSize: font.huge, color: colors.text, fontWeight: '700' },
  forgot: { textAlign: 'center', fontSize: font.label, color: colors.muted, marginVertical: space.lg },
});
