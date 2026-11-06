// Mirrors the API's JSON. Money is always integer paise; dates are 'YYYY-MM-DD' strings.
export const MENU_UNITS = ['kg', 'pc', 'plate', 'bowl', 'roll', 'pizza'] as const;
export type MenuUnit = (typeof MENU_UNITS)[number];
export const PAYMENT_MODES = ['cash', 'upi_papa', 'upi_mummy'] as const;
// 'requested' / 'declined': web orders before and after the parents' decision (D19).
export type OrderStatus = 'requested' | 'booked' | 'ready' | 'delivered' | 'cancelled' | 'declined';
export const ADDRESS_LABELS = ['home', 'office', 'family', 'other'] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];
export type Fulfilment = 'pickup' | 'parcel';
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  unit: MenuUnit;
  pricePaise: number;
  minQty: number | null;
  description: string | null;
  isAvailable: boolean;
  sortOrder: number;
}

// An entry in a customer's address book (D19), most recently used first.
export interface SavedAddress {
  id: number;
  label: AddressLabel;
  recipientName: string | null;
  recipientPhone: string | null;
  address: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null; // the most recently used saved address
  addresses?: SavedAddress[]; // on customer search and lookups, not on an order's customer
  duePaise?: number; // only on search results: unpaid balance across their orders
}

export interface OrderItem {
  id: number;
  menuItemId: number | null;
  name: string;
  unit: MenuUnit;
  qty: number;
  menuPricePaise: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface Payment {
  id: number;
  amountPaise: number;
  mode: PaymentMode;
  paidOn: string;
  isAdvance: boolean;
  note: string | null;
}

export interface Order {
  id: number;
  customerId: number;
  customer: Customer;
  deliveryDate: string;
  deliveryTime: string | null;
  fulfilment: Fulfilment;
  address: string | null;
  notes: string | null;
  status: OrderStatus;
  source: 'app' | 'web';
  requestedName: string | null; // a web order's typed name, when it differs from the saved one
  subtotalPaise: number; // sum of line totals
  discountPaise: number; // order-level discount (D13)
  totalPaise: number; // subtotal − discount: what the customer owes
  paidPaise: number;
  balancePaise: number;
  version: number;
  items: OrderItem[];
  payments: Payment[];
}

// balancePaise < 0 on a cancelled order means a refund is owed.
export interface Due {
  orderId: number;
  deliveryDate: string;
  status: OrderStatus;
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  totalPaise: number;
  paidPaise: number;
  balancePaise: number;
}

export interface OrderInput {
  customerId: number;
  deliveryDate: string;
  deliveryTime?: string | null;
  fulfilment: Fulfilment;
  address?: string | null;
  addressLabel?: AddressLabel; // for a new address; the server picks Home/Other if omitted
  notes?: string | null;
  discountPaise?: number;
  items: OrderLineInput[];
}

// A menu line, or a custom off-menu line (D14) with its own name, unit and price.
export type OrderLineInput =
  | { menuItemId: number; qty: number; unitPricePaise?: number }
  | { menuItemId?: null; name: string; unit: MenuUnit; qty: number; unitPricePaise: number };

export interface PaymentInput {
  amountPaise: number;
  mode: PaymentMode;
  paidOn?: string;
  isAdvance?: boolean;
  note?: string | null;
}

// A day or range when the kitchen takes no orders (D18). Dates are 'YYYY-MM-DD', end inclusive.
export interface Holiday {
  id: number;
  startDate: string;
  endDate: string;
  note: string | null;
}

// Kitchen-wide switches (D20), Settings screen.
export interface KitchenSettings {
  onlineOrdering: boolean;
}
