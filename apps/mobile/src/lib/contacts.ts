import { Contact, requestPermissionsAsync } from 'expo-contacts';
import { Alert } from 'react-native';

export interface PickedContact {
  name: string;
  phone: string | null; // 10 digits, or as saved when it isn't an Indian mobile
}

// "+91 98304-60199", "098304 60199" → "9830460199". The server normalises again (D19).
function tenDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length > 10 && /^(91|0)/.test(digits) ? digits.slice(-10) : digits;
}

// When a contact has several numbers, the parent picks one; resolves null if they cancel.
function choosePhone(numbers: string[], title: string, cancel: string): Promise<string | null> {
  return new Promise((resolve) =>
    Alert.alert(title, undefined, [
      ...numbers.slice(0, 3).map((n) => ({ text: n, onPress: () => resolve(n) })),
      { text: cancel, style: 'cancel' as const, onPress: () => resolve(null) },
    ]),
  );
}

// Opens the phone's own contact list (feedback, 12 Nov 2026). Reading the picked contact's name and numbers needs
// the contacts permission, asked once; 'denied' lets the caller explain. Null means the parent backed out.
export async function pickContact(text: {
  choosePhone: string;
  cancel: string;
}): Promise<PickedContact | 'denied' | null> {
  const { granted } = await requestPermissionsAsync();
  if (!granted) return 'denied';
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const [name, phones] = await Promise.all([contact.getFullName(), contact.getPhones()]);
  const numbers = [...new Set(phones.map((p) => tenDigits(p.number ?? '')).filter(Boolean))];
  const phone = numbers.length > 1 ? await choosePhone(numbers, text.choosePhone, text.cancel) : (numbers[0] ?? null);
  if (numbers.length > 1 && !phone) return null;
  return { name: name.trim(), phone };
}
