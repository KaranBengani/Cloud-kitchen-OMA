import { quantity, rupees, shortDate, time12 } from './format';
import type { Due, Order } from './types';

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
    `Order #${order.id} · ${shortDate(order.deliveryDate)}${order.deliveryTime ? `, ${time12(order.deliveryTime)}` : ''}`,
    ...(order.fulfilment === 'parcel' && order.address ? [`Delivery: ${order.address}`] : []),
    '',
    ...lines,
    '',
  ];
  if (order.discountPaise > 0) {
    parts.push(`Subtotal: ${rupees(order.subtotalPaise)}`, `Discount: −${rupees(order.discountPaise)}`);
  }
  parts.push(`*Total: ${rupees(order.totalPaise)}*`);
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

// A polite payment reminder for the Dues screen. Always English: it goes to customers.
export function reminderText(due: Due): string {
  return [
    `Namaste ${due.customerName} 🙏`,
    `A gentle reminder from ${KITCHEN.name.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())}:`,
    `${rupees(due.balancePaise)} is pending for order #${due.orderId} (${shortDate(due.deliveryDate)}).`,
    'Thank you!',
  ].join('\n');
}

// Message for sharing the web menu. WhatsApp turns the link into a preview with the menu cover.
export function menuShareText(url: string): string {
  return [`*${KITCHEN.name} · MENU*`, 'See our menu and order online here 👇', url].join('\n');
}
