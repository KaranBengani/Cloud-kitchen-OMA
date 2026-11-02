import { priceOrder } from './pricing.js';

describe('priceOrder', () => {
  it('uses the menu price unless overridden, and totals the lines', () => {
    const { lines, totalPaise } = priceOrder([
      { qty: 0.5, menuPricePaise: 44000 }, // ½ kg Khandvi at ₹440/kg = ₹220
      { qty: 20, menuPricePaise: 2000, unitPricePaise: 1800 }, // 20 Dal Kachori, ₹2 off each = ₹360
    ]);
    expect(lines.map((l) => l.lineTotalPaise)).toEqual([22000, 36000]);
    expect(lines[1]).toMatchObject({ menuPricePaise: 2000, unitPricePaise: 1800 });
    expect(totalPaise).toBe(58000);
  });

  it('rounds fractional kg to whole paise', () => {
    expect(priceOrder([{ qty: 0.333, menuPricePaise: 40000 }]).totalPaise).toBe(13320);
  });

  it('allows a free item (override to 0)', () => {
    expect(priceOrder([{ qty: 1, menuPricePaise: 7000, unitPricePaise: 0 }]).totalPaise).toBe(0);
  });

  it('subtracts an order-level discount from the subtotal', () => {
    const order = priceOrder([{ qty: 1, menuPricePaise: 148500 }], 8500); // ₹1,485 − ₹85
    expect(order).toMatchObject({ subtotalPaise: 148500, discountPaise: 8500, totalPaise: 140000 });
  });

  it('rejects a discount bigger than the subtotal', () => {
    expect(() => priceOrder([{ qty: 1, menuPricePaise: 10000 }], 10001)).toThrow(RangeError);
  });
});
