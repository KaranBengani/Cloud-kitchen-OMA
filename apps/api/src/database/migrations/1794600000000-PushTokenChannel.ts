import { MigrationInterface, QueryRunner } from 'typeorm';

// Which Android notification channel each phone has: app 1.2.0 adds 'new-orders' with the custom order sound.
export class PushTokenChannel1794600000000 implements MigrationInterface {
  name = 'PushTokenChannel1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "push_tokens" ADD "channel_id" character varying(40) NOT NULL DEFAULT 'orders'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "push_tokens" DROP COLUMN "channel_id"`);
  }
}
