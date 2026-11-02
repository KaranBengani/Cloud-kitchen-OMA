// Pure pricing logic, kept free of TypeORM and Nest so it's trivial to unit-test.

export interface PriceInput {
  qty: number;
  menuPricePaise: number;
  unitPricePaise?: number; // set when this customer gets a different price
}

export interface PricedLine {
  qty: number;
  menuPricePaise: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface PricedOrder {
  lines: PricedLine[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
}

// Total = sum of line totals − one optional order-level discount (DECISIONS.md D13).
export function priceOrder(lines: PriceInput[], discountPaise = 0): PricedOrder {
  const priced = lines.map(({ qty, menuPricePaise, unitPricePaise }) => {
    const unit = unitPricePaise ?? menuPricePaise;
    // Rounded to whole paise: 0.333 kg × ₹400 is 13,320 paise, not 13,320.000000001.
    return { qty, menuPricePaise, unitPricePaise: unit, lineTotalPaise: Math.round(qty * unit) };
  });
  const subtotalPaise = priced.reduce((sum, l) => sum + l.lineTotalPaise, 0);
  if (discountPaise > subtotalPaise) {
    throw new RangeError(`Discount ${discountPaise} is more than the subtotal ${subtotalPaise}`);
  }
  return { lines: priced, subtotalPaise, discountPaise, totalPaise: subtotalPaise - discountPaise };
}
