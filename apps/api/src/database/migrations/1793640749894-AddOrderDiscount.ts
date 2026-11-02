import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderDiscount1793640749894 implements MigrationInterface {
    name = 'AddOrderDiscount1793640749894'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "discount_paise" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_discount" CHECK ("discount_paise" >= 0)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_discount"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "discount_paise"`);
    }

}
