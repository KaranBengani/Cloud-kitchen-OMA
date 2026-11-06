import { MigrationInterface, QueryRunner } from "typeorm";

export class WebOrdering1793906233486 implements MigrationInterface {
    name = 'WebOrdering1793906233486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "customer_addresses" ("id" SERIAL NOT NULL, "customer_id" integer NOT NULL, "label" character varying(10) NOT NULL DEFAULT 'home', "recipient_name" character varying(120), "recipient_phone" character varying(15), "address" text NOT NULL, "address_key" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_customer_addresses_label" CHECK ("label" IN ('home', 'office', 'family', 'other')), CONSTRAINT "PK_336bda7b0a0cd04241f719fc834" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_customer_addresses_key" ON "customer_addresses"  ("customer_id", "address_key") `);
        // Hand-written data steps (migration:generate only sees the schema). The key expression must match
        // addressKey() in customer-address.entity.ts: lower-case, runs of non-letters/digits → one space, trimmed.
        // 1. Each customer's saved address becomes their Home address.
        await queryRunner.query(`INSERT INTO "customer_addresses" ("customer_id", "label", "address", "address_key")
            SELECT "id", 'home', trim("address"), trim(regexp_replace(lower("address"), '[^[:alnum:]]+', ' ', 'g')) FROM "customers"
            WHERE "address" IS NOT NULL AND trim(regexp_replace(lower("address"), '[^[:alnum:]]+', ' ', 'g')) <> ''`);
        // 2. Addresses used on past delivery orders join the book too (latest use first), unless already there.
        await queryRunner.query(`INSERT INTO "customer_addresses" ("customer_id", "label", "address", "address_key")
            SELECT DISTINCT ON (o."customer_id", trim(regexp_replace(lower(o."address"), '[^[:alnum:]]+', ' ', 'g'))) o."customer_id", 'other', trim(o."address"), trim(regexp_replace(lower(o."address"), '[^[:alnum:]]+', ' ', 'g'))
            FROM "orders" o
            WHERE o."fulfilment" = 'parcel' AND o."address" IS NOT NULL AND trim(regexp_replace(lower(o."address"), '[^[:alnum:]]+', ' ', 'g')) <> ''
            ORDER BY o."customer_id", trim(regexp_replace(lower(o."address"), '[^[:alnum:]]+', ' ', 'g')), o."created_at" DESC
            ON CONFLICT ("customer_id", "address_key") DO NOTHING`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "address_id" integer`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "source" character varying(5) NOT NULL DEFAULT 'app'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "requested_name" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_source" CHECK ("source" IN ('app', 'web'))`);
        await queryRunner.query(`ALTER TABLE "customer_addresses" ADD CONSTRAINT "FK_6be4e1a698f5c3f2c2e4c75c186" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_d39c53244703b8534307adcd073" FOREIGN KEY ("address_id") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        // 3. Point past delivery orders at their address-book entry.
        await queryRunner.query(`UPDATE "orders" o SET "address_id" = a."id"
            FROM "customer_addresses" a
            WHERE o."fulfilment" = 'parcel' AND o."address" IS NOT NULL
              AND a."customer_id" = o."customer_id" AND a."address_key" = trim(regexp_replace(lower(o."address"), '[^[:alnum:]]+', ' ', 'g'))`);
        // Not detected by migration:generate: the wider status list (web requests) and the Dues index,
        // which now leaves out requests and declined orders.
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('requested', 'booked', 'ready', 'delivered', 'cancelled', 'declined'))`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_open_balance"`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_open_balance" ON "orders"  ("delivery_date", "id") WHERE ("status" IN ('booked', 'ready', 'delivered') AND "total_paise" > "paid_paise") OR ("status" = 'cancelled' AND "paid_paise" > 0)`);
    }

    // Down only works before any web request exists: requested/declined rows would break the old check.
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_open_balance"`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_open_balance" ON "orders"  ("delivery_date", "id") WHERE ("status" <> 'cancelled' AND "total_paise" > "paid_paise") OR ("status" = 'cancelled' AND "paid_paise" > 0)`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('booked', 'ready', 'delivered', 'cancelled'))`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_d39c53244703b8534307adcd073"`);
        await queryRunner.query(`ALTER TABLE "customer_addresses" DROP CONSTRAINT "FK_6be4e1a698f5c3f2c2e4c75c186"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_source"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "requested_name"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "source"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "address_id"`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "address" text`);
        // Best effort: each customer gets back their most recently used address.
        await queryRunner.query(`UPDATE "customers" c SET "address" = a."address"
            FROM (SELECT DISTINCT ON ("customer_id") "customer_id", "address" FROM "customer_addresses"
                  ORDER BY "customer_id", "updated_at" DESC) a
            WHERE a."customer_id" = c."id"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_customer_addresses_key"`);
        await queryRunner.query(`DROP TABLE "customer_addresses"`);
    }

}
