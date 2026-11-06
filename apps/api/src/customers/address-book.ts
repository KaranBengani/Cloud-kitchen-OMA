import type { EntityManager } from 'typeorm';
import { type AddressLabel, addressKey } from './customer-address.entity.js';

// Customer and address writes shared by the app (OrdersService, CustomersService) and the web order
// form (DECISIONS.md D19). Plain functions taking the transaction's EntityManager, so they always run
// inside the caller's transaction.

export interface AddressInput {
  address: string;
  label?: AddressLabel;
  recipientName?: string | null;
  recipientPhone?: string | null;
}

// Saves an address to the customer's book, or reuses the row when the same address is already there
// (same addressKey). One atomic statement: two orders to the same new address at once can't create two
// rows. On reuse, the latest label and recipient win and updated_at moves it to the top of the list.
export async function saveAddress(tx: EntityManager, customerId: number, input: AddressInput): Promise<number> {
  const address = input.address.trim();
  const label = input.label ?? (await defaultLabel(tx, customerId));
  const rows: { id: number }[] = await tx.query(
    `INSERT INTO customer_addresses (customer_id, label, recipient_name, recipient_phone, address, address_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (customer_id, address_key) DO UPDATE
       SET label = EXCLUDED.label,
           recipient_name = EXCLUDED.recipient_name,
           recipient_phone = EXCLUDED.recipient_phone,
           address = EXCLUDED.address,
           updated_at = now()
     RETURNING id`,
    [
      customerId,
      label,
      input.recipientName?.trim() || null,
      input.recipientPhone || null,
      address,
      addressKey(address),
    ],
  );
  return rows[0].id;
}

// A customer's first address is probably their home; later ones are left as "other" for parents to relabel.
async function defaultLabel(tx: EntityManager, customerId: number): Promise<AddressLabel> {
  const [{ count }]: { count: number }[] = await tx.query(
    `SELECT count(*)::int AS count FROM customer_addresses WHERE customer_id = $1`,
    [customerId],
  );
  return count === 0 ? 'home' : 'other';
}

// The customer with this phone number, created if new. One statement, so a web order and the parents
// adding the same person at the same moment still end up with one row (UQ_customers_phone).
// An existing customer's name is never changed: `nameDiffers` lets the caller show the typed name.
export async function findOrCreateCustomer(
  tx: EntityManager,
  name: string,
  phone: string,
): Promise<{ id: number; nameDiffers: boolean }> {
  const rows: { id: number; name: string }[] = await tx.query(
    `INSERT INTO customers (name, phone) VALUES ($1, $2)
     ON CONFLICT (phone) WHERE phone IS NOT NULL DO UPDATE SET phone = EXCLUDED.phone
     RETURNING id, name`,
    [name.trim(), phone],
  );
  const { id, name: saved } = rows[0];
  return {
    id,
    nameDiffers: saved.trim().toLowerCase() !== name.trim().toLowerCase(),
  };
}

// The text copied onto an order: the address, plus who receives it when that's someone else.
export function addressSnapshot(input: AddressInput): string {
  const recipient = [input.recipientName?.trim(), input.recipientPhone ? `+${input.recipientPhone}` : null]
    .filter(Boolean)
    .join(', ');
  return recipient ? `${input.address.trim()}\nDeliver to: ${recipient}` : input.address.trim();
}
