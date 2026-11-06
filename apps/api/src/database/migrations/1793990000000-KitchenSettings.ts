import { MigrationInterface, QueryRunner } from "typeorm";

export class KitchenSettings1793990000000 implements MigrationInterface {
    name = 'KitchenSettings1793990000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "kitchen_settings" ("id" smallint NOT NULL DEFAULT '1', "online_ordering" boolean NOT NULL DEFAULT false, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_kitchen_settings_single_row" CHECK ("id" = 1), CONSTRAINT "PK_kitchen_settings" PRIMARY KEY ("id"))`);
        // The one settings row. Online ordering starts off: the family turns it on from the app when ready.
        await queryRunner.query(`INSERT INTO "kitchen_settings" ("id") VALUES (1)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "kitchen_settings"`);
    }

}
