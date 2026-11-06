import { MigrationInterface, QueryRunner } from "typeorm";

export class PushTokens1793995000000 implements MigrationInterface {
    name = 'PushTokens1793995000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "push_tokens" ("token" character varying(200) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_push_tokens" PRIMARY KEY ("token"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "push_tokens"`);
    }

}
