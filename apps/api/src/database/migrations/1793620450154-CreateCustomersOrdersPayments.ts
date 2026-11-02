import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomersOrdersPayments1793620450154 implements MigrationInterface {
    name = 'CreateCustomersOrdersPayments1793620450154'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "customers" ("id" SERIAL NOT NULL, "name" character varying(120) NOT NULL, "phone" character varying(15), "address" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_customers_phone" ON "customers"  ("phone") WHERE "phone" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "amount_paise" integer NOT NULL, "mode" character varying(12) NOT NULL, "paid_on" date NOT NULL, "is_advance" boolean NOT NULL DEFAULT false, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_payments_amount" CHECK ("amount_paise" <> 0), CONSTRAINT "CHK_payments_mode" CHECK ("mode" IN ('cash', 'upi_papa', 'upi_mummy')), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_order_id" ON "payments"  ("order_id") `);
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "customer_id" integer NOT NULL, "delivery_date" date NOT NULL, "delivery_time" TIME, "fulfilment" character varying(10) NOT NULL DEFAULT 'pickup', "address" text, "notes" text, "status" character varying(12) NOT NULL DEFAULT 'booked', "total_paise" integer NOT NULL, "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_orders_total" CHECK ("total_paise" >= 0), CONSTRAINT "CHK_orders_fulfilment" CHECK ("fulfilment" IN ('pickup', 'parcel')), CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('booked', 'ready', 'delivered', 'cancelled')), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_customer_id" ON "orders"  ("customer_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_delivery_date" ON "orders"  ("delivery_date") `);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "menu_item_id" integer, "name" character varying(120) NOT NULL, "unit" character varying(10) NOT NULL, "qty" numeric(10,3) NOT NULL, "menu_price_paise" integer NOT NULL, "unit_price_paise" integer NOT NULL, "line_total_paise" integer NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "CHK_order_items_prices" CHECK ("menu_price_paise" >= 0 AND "unit_price_paise" >= 0 AND "line_total_paise" >= 0), CONSTRAINT "CHK_order_items_qty" CHECK ("qty" > 0), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_order_items_order_id" ON "order_items"  ("order_id") `);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_e462517174f561ece2916701c0a" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_e462517174f561ece2916701c0a"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_b2f7b823a21562eeca20e72b006"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_items_order_id"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_delivery_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_customer_id"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_payments_order_id"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_customers_phone"`);
        await queryRunner.query(`DROP TABLE "customers"`);
    }

}
