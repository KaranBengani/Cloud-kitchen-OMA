import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { type OrderDraft, draftFromOrder, rupeesToPaise, subtotal, toOrderInput } from '@/components/order-form/cart';
import { CustomerStep } from '@/components/order-form/customer-step';
import { ItemsStep } from '@/components/order-form/items-step';
import { ReviewStep } from '@/components/order-form/review-step';
import { Screen } from '@/components/screen';
import { ErrorState, Icon, Skeleton } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { addDays, phone, todayISO } from '@/lib/format';
import { type TranslationKey, useI18n } from '@/lib/i18n';
import { useCreateOrder, useMenu, useOrder, useUpdateOrder } from '@/lib/queries';
import { colors, font, radius, space } from '@/lib/theme';

// New order and edit order share this screen: /order/form for new (optionally ?date=),
// /order/form?id=21 to edit. Editing loads the order first, then starts at the review step.
export default function OrderFormScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const id = params.id ? Number(params.id) : null;
  return id ? <EditOrder id={id} /> : <OrderWizard initialDate={params.date} />;
}

function EditOrder({ id }: { id: number }) {
  const { t } = useI18n();
  const order = useOrder(id);
  const menu = useMenu();
  if (order.isPending || menu.isPending) {
    return (
      <Screen title={t('editOrder.title', { id })} back>
        <Skeleton />
      </Screen>
    );
  }
  if (order.isError || menu.isError) {
    return (
      <Screen title={t('editOrder.title', { id })} back>
        <ErrorState
          error={order.error ?? menu.error}
          onRetry={() => {
            order.refetch();
            menu.refetch();
          }}
        />
      </Screen>
    );
  }
  return <OrderWizard edit={{ id, version: order.data.version }} initial={draftFromOrder(order.data, menu.data)} />;
}

type Step = 1 | 2 | 3;

function OrderWizard({
  initial,
  initialDate,
  edit,
}: {
  initial?: OrderDraft;
  initialDate?: string;
  edit?: { id: number; version: number };
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(edit ? 3 : 1);
  const [draft, setDraft] = useState<OrderDraft>(
    initial ?? {
      customer: null,
      lines: [],
      notes: '',
      // Orders are usually booked a day or more ahead, so tomorrow is the better default.
      deliveryDate: initialDate ?? addDays(todayISO(), 1),
      deliveryTime: null,
      fulfilment: 'pickup',
      address: '',
      discountPaise: 0,
      advanceRupees: '',
      advanceMode: null,
    },
  );
  const [error, setError] = useState<string | null>(null);
  const create = useCreateOrder();
  const updateOrder = useUpdateOrder();

  // Android's back button (or the header arrow) must not silently throw away a half-typed order.
  // On steps 2 and 3 of a new order, back goes to the previous step; leaving with unsaved work asks first.
  const [snapshot] = useState(() => JSON.stringify(initial ?? null));
  const [leaving, setLeaving] = useState(false);
  const dirty = edit ? JSON.stringify(draft) !== snapshot : draft.customer !== null || draft.lines.length > 0;
  const allowLeave = usePreventRemove(!leaving && (dirty || (!edit && step > 1)), ({ repeat }) => {
    if (!edit && step > 1) return setStep((s) => (s - 1) as Step);
    Alert.alert(t(edit ? 'form.discardChanges' : 'form.discardOrder'), t('form.discardHint'), [
      { text: t('form.keepEditing'), style: 'cancel' },
      {
        text: t('form.discard'),
        style: 'destructive',
        onPress: () => {
          setLeaving(true);
          repeat();
        },
      },
    ]);
  });

  const update = (patch: Partial<OrderDraft>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const save = async () => {
    const problem = validate(draft);
    if (problem) return setError(t(problem));
    try {
      const input = toOrderInput(draft);
      if (edit) {
        await updateOrder.mutateAsync({ ...input, id: edit.id, version: edit.version });
        allowLeave();
        router.back();
      } else {
        const advance = rupeesToPaise(draft.advanceRupees);
        const order = await create.mutateAsync({
          ...input,
          advance: advance > 0 ? { amountPaise: advance, mode: draft.advanceMode!, isAdvance: true } : undefined,
        });
        allowLeave();
        router.replace({ pathname: '/order/[id]', params: { id: order.id } });
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Optimistic locking (D6): someone else saved first. Their version wins; go back and reload.
        Alert.alert(t('order.conflict'), undefined, [
          {
            text: t('order.reload'),
            onPress: () => {
              allowLeave();
              router.back();
            },
          },
        ]);
        return;
      }
      setError(e instanceof ApiError && e.status === 0 ? t('common.noInternet') : t('common.error'));
    }
  };

  const title = edit ? t('editOrder.title', { id: edit.id }) : t('newOrder.title');

  return (
    <Screen title={title} back>
      <Steps step={step} onStep={(s) => s < step && setStep(s)} canGoBack={!edit} />

      {step === 2 && draft.customer ? (
        <View style={styles.customerBar}>
          <Icon name="person-outline" size={18} color={colors.primary} />
          <Text style={styles.customerText} numberOfLines={1}>
            {draft.customer.name} {draft.customer.phone ? `(${phone(draft.customer.phone)})` : ''}
          </Text>
          {!edit ? (
            <Pressable onPress={() => setStep(1)} hitSlop={8}>
              <Text style={styles.change}>{t('common.change')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {step === 1 ? (
        <CustomerStep
          onSelect={(customer) => {
            update({ customer, address: draft.address || customer.address || '' });
            setStep(2);
          }}
        />
      ) : null}
      {step === 2 ? (
        <ItemsStep lines={draft.lines} onChange={(lines) => update({ lines })} onNext={() => setStep(3)} />
      ) : null}
      {step === 3 ? (
        <ReviewStep
          draft={draft}
          update={update}
          isEdit={!!edit}
          error={error}
          saving={create.isPending || updateOrder.isPending}
          onSave={save}
          onChangeCustomer={() => setStep(1)}
          onAddMore={() => setStep(2)}
        />
      ) : null}
    </Screen>
  );
}

function validate(draft: OrderDraft): TranslationKey | null {
  if (draft.lines.length === 0) return 'review.emptyCart';
  if (draft.discountPaise > subtotal(draft.lines)) return 'review.discountTooBig';
  const advance = rupeesToPaise(draft.advanceRupees);
  if (draft.advanceRupees.trim() && (Number.isNaN(advance) || advance < 0)) return 'pay.invalid';
  if (advance > 0 && !draft.advanceMode) return 'review.advanceMode';
  return null;
}

// 1 Customer, 2 Items, 3 Review. Earlier steps are tappable to go back.
function Steps({ step, onStep, canGoBack }: { step: Step; onStep: (s: Step) => void; canGoBack: boolean }) {
  const { t } = useI18n();
  const labels: TranslationKey[] = ['steps.customer', 'steps.items', 'steps.review'];
  return (
    <View style={styles.steps}>
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < step;
        const active = n === step;
        return (
          <Pressable
            key={label}
            onPress={() => onStep(n)}
            disabled={!canGoBack && n === 1}
            style={styles.step}
            accessibilityRole="button"
          >
            <View style={[styles.stepCircle, done && styles.stepDone, active && styles.stepActive]}>
              {done ? (
                <Icon name="checkmark" size={18} color={colors.onPrimary} />
              ) : (
                <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{n}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]} numberOfLines={1}>
              {t(label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space.md },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { backgroundColor: colors.success },
  stepActive: { backgroundColor: colors.primary },
  stepNumber: { fontSize: font.label, fontWeight: '700', color: colors.muted },
  stepNumberActive: { color: colors.onPrimary },
  stepLabel: { fontSize: font.small, color: colors.muted },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  customerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.tint,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    minHeight: 48,
    marginBottom: space.sm,
  },
  customerText: { flex: 1, fontSize: font.label, fontWeight: '600', color: colors.text },
  change: { fontSize: font.label, fontWeight: '700', color: colors.primary },
});
