import type { Customer, Fulfilment, MenuItem, MenuUnit, Order, OrderInput, PaymentMode } from '@/lib/types';

// One line in the order being built. Menu lines point at a menu item; custom lines (D14) don't.
export interface CartLine {
  key: string; // stable React key: `menu-12` or `custom-<n>`
  menuItemId: number | null;
  name: string;
  unit: MenuUnit;
  menuPricePaise: number; // menu price (or the price typed for a custom line)
  unitPricePaise?: number; // set when this customer gets a different price
  qty: number;
  minQty: number | null;
  description?: string | null;
}

export interface OrderDraft {
  customer: Customer | null;
  lines: CartLine[];
  notes: string;
  deliveryDate: string;
  deliveryTime: string | null; // 'HH:MM'
  fulfilment: Fulfilment;
  address: string;
  discountPaise: number;
  advanceRupees: string; // as typed
  advanceMode: PaymentMode | null;
}

// Same rounding as the API's priceOrder(), so the total on screen is exactly what gets saved.
export const unitPrice = (line: CartLine) => line.unitPricePaise ?? line.menuPricePaise;
export const lineTotal = (line: CartLine) => Math.round(line.qty * unitPrice(line));
export const subtotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + lineTotal(l), 0);

export function lineFromMenu(item: MenuItem, qty: number): CartLine {
  return {
    key: `menu-${item.id}`,
    menuItemId: item.id,
    name: item.name,
    unit: item.unit,
    menuPricePaise: item.pricePaise,
    qty,
    minQty: item.minQty,
    description: item.description,
  };
}

// Editing: rebuild the cart from the saved order. Menu lines keep the menu price that was
// snapshotted at booking, exactly as the server does when the order is saved again.
export function draftFromOrder(order: Order, menu: MenuItem[]): OrderDraft {
  const byId = new Map(menu.map((m) => [m.id, m]));
  return {
    customer: order.customer,
    lines: order.items.map((item, index) => ({
      key: item.menuItemId == null ? `custom-${index}` : `menu-${item.menuItemId}`,
      menuItemId: item.menuItemId,
      name: item.name,
      unit: item.unit,
      menuPricePaise: item.menuPricePaise,
      unitPricePaise: item.unitPricePaise !== item.menuPricePaise ? item.unitPricePaise : undefined,
      qty: item.qty,
      minQty: item.menuItemId == null ? null : (byId.get(item.menuItemId)?.minQty ?? null),
      description: item.menuItemId == null ? null : byId.get(item.menuItemId)?.description,
    })),
    notes: order.notes ?? '',
    deliveryDate: order.deliveryDate,
    deliveryTime: order.deliveryTime?.slice(0, 5) ?? null,
    fulfilment: order.fulfilment,
    address: order.address ?? '',
    discountPaise: order.discountPaise,
    advanceRupees: '',
    advanceMode: null,
  };
}

export function toOrderInput(draft: OrderDraft): OrderInput {
  return {
    customerId: draft.customer!.id,
    deliveryDate: draft.deliveryDate,
    deliveryTime: draft.deliveryTime,
    fulfilment: draft.fulfilment,
    address: draft.fulfilment === 'parcel' ? draft.address.trim() || null : null,
    notes: draft.notes.trim() || null,
    discountPaise: draft.discountPaise,
    items: draft.lines.map((l) =>
      l.menuItemId == null
        ? { name: l.name, unit: l.unit, qty: l.qty, unitPricePaise: unitPrice(l) }
        : { menuItemId: l.menuItemId, qty: l.qty, unitPricePaise: l.unitPricePaise },
    ),
  };
}

// "500" or "1,250.50" → paise; NaN when it isn't a number.
export function rupeesToPaise(text: string): number {
  const value = Number(text.replace(/[,₹\s]/g, ''));
  return text.trim() === '' || !Number.isFinite(value) ? Number.NaN : Math.round(value * 100);
}
