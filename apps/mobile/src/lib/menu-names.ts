import { useI18n } from './i18n';
import { useMenu } from './queries';

// Hindi mode shows menu items in Hindi (feedback, 12 Nov 2026). Orders keep a copy of the English name, so
// order lines look the Hindi name up by menuItemId. Anything sent to customers stays English (lib/bill.ts).
const CATEGORY_HI: Record<string, string> = {
  Namkeen: 'नमकीन',
  'Snacks & Chaats': 'स्नैक्स और चाट',
  'Thali & Combos': 'थाली और कॉम्बो',
  Dessert: 'मिठाई',
};

type Named = { name: string; nameHi?: string | null; menuItemId?: number | null };

export function useMenuNames() {
  const { language } = useI18n();
  const menu = useMenu();
  const hindi = language === 'hi';
  const byId = new Map((menu.data ?? []).map((m) => [m.id, m.nameHi]));

  return {
    itemName: ({ name, nameHi, menuItemId }: Named): string => {
      if (!hindi) return name;
      return (nameHi ?? (menuItemId != null ? byId.get(menuItemId) : null))?.trim() || name;
    },
    categoryName: (category: string): string => (hindi && CATEGORY_HI[category]) || category,
  };
}
