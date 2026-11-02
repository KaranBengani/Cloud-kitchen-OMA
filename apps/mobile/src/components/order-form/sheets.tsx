import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Field, FormError, Sheet } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { font, space } from '@/lib/theme';
import { MENU_UNITS, type MenuUnit } from '@/lib/types';
import { type CartLine, rupeesToPaise } from './cart';

// Asks for one rupee amount: a line's unit price, or the order discount.
// Mounted only while open (parent renders it conditionally), so it starts fresh each time.
export function AmountSheet({
  title,
  label,
  initialPaise,
  onSave,
  onClose,
  validate,
}: {
  title: string;
  label: string;
  initialPaise: number;
  onSave: (paise: number) => void;
  onClose: () => void;
  validate?: (paise: number) => string | null;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(initialPaise ? String(initialPaise / 100) : '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const paise = text.trim() === '' ? 0 : rupeesToPaise(text);
    if (Number.isNaN(paise) || paise < 0) return setError(t('pay.invalid'));
    const problem = validate?.(paise);
    if (problem) return setError(problem);
    onSave(paise);
    onClose();
  };

  return (
    <Sheet visible title={title} onClose={onClose}>
      <Field label={label} value={text} onChangeText={setText} keyboardType="decimal-pad" autoFocus selectTextOnFocus />
      <FormError message={error} />
      <Button label={t('common.save')} icon="checkmark" onPress={save} />
    </Sheet>
  );
}

let customCount = 0;

// An off-menu item (D14): typed name, unit, price and quantity. Not added to the menu.
export function CustomItemSheet({
  initialName,
  onAdd,
  onClose,
}: {
  initialName?: string;
  onAdd: (line: CartLine) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName ?? '');
  const [unit, setUnit] = useState<MenuUnit>('pc');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const pricePaise = rupeesToPaise(price);
    const quantity = Number(qty);
    if (!name.trim() || Number.isNaN(pricePaise) || pricePaise < 0 || !(quantity > 0)) {
      return setError(t('custom.invalid'));
    }
    customCount += 1;
    onAdd({
      key: `custom-new-${customCount}`,
      menuItemId: null,
      name: name.trim(),
      unit,
      menuPricePaise: pricePaise,
      qty: quantity,
      minQty: null,
    });
    onClose();
  };

  return (
    <Sheet visible title={t('custom.title')} onClose={onClose}>
      <Field label={t('custom.name')} value={name} onChangeText={setName} autoFocus={!initialName} />
      <Text style={styles.label}>{t('custom.unit')}</Text>
      <View style={styles.units}>
        {MENU_UNITS.map((u) => (
          <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
        ))}
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label={t('custom.price')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </View>
        <View style={styles.half}>
          <Field label={t('custom.qty')} value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
        </View>
      </View>
      <FormError message={error} />
      <Button label={t('custom.add')} icon="add" onPress={add} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.label, fontWeight: '600', marginBottom: space.sm },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  row: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
});
