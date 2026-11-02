import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { colors, font, serif, space } from '@/lib/theme';

const PIN_LENGTH = 6;
const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];
const GAP = 16;

// A big on-screen keypad instead of a TextInput: no keyboard popping up, large targets,
// and it submits automatically on the 6th digit.
export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Keys are sized from the screen, not fixed: phones with a large Display size or font size have far
  // fewer dp across, and fixed 84dp keys wrapped into two columns and pushed 9/0/delete off screen.
  // Width: three keys and two gaps must fit. Height: the keypad may take at most about half the screen.
  const { width, height } = useWindowDimensions();
  const keySize = Math.round(
    Math.max(56, Math.min(88, (width - space.md * 2 - GAP * 2) / 3, (height * 0.5 - GAP * 3) / 4)),
  );
  const compact = height < 700;

  const press = async (key: string) => {
    if (busy || key === '') return;
    setError(null);
    if (key === 'del') return setPin((p) => p.slice(0, -1));

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
        {compact ? null : (
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        )}
        <Text style={styles.app} maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit>
          {t('appName')}
        </Text>
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
      <View style={[styles.pad, { gap: GAP }]}>
        {ROWS.map((row) => (
          <View key={row.join()} style={[styles.row, { gap: GAP }]}>
            {row.map((key) => (
              <Pressable
                key={key || 'blank'}
                onPress={() => press(key)}
                disabled={key === ''}
                accessibilityLabel={key === 'del' ? 'Delete' : key}
                style={({ pressed }) => [
                  styles.key,
                  { width: keySize, height: keySize, borderRadius: keySize / 2 },
                  key === '' && styles.keyHidden,
                  pressed && styles.keyPressed,
                ]}
              >
                {key === 'del' ? (
                  <Icon name="backspace-outline" size={keySize * 0.36} />
                ) : (
                  <Text style={[styles.keyText, { fontSize: keySize * 0.4 }]} maxFontSizeMultiplier={1.2}>
                    {key}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.forgot}>{t('login.forgot')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: space.md },
  logo: { width: 88, height: 88, borderRadius: 44, marginBottom: space.md },
  app: { fontFamily: serif, fontSize: font.huge, fontWeight: '700', color: colors.text },
  title: { fontSize: font.body, color: colors.muted, marginTop: space.sm },
  dots: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.tint, borderWidth: 2, borderColor: colors.border },
  dotFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
  status: { minHeight: 48, justifyContent: 'center', marginTop: space.md },
  error: { color: colors.danger, fontSize: font.body, fontWeight: '600', textAlign: 'center' },
  pad: { marginTop: 'auto', alignItems: 'center', paddingBottom: space.sm },
  row: { flexDirection: 'row' },
  // Darker than the design's pale peach: the keys must stand out clearly on the cream background.
  key: { backgroundColor: '#F8D5C4', alignItems: 'center', justifyContent: 'center' },
  keyHidden: { opacity: 0 },
  keyPressed: { backgroundColor: colors.accent },
  keyText: { color: colors.text, fontWeight: '700' },
  forgot: { textAlign: 'center', fontSize: font.label, color: colors.muted, marginVertical: space.md },
});
