import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMenuItems1793612684931 implements MigrationInterface {
    name = 'CreateMenuItems1793612684931'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "menu_items" ("id" SERIAL NOT NULL, "name" character varying(120) NOT NULL, "category" character varying(60) NOT NULL, "unit" character varying(10) NOT NULL, "price_paise" integer NOT NULL, "min_qty" numeric(10,3), "description" character varying(120), "is_available" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_menu_items_min_qty" CHECK ("min_qty" IS NULL OR "min_qty" > 0), CONSTRAINT "CHK_menu_items_unit" CHECK ("unit" IN ('kg', 'pc', 'plate', 'bowl', 'roll', 'pizza')), CONSTRAINT "CHK_menu_items_price" CHECK ("price_paise" >= 0), CONSTRAINT "PK_57e6188f929e5dc6919168620c8" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "menu_items"`);
    }

}
