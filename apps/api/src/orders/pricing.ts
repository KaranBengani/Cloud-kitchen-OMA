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

export function priceLines(lines: PriceInput[]): { lines: PricedLine[]; totalPaise: number } {
  const priced = lines.map(({ qty, menuPricePaise, unitPricePaise }) => {
    const unit = unitPricePaise ?? menuPricePaise;
    // Rounded to whole paise: 0.333 kg × ₹400 is 13,320 paise, not 13,320.000000001.
    return { qty, menuPricePaise, unitPricePaise: unit, lineTotalPaise: Math.round(qty * unit) };
  });
  return { lines: priced, totalPaise: priced.reduce((sum, l) => sum + l.lineTotalPaise, 0) };
}
