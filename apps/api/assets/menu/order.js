// Online ordering on the public menu page (DECISIONS.md D19). Plain browser JavaScript, no build step:
// the server renders the menu, and this adds "+ Add" buttons, a cart bar and the order form on top.
// Without JavaScript the page is still a readable menu with a WhatsApp button.
(() => {
  const data = JSON.parse(document.getElementById('menu-data').textContent);
  const items = new Map(data.items.map((i) => [i.id, i]));
  const cart = new Map(); // menu item id → quantity
  const $ = (id) => document.getElementById(id);

  // ---- Formatting ----
  const rupees = (paise) =>
    '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: paise % 100 ? 2 : 0 });
  const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  const qtyLabel = (qty, unit) => (FRACTIONS[qty] ?? String(qty)) + ' ' + unit;
  const step = (item) => (item.unit === 'kg' ? 0.25 : 1);
  const lineTotal = (item, qty) => Math.round(item.pricePaise * qty);
  const dayLabel = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
    });
  };
  const time12 = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return ((h + 11) % 12) + 1 + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM');
  };
  const holidayOn = (date) => data.holidays.find((h) => h.startDate <= date && date <= h.endDate);

  // ---- Steppers on each menu item ----
  // The first tap adds the item's minimum (e.g. ½ kg), since that's what most people order. Going below
  // the minimum is allowed: the kitchen reviews every request and confirms if it's possible.
  function renderControl(row) {
    const item = items.get(Number(row.dataset.id));
    const qty = cart.get(item.id) ?? 0;
    let ctl = row.querySelector('.ctl');
    if (!ctl) {
      ctl = document.createElement('div');
      ctl.className = 'ctl';
      row.appendChild(ctl);
    }
    if (!qty) {
      ctl.innerHTML = '<button type="button" class="add" data-act="add">+ Add</button>';
      return;
    }
    const below = item.minQty && qty < item.minQty;
    ctl.innerHTML =
      (below ? '<span class="below">min ' + qtyLabel(item.minQty, item.unit) + '</span>' : '') +
      '<button type="button" class="step" data-act="minus" aria-label="Less">−</button>' +
      '<span class="qty">' + qtyLabel(qty, item.unit) + '</span>' +
      '<button type="button" class="step" data-act="plus" aria-label="More">+</button>';
  }

  document.querySelectorAll('.item[data-id]').forEach(renderControl);
  document.querySelector('.menu').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-act]');
    if (!button) return;
    const row = button.closest('.item');
    const item = items.get(Number(row.dataset.id));
    const qty = cart.get(item.id) ?? 0;
    const next =
      button.dataset.act === 'add' ? item.minQty || step(item)
        : button.dataset.act === 'plus' ? qty + step(item)
        : qty - step(item);
    if (next > 0) cart.set(item.id, Math.round(next * 1000) / 1000);
    else cart.delete(item.id);
    renderControl(row);
    renderBar();
  });

  // ---- Cart bar ----
  const cartTotal = () => [...cart].reduce((sum, [id, qty]) => sum + lineTotal(items.get(id), qty), 0);

  function renderBar() {
    const count = cart.size;
    $('whatsapp').hidden = count > 0;
    $('cart-bar').hidden = count === 0;
    $('cart-summary').textContent = count + (count === 1 ? ' item' : ' items') + ' · ' + rupees(cartTotal());
  }

  // ---- Checkout ----
  // Fields are looked up by id: form.name would be the form's own name attribute, not the input.
  const form = $('order-form');
  const today = data.today;

  function openCheckout() {
    $('summary').innerHTML =
      [...cart]
        .map(([id, qty]) => {
          const item = items.get(id);
          const below = item.minQty && qty < item.minQty ? ' <em>(below minimum, we’ll confirm)</em>' : '';
          return (
            '<li><span>' + escapeText(item.name) + ' · ' + qtyLabel(qty, item.unit) + below + '</span>' +
            '<span>' + rupees(lineTotal(item, qty)) + '</span></li>'
          );
        })
        .join('') +
      '<li class="total"><span>Estimated total</span><span>' + rupees(cartTotal()) + '</span></li>';
    $('checkout').hidden = false;
    document.body.classList.add('locked');
    $('checkout').scrollTop = 0;
  }

  function closeCheckout() {
    $('checkout').hidden = true;
    document.body.classList.remove('locked');
  }

  $('cart-continue').addEventListener('click', openCheckout);
  $('checkout-back').addEventListener('click', closeCheckout);

  // Pickup or delivery shows or hides the address section.
  const syncFulfilment = () => {
    $('delivery-fields').hidden = form.elements.fulfilment.value !== 'parcel';
  };
  form.querySelectorAll('input[name="fulfilment"]').forEach((r) => r.addEventListener('change', syncFulfilment));
  $('for-someone').addEventListener('change', (e) => ($('recipient-fields').hidden = !e.target.checked));

  // Dates: today up to two months ahead; holidays and same-day orders get a message.
  $('f-date').min = today;
  $('f-date').max = data.maxDate;
  $('f-date').addEventListener('input', () => {
    const date = $('f-date').value;
    const holiday = date && holidayOn(date);
    $('date-note').textContent = holiday
      ? 'The kitchen is closed on this date' + (holiday.note ? ' (' + holiday.note + ')' : '') + '. Please pick another day.'
      : date === today
        ? 'Same-day order: please call ' + data.phones[0] + ' before placing it, to check we can make it today.'
        : '';
    $('date-note').className = holiday ? 'field-note error' : 'field-note warn';
  });

  // An old error message goes away as soon as the customer starts fixing things.
  form.addEventListener('input', () => ($('form-error').textContent = ''));

  // Note chips add common requests to the instructions box.
  document.querySelectorAll('.note-chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      const parts = $('f-notes').value.split(',').map((p) => p.trim()).filter(Boolean);
      if (!parts.includes(chip.textContent)) parts.push(chip.textContent);
      $('f-notes').value = parts.join(', ');
    }),
  );

  // Name and number are remembered on this phone only, so a returning customer doesn't retype them.
  try {
    const saved = JSON.parse(localStorage.getItem('mk-customer') || '{}');
    if (saved.name) $('f-name').value = saved.name;
    if (saved.phone) $('f-phone').value = saved.phone;
  } catch {
    // Storage blocked (private mode): nothing to prefill.
  }

  function validate() {
    const digits = $('f-phone').value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
    if (!$('f-name').value.trim()) return 'Please enter your name.';
    if (!/^[6-9]\d{9}$/.test(digits)) return 'Please enter a 10-digit mobile number.';
    if (!$('f-date').value) return 'Please pick a date.';
    if ($('f-date').value < today || $('f-date').value > data.maxDate) return 'Please pick a date within the next two months.';
    if (holidayOn($('f-date').value)) return 'The kitchen is closed on that date. Please pick another day.';
    if (form.elements.fulfilment.value === 'parcel' && $('f-address').value.trim().length < 5) return 'Please enter the delivery address.';
    if ($('for-someone').checked && $('f-recipient-phone').value.trim()) {
      const r = $('f-recipient-phone').value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
      if (!/^[6-9]\d{9}$/.test(r)) return 'Please check the receiver’s mobile number.';
    }
    return null;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const problem = validate();
    $('form-error').textContent = problem ?? '';
    if (problem) return;

    const delivery = form.elements.fulfilment.value === 'parcel';
    const someoneElse = delivery && $('for-someone').checked;
    const body = {
      name: $('f-name').value.trim(),
      phone: $('f-phone').value,
      fulfilment: form.elements.fulfilment.value,
      address: delivery
        ? {
            address: $('f-address').value.trim(),
            label: form.elements.label.value,
            recipientName: someoneElse ? $('f-recipient-name').value.trim() || null : null,
            recipientPhone: someoneElse ? $('f-recipient-phone').value.trim() || null : null,
          }
        : undefined,
      deliveryDate: $('f-date').value,
      deliveryTime: $('f-time').value || null,
      notes: $('f-notes').value.trim() || null,
      items: [...cart].map(([menuItemId, qty]) => ({ menuItemId, qty })),
      website: $('f-website').value,
    };

    const button = $('submit');
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const response = await fetch('/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(result.message) ? result.message[0] : result.message;
        $('form-error').textContent =
          response.status === 429
            ? 'Too many tries. Please call or WhatsApp us on ' + data.phones[0] + '.'
            : message || 'Something went wrong. Please try again, or WhatsApp us.';
        return;
      }
      try {
        localStorage.setItem('mk-customer', JSON.stringify({ name: body.name, phone: body.phone }));
      } catch {
        // Not remembered; that's fine.
      }
      showDone(result.orderId, body);
    } catch {
      $('form-error').textContent = 'No internet connection. Please check it and try again.';
    } finally {
      button.disabled = false;
      button.textContent = 'Send order request';
    }
  });

  // The confirmation offers a WhatsApp message with the whole order, which is how the kitchen hears
  // about it straight away (the app has no notifications).
  function showDone(orderId, body) {
    const lines = [...cart].map(([id, qty]) => '• ' + items.get(id).name + ' · ' + qtyLabel(qty, items.get(id).unit));
    const when = dayLabel(body.deliveryDate) + (body.deliveryTime ? ', ' + time12(body.deliveryTime) : '');
    const text = [
      'Hi Mummy’s Kitchen, I placed order request #' + orderId + ':',
      ...lines,
      'For: ' + when,
      body.fulfilment === 'parcel' ? 'Delivery to: ' + body.address.address : 'Pickup',
      body.notes ? 'Notes: ' + body.notes : null,
      'Name: ' + body.name,
      'Estimated total: ' + rupees(cartTotal()),
    ]
      .filter(Boolean)
      .join('\n');
    $('done-id').textContent = '#' + orderId;
    $('done-whatsapp').href = 'https://wa.me/' + data.whatsapp + '?text=' + encodeURIComponent(text);
    form.hidden = true;
    $('review').hidden = true;
    $('done').hidden = false;
    $('checkout').scrollTop = 0;
    cart.clear();
    document.querySelectorAll('.item[data-id]').forEach(renderControl);
    renderBar();
  }

  $('done-close').addEventListener('click', () => {
    form.reset();
    syncFulfilment();
    form.hidden = false;
    $('review').hidden = false;
    $('done').hidden = true;
    closeCheckout();
  });

  function escapeText(text) {
    const span = document.createElement('span');
    span.textContent = text;
    return span.innerHTML;
  }

  syncFulfilment();
  renderBar();
})();
