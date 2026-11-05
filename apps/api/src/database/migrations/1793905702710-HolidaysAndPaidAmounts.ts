import { MigrationInterface, QueryRunner } from "typeorm";

export class HolidaysAndPaidAmounts1793905702710 implements MigrationInterface {
    name = 'HolidaysAndPaidAmounts1793905702710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "kitchen_holidays" ("id" SERIAL NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "note" character varying(80), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_kitchen_holidays_range" CHECK ("end_date" >= "start_date"), CONSTRAINT "PK_695e671e62cc3ee7ef1f88e1410" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_kitchen_holidays_end_date" ON "kitchen_holidays"  ("end_date") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paid_paise" integer NOT NULL DEFAULT '0'`);
        // Backfill from existing payments. Hand-written: migration:generate only knows the schema, not the data.
        await queryRunner.query(`UPDATE "orders" o SET "paid_paise" = p.paid
            FROM (SELECT "order_id", SUM("amount_paise")::int AS paid FROM "payments" GROUP BY "order_id") p
            WHERE p."order_id" = o."id"`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_open_balance" ON "orders"  ("delivery_date", "id") WHERE ("status" <> 'cancelled' AND "total_paise" > "paid_paise") OR ("status" = 'cancelled' AND "paid_paise" > 0)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_open_balance"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paid_paise"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_kitchen_holidays_end_date"`);
        await queryRunner.query(`DROP TABLE "kitchen_holidays"`);
    }

}
