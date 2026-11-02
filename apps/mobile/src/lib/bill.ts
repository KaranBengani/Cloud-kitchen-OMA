import { quantity, rupees, shortDate } from './format';
import type { Order } from './types';

// The kitchen's details as printed on the Canva menu.
const KITCHEN = {
  name: "MUMMY'S KITCHEN",
  phones: ['+91 98304 60199', '+91 91230 86730'],
};

// WhatsApp text bill (DECISIONS.md D10). *bold* and _italic_ are WhatsApp formatting.
export function billText(order: Order): string {
  const lines = order.items.map((item) => {
    const overridden = item.unitPricePaise !== item.menuPricePaise;
    const rate = `${rupees(item.unitPricePaise)}/${item.unit}${overridden ? ' (special price)' : ''}`;
    return `• ${item.name}\n   ${quantity(item.qty, item.unit)} × ${rate} = ${rupees(item.lineTotalPaise)}`;
  });

  const parts = [
    `*${KITCHEN.name}*`,
    KITCHEN.phones.join(' | '),
    '',
    `Bill for: *${order.customer.name}*`,
    `Order #${order.id} · ${shortDate(order.deliveryDate)}${order.deliveryTime ? `, ${order.deliveryTime}` : ''}`,
    '',
    ...lines,
    '',
    `*Total: ${rupees(order.totalPaise)}*`,
  ];
  if (order.paidPaise > 0) parts.push(`Paid: ${rupees(order.paidPaise)}`);
  if (order.balancePaise > 0) parts.push(`*Balance due: ${rupees(order.balancePaise)}*`);
  if (order.notes) parts.push('', `_Note: ${order.notes}_`);
  parts.push('', 'Thank you for ordering! 🙏');
  return parts.join('\n');
}

// wa.me opens the customer's chat directly with the bill typed in; the user just taps send.
// Falls back to WhatsApp's contact picker when the customer has no number.
export function whatsappUrl(text: string, phone?: string | null): string {
  return `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(text)}`;
}
