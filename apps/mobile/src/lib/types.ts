// Mirrors the API's JSON. Money is always integer paise; dates are 'YYYY-MM-DD' strings.
export type MenuUnit = 'kg' | 'pc' | 'plate' | 'bowl' | 'roll' | 'pizza';
export type OrderStatus = 'booked' | 'ready' | 'delivered' | 'cancelled';
export type Fulfilment = 'pickup' | 'parcel';
export type PaymentMode = 'cash' | 'upi_papa' | 'upi_mummy';

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

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
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
  totalPaise: number;
  paidPaise: number;
  balancePaise: number;
  version: number;
  items: OrderItem[];
  payments: Payment[];
}

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
  notes?: string | null;
  items: { menuItemId: number; qty: number; unitPricePaise?: number }[];
}

export interface PaymentInput {
  amountPaise: number;
  mode: PaymentMode;
  paidOn?: string;
  isAdvance?: boolean;
  note?: string | null;
}
