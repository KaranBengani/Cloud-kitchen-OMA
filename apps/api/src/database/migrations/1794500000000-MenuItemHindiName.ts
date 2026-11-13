import { MigrationInterface, QueryRunner } from 'typeorm';

// Hindi names for the app's Hindi mode (feedback, 12 Nov 2026). Filled for the menu as it is today, matched on the
// English name so it works on every database; parents correct or add names from the Menu tab.
const HINDI: Record<string, string> = {
  'Pure Ghee Maida Nimkee (Suhali)': 'शुद्ध घी मैदा निमकी (सुहाली)',
  'Pure Ghee Atta Nimkee (Suhali)': 'शुद्ध घी आटा निमकी (सुहाली)',
  'Pure Ghee Petha': 'शुद्ध घी पेठा',
  'Atta Masala Papdi': 'आटा मसाला पापड़ी',
  'Chaat Papdi (Suji)': 'चाट पापड़ी (सूजी)',
  'Chidwa Dry Fruit Mixture': 'चिवड़ा ड्राई फ्रूट मिक्सचर',
  'Masala Khakra': 'मसाला खाखरा',
  'Sattu Masala Khakra': 'सत्तू मसाला खाखरा',
  'Crispy Dry Mangori': 'कुरकुरी सूखी मंगौड़ी',
  'Methi Thepla': 'मेथी थेपला',
  'Dal Kachori': 'दाल कचौड़ी',
  Khandvi: 'खांडवी',
  'White Dhokla': 'सफ़ेद ढोकला',
  'Idli Dhokla': 'इडली ढोकला',
  Idli: 'इडली',
  'Veg Steam Momo': 'वेज स्टीम मोमो',
  'Paneer Steam Momo': 'पनीर स्टीम मोमो',
  'Veg Pan-fry Momo': 'वेज पैन-फ्राई मोमो',
  'Paneer Pan-fry Momo': 'पनीर पैन-फ्राई मोमो',
  'Cheese Spaghetti Balls': 'चीज़ स्पेगेटी बॉल्स',
  'Chole Bhature': 'छोले भटूरे',
  'Pav Bhaji': 'पाव भाजी',
  'Bread Roll': 'ब्रेड रोल',
  'Chole Tikki Chaat': 'छोले टिक्की चाट',
  'Basket Chaat': 'बास्केट चाट',
  'Papdi Chaat': 'पापड़ी चाट',
  'Crutons Chaat': 'क्रूटॉन्स चाट',
  'Dahi Vada': 'दही वड़ा',
  'Dahi Gujia Vada': 'दही गुजिया वड़ा',
  'Kanji Vada': 'कांजी वड़ा',
  'Bread Dahi Vada': 'ब्रेड दही वड़ा',
  'Frankie Roll': 'फ्रैंकी रोल',
  'Paneer Roll': 'पनीर रोल',
  'Cheese Roll': 'चीज़ रोल',
  'Veg Pizza (Personal)': 'वेज पिज़्ज़ा (छोटा)',
  'Vada Pav': 'वड़ा पाव',
  Dabeli: 'दाबेली',
  'Butter Naan + Kaali Dal + Paneer Butter Masala': 'बटर नान + काली दाल + पनीर बटर मसाला',
  'Masala Kulcha + Kaali Dal + Paneer Butter Masala': 'मसाला कुलचा + काली दाल + पनीर बटर मसाला',
  'Palak Puri + Chole': 'पालक पूरी + छोले',
  'Daal Baati Churma': 'दाल बाटी चूरमा',
  'Gatta Pulaw + Kadhi': 'गट्टा पुलाव + कढ़ी',
  'Sattu Paratha + Chutney': 'सत्तू पराठा + चटनी',
  'Litti Chokha + Chutney': 'लिट्टी चोखा + चटनी',
  'Hara Mattar Kachori + Aloo Dum': 'हरा मटर कचौड़ी + आलू दम',
  'Radhabhalabhi + Aloo Dum': 'राधाबल्लभी + आलू दम',
  'Phulka Thali': 'फुलका थाली',
  'Rice Thali': 'चावल थाली',
  'Pooran Puri + Aloo Dum': 'पूरन पूरी + आलू दम',
  'Moong Daal Halwa': 'मूंग दाल हलवा',
  'Gajar Halwa': 'गाजर हलवा',
  'Badam Halwa': 'बादाम हलवा',
  'Pure Ghee Sattu Peda': 'शुद्ध घी सत्तू पेड़ा',
  'Pure Ghee Gond Sattu Peda': 'शुद्ध घी गोंद सत्तू पेड़ा',
  'Fruit Custard': 'फ्रूट कस्टर्ड',
  'Kheer (Payes)': 'खीर (पायेस)',
  'Gur Kheer (Payes)': 'गुड़ खीर (पायेस)',
  'Ras Malai': 'रस मलाई',
  'Masala suhali': 'मसाला सुहाली',
  'Cheese corn samosa': 'चीज़ कॉर्न समोसा',
};

export class MenuItemHindiName1794500000000 implements MigrationInterface {
  name = 'MenuItemHindiName1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "menu_items" ADD "name_hi" character varying(120)`);
    for (const [name, hindi] of Object.entries(HINDI)) {
      await queryRunner.query(`UPDATE "menu_items" SET "name_hi" = $1 WHERE "name" = $2 AND "name_hi" IS NULL`, [
        hindi,
        name,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "name_hi"`);
  }
}
