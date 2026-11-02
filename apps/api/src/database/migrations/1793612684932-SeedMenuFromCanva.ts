import type { MigrationInterface, QueryRunner } from 'typeorm';

// One-time load of the printed Canva menu (Mummy's Kitchen, Nov 2026), so parents don't type ~60 items.
// After this the app is the source of truth for prices (DECISIONS.md D8); edit items in the app, not here.
// Minimums the menu doesn't state clearly are a best guess and are only warnings in the app.
type Row = [name: string, category: string, unit: string, rupees: number, minQty: number | null, description: string | null];

const NAMKEEN = 'Namkeen';
const SNACKS = 'Snacks & Chaats';
const THALI = 'Thali & Combos';
const DESSERT = 'Dessert';

const MENU: Row[] = [
  ['Pure Ghee Maida Nimkee (Suhali)', NAMKEEN, 'kg', 400, 0.5, null],
  ['Pure Ghee Atta Nimkee (Suhali)', NAMKEEN, 'kg', 400, 0.5, null],
  ['Pure Ghee Petha', NAMKEEN, 'kg', 440, 0.5, null],
  ['Atta Masala Papdi', NAMKEEN, 'kg', 400, 0.5, null],
  ['Chaat Papdi (Suji)', NAMKEEN, 'kg', 400, 0.5, null],
  ['Chidwa Dry Fruit Mixture', NAMKEEN, 'kg', 400, 0.5, null],
  ['Masala Khakra', NAMKEEN, 'pc', 14, 10, null],
  ['Sattu Masala Khakra', NAMKEEN, 'pc', 18, 10, null],
  ['Crispy Dry Mangori', NAMKEEN, 'pc', 20, 10, null],
  ['Methi Thepla', NAMKEEN, 'pc', 25, 10, null],
  ['Dal Kachori', NAMKEEN, 'pc', 20, 10, null],

  ['Khandvi', SNACKS, 'kg', 440, 0.25, null],
  ['White Dhokla', SNACKS, 'kg', 420, 0.25, null],
  ['Idli Dhokla', SNACKS, 'pc', 15, 10, null],
  ['Idli', SNACKS, 'pc', 25, 10, null],
  ['Veg Steam Momo', SNACKS, 'plate', 100, 2, '6 pcs/plate'],
  ['Paneer Steam Momo', SNACKS, 'plate', 140, 2, '6 pcs/plate'],
  ['Veg Pan-fry Momo', SNACKS, 'plate', 130, 2, '6 pcs/plate'],
  ['Paneer Pan-fry Momo', SNACKS, 'plate', 170, 2, '6 pcs/plate'],
  ['Cheese Spaghetti Balls', SNACKS, 'plate', 150, 2, '6 pcs/plate'],
  ['Chole Bhature', SNACKS, 'plate', 120, 2, '2 Bhatura/plate'],
  ['Pav Bhaji', SNACKS, 'plate', 125, 2, '2 Pav/plate'],
  ['Bread Roll', SNACKS, 'plate', 100, null, '4 pcs/plate'],
  ['Chole Tikki Chaat', SNACKS, 'plate', 120, null, null],
  ['Basket Chaat', SNACKS, 'pc', 80, 4, null],
  ['Papdi Chaat', SNACKS, 'plate', 70, 4, null],
  ['Crutons Chaat', SNACKS, 'plate', 80, 4, null],
  ['Dahi Vada', SNACKS, 'plate', 80, 4, '2 pc/plate'],
  ['Dahi Gujia Vada', SNACKS, 'plate', 90, 4, '2 pc/plate'],
  ['Kanji Vada', SNACKS, 'plate', 50, 4, '2 pc/plate'],
  ['Bread Dahi Vada', SNACKS, 'plate', 90, 4, null],
  ['Frankie Roll', SNACKS, 'roll', 70, 4, null],
  ['Paneer Roll', SNACKS, 'roll', 70, 4, null],
  ['Cheese Roll', SNACKS, 'roll', 70, 4, null],
  ['Veg Pizza (Personal)', SNACKS, 'pizza', 80, 4, null],
  ['Vada Pav', SNACKS, 'pc', 45, 4, null],
  ['Dabeli', SNACKS, 'pc', 70, 4, null],

  ['Butter Naan + Kaali Dal + Paneer Butter Masala', THALI, 'plate', 160, 2, '2 Naan/plate'],
  ['Masala Kulcha + Kaali Dal + Paneer Butter Masala', THALI, 'plate', 180, 2, '2 Kulcha/plate'],
  ['Palak Puri + Chole', THALI, 'plate', 120, 2, '3 puri/plate'],
  ['Daal Baati Churma', THALI, 'plate', 170, 2, 'Made with pure ghee'],
  ['Gatta Pulaw + Kadhi', THALI, 'plate', 170, 2, null],
  ['Sattu Paratha + Chutney', THALI, 'plate', 120, 2, null],
  ['Litti Chokha + Chutney', THALI, 'plate', 150, 2, null],
  ['Hara Mattar Kachori + Aloo Dum', THALI, 'plate', 80, 2, null],
  ['Radhabhalabhi + Aloo Dum', THALI, 'plate', 80, 4, '2 pc/plate'],
  ['Phulka Thali', THALI, 'plate', 120, 2, '3 phulka/plate'],
  ['Rice Thali', THALI, 'plate', 120, 2, null],
  ['Pooran Puri + Aloo Dum', THALI, 'plate', 120, 2, '3 puri/plate'],

  ['Moong Daal Halwa', DESSERT, 'kg', 700, 1, null],
  ['Gajar Halwa', DESSERT, 'kg', 650, 1, 'Winter special'],
  ['Badam Halwa', DESSERT, 'kg', 900, 1, null],
  ['Pure Ghee Sattu Peda', DESSERT, 'kg', 700, 0.5, null],
  ['Pure Ghee Gond Sattu Peda', DESSERT, 'kg', 800, 0.5, null],
  ['Fruit Custard', DESSERT, 'bowl', 70, 3, null],
  ['Kheer (Payes)', DESSERT, 'bowl', 70, 3, null],
  ['Gur Kheer (Payes)', DESSERT, 'bowl', 80, 3, null],
  ['Ras Malai', DESSERT, 'pc', 30, 10, null],
];

export class SeedMenuFromCanva1793612684932 implements MigrationInterface {
  name = 'SeedMenuFromCanva1793612684932';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Parameterised inserts: never build SQL by concatenating values, even for seed data.
    for (const [i, [name, category, unit, rupees, minQty, description]] of MENU.entries()) {
      await queryRunner.query(
        `INSERT INTO "menu_items" ("name", "category", "unit", "price_paise", "min_qty", "description", "sort_order")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [name, category, unit, rupees * 100, minQty, description, (i + 1) * 10],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "menu_items" WHERE "name" = ANY($1)`, [MENU.map(([name]) => name)]);
  }
}
