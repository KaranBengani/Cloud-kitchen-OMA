import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { colors, font, minTouch, radius, serif, space } from '@/lib/theme';
import type { OrderStatus } from '@/lib/types';

// Small shared building blocks. In React web these would be <button>, <input> and styled divs;
// React Native has no CSS cascade, so each component carries its own StyleSheet.

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

type ButtonVariant = 'primary' | 'secondary' | 'whatsapp' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, v.box, off && styles.buttonOff, pressed && styles.pressed, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={v.text} size={22} /> : null}
          <Text style={[styles.buttonText, { color: v.text }]} numberOfLines={2}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { box: ViewStyle; text: string }> = {
  primary: { box: { backgroundColor: colors.primary }, text: colors.onPrimary },
  secondary: { box: { backgroundColor: colors.tint }, text: colors.primary },
  whatsapp: { box: { backgroundColor: colors.whatsapp }, text: '#FFFFFF' },
  danger: { box: { backgroundColor: colors.dangerSoft }, text: colors.danger },
  ghost: { box: { backgroundColor: 'transparent' }, text: colors.primary },
};

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {icon ? <Icon name={icon} size={18} color={selected ? colors.onPrimary : colors.text} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// Horizontally scrolling chip row (categories, filters).
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

type Tone = 'neutral' | 'accent' | 'success' | 'danger' | 'muted';

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = badgeTones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={15} color={t.fg} /> : null}
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const badgeTones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.tint, fg: colors.text },
  accent: { bg: colors.accentSoft, fg: colors.text },
  success: { bg: colors.successSoft, fg: colors.success },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  muted: { bg: '#F1ECE8', fg: colors.muted },
};

const STATUS_TONE: Record<OrderStatus, Tone> = {
  booked: 'accent',
  ready: 'success',
  delivered: 'neutral',
  cancelled: 'muted',
};

const STATUS_ICON: Record<OrderStatus, IconName> = {
  booked: 'bookmark-outline',
  ready: 'checkmark-circle-outline',
  delivered: 'checkmark-done',
  cancelled: 'close-circle-outline',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <Badge label={t(`status.${status}`)} tone={STATUS_TONE[status]} icon={STATUS_ICON[status]} />;
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Field({ label, error, style, ...input }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.disabled}
        style={[styles.input, input.multiline && styles.inputMultiline, error ? styles.inputError : null, style]}
        {...input}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function SearchBox({ value, onChangeText, placeholder }: TextInputProps) {
  return (
    <View style={styles.search}>
      <Icon name="search" color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.disabled}
        style={styles.searchInput}
        autoCorrect={false}
      />
      {value ? (
        <Pressable onPress={() => onChangeText?.('')} hitSlop={12} accessibilityLabel="Clear">
          <Icon name="close-circle" color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

// − 1 kg + : big round buttons; going below the minimum step calls onRemove instead.
export function Stepper({
  label,
  onMinus,
  onPlus,
}: {
  label: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} style={[styles.stepButton, styles.stepMinus]} accessibilityLabel="Less" hitSlop={4}>
        <Icon name="remove" color={colors.primary} size={26} />
      </Pressable>
      <Text style={styles.stepValue}>{label}</Text>
      <Pressable onPress={onPlus} style={[styles.stepButton, styles.stepPlus]} accessibilityLabel="More" hitSlop={4}>
        <Icon name="add" color={colors.onPrimary} size={26} />
      </Pressable>
    </View>
  );
}

// Bottom sheet: a Modal that slides up. Used for custom items, payments and price edits.
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: bottom + space.md }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.roundButton} accessibilityLabel="Close">
              <Icon name="close" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Loading, empty and error states ----

export function Skeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: space.md, paddingTop: space.md }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={[styles.skeletonLine, { width: '40%' }]} />
          <View style={[styles.skeletonBlock]} />
          <View style={[styles.skeletonLine, { width: '70%' }]} />
          <View style={[styles.skeletonLine, { width: '55%' }]} />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
      {action}
    </View>
  );
}

// No internet (status 0) gets its own message; anything else is a generic error. Online-only app (D5).
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useI18n();
  const offline = error instanceof ApiError && error.status === 0;
  return (
    <EmptyState
      icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
      title={t(offline ? 'common.noInternet' : 'common.error')}
      hint={t(offline ? 'common.noInternetHint' : 'common.errorHint')}
      action={<Button label={t('common.retry')} icon="refresh" onPress={onRetry} style={styles.emptyAction} />}
    />
  );
}

// Inline error line under a form. Callers pass translated text.
export function FormError({ message }: { message: string | null }) {
  return message ? <Text style={styles.formError}>{message}</Text> : null;
}

export const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonOff: { opacity: 0.45 },
  buttonText: { fontSize: font.body, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  chip: {
    minHeight: minTouch - 4,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.tint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: font.label, color: colors.text, fontWeight: '600' },
  chipTextSelected: { color: colors.onPrimary },
  chipRow: { gap: space.sm, paddingVertical: space.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: font.small, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  sectionTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text },
  field: { gap: 6, marginBottom: space.md },
  fieldLabel: { fontSize: font.label, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    fontSize: font.body,
    color: colors.text,
  },
  inputMultiline: { minHeight: 96, paddingTop: space.md, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: font.small },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: space.sm },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    padding: 4,
    gap: space.sm,
  },
  stepButton: { width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  stepMinus: { backgroundColor: colors.surface },
  stepPlus: { backgroundColor: colors.primary },
  stepValue: { minWidth: 76, textAlign: 'center', fontSize: font.body, fontWeight: '700', color: colors.text },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(40, 20, 10, 0.45)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: space.md,
    maxHeight: '92%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: space.sm,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.md },
  sheetTitle: { fontFamily: serif, fontSize: font.heading, fontWeight: '700', color: colors.text, flex: 1 },
  roundButton: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  skeletonLine: { height: 16, borderRadius: 8, backgroundColor: colors.tint },
  skeletonBlock: { height: 56, borderRadius: radius.md, backgroundColor: colors.tint },
  empty: { alignItems: 'center', padding: space.lg, gap: space.sm, marginTop: space.xl },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  emptyTitle: { fontFamily: serif, fontSize: font.title, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: font.label, color: colors.muted, textAlign: 'center' },
  emptyAction: { marginTop: space.md, alignSelf: 'stretch' },
  formError: { color: colors.danger, fontSize: font.label, marginBottom: space.sm },
});
