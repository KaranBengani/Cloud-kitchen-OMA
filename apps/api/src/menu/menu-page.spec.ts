import { groupMenu, menuPrice, minLabel, renderMenuPage, type MenuPageItem } from './menu-page.js';

const item = (over: Partial<MenuPageItem>): MenuPageItem => ({
  name: 'Item',
  category: 'Namkeen',
  unit: 'kg',
  pricePaise: 40000,
  minQty: 0.5,
  description: null,
  ...over,
});

describe('menuPrice', () => {
  it('shows whole rupees without decimals, and paise when present', () => {
    expect(menuPrice(40000)).toBe('400');
    expect(menuPrice(1250)).toBe('12.50');
  });
});

describe('minLabel', () => {
  it('words minimums like the Canva card', () => {
    expect(minLabel(0.5, ['kg', 'kg'])).toBe('1/2 kg');
    expect(minLabel(0.25, ['kg'])).toBe('250 Gms');
    expect(minLabel(1, ['kg'])).toBe('1 kg');
    expect(minLabel(10, ['pc', 'pc'])).toBe('10 pieces');
    expect(minLabel(2, ['plate'])).toBe('2 plates');
    expect(minLabel(4, ['pc', 'plate', 'roll'])).toBe('4 units');
  });
});

describe('groupMenu', () => {
  it('keeps menu order and shares a heading between neighbours with the same minimum', () => {
    const sections = groupMenu([
      item({ name: 'Nimkee' }),
      item({ name: 'Petha' }),
      item({ name: 'Khakra', unit: 'pc', minQty: 10 }),
      item({ name: 'Khandvi', category: 'Snacks & Chaats', minQty: 0.25 }),
      item({ name: 'Bread Roll', category: 'Snacks & Chaats', unit: 'plate', minQty: null }),
      item({ name: 'Tikki', category: 'Snacks & Chaats', unit: 'plate', minQty: null }),
    ]);
    expect(sections.map((s) => s.category)).toEqual(['Namkeen', 'Snacks & Chaats']);
    expect(sections[0].runs.map((r) => r.items.map((i) => i.name))).toEqual([['Nimkee', 'Petha'], ['Khakra']]);
    expect(sections[1].runs.map((r) => [r.min, r.items.length])).toEqual([[0.25, 1], [null, 2]]);
  });

  it('never puts kg and countable items under one heading', () => {
    const [section] = groupMenu([item({ minQty: 1 }), item({ unit: 'pc', minQty: 1 })]);
    expect(section.runs).toHaveLength(2);
  });
});

describe('renderMenuPage', () => {
  it('renders items, notes and an absolute preview image, escaping text', () => {
    const html = renderMenuPage(
      [item({ name: 'Dahi <Vada>', unit: 'plate', pricePaise: 8000, minQty: 4, description: '2 pc/plate' })],
      'https://example.com',
    );
    expect(html).toContain('Dahi &lt;Vada&gt;');
    expect(html).toContain('80/ plate');
    expect(html).toContain('(2 pc/plate)');
    expect(html).toContain('Minimum Quantity 4 plates');
    expect(html).toContain('content="https://example.com/menu/cover.jpg"');
    expect(html).not.toContain('<Vada>');
  });
});
