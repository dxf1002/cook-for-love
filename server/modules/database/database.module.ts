import {
  Global,
  Module,
  OnModuleInit,
  Logger,
  Inject,
  InjectionToken,
} from '@nestjs/common';
import {
  drizzle,
  type BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { randomUUID } from 'crypto';

import * as schema from '@server/database/schema.sqlite';
import { SEED_DISHES, getDishImageUrl } from '@server/database/seed-dishes';

/**
 * Injection token for the application-wide Drizzle database instance.
 *
 * Use `@Inject(DATABASE)` in services that need database access.  The injected
 * value is a Drizzle database bound to the SQLite schema defined in
 * `server/database/schema.sqlite.ts`.
 */
export const DATABASE: InjectionToken = 'DATABASE';

/** Type alias for the SQLite Drizzle instance used throughout the app. */
export type AppDatabase = BetterSQLite3Database<typeof schema>;

/**
 * Global database module.
 *
 * Creates and configures a local SQLite database (default) or falls back to
 * PostgreSQL when `DB_TYPE=postgres` is set.  Tables are created on startup
 * using `CREATE TABLE IF NOT EXISTS` and the `dish` table is seeded with 26
 * sample dishes if it is empty.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => {
        const dbType: string = process.env.DB_TYPE || 'sqlite';

        if (dbType === 'postgres') {
          // PostgreSQL path would use the platform-injected DRIZZLE_DATABASE
          // via useExisting.  Not implemented in this iteration — SQLite is
          // the primary target.
          throw new Error(
            'PostgreSQL mode is not implemented in this build. ' +
              'Remove DB_TYPE or set DB_TYPE=sqlite to use the local database.',
          );
        }

        // ── SQLite ────────────────────────────────────────────
        const dbPath: string = resolve(
          process.cwd(),
          process.env.DB_PATH || './data/app.db',
        );
        const dir: string = dirname(dbPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const sqlite = new Database(dbPath);
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');

        const db: AppDatabase = drizzle(sqlite, { schema });
        return db;
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async onModuleInit(): Promise<void> {
    const dbType: string = process.env.DB_TYPE || 'sqlite';
    if (dbType !== 'sqlite') {
      this.logger.log(`Using database type: ${dbType} (skipping SQLite setup)`);
      return;
    }

    this.logger.log('Initializing SQLite database...');
    this.createTablesIfNeeded();
    await this.seedDishesIfNeeded();
    this.logger.log('SQLite database ready.');
  }

  // ── private helpers ──────────────────────────────────────────────────

  private createTablesIfNeeded(): void {
    const sqlite = (this.db as unknown as { $client: Database.Database })
      .$client;

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "dish" (
        "id" text PRIMARY KEY NOT NULL,
        "dish_id" integer NOT NULL,
        "name" text(100) NOT NULL,
        "category" text(50) NOT NULL,
        "tags" text NOT NULL DEFAULT '[]',
        "difficulty" text(20) NOT NULL,
        "time" text(20) NOT NULL,
        "description" text NOT NULL,
        "ingredients" text NOT NULL DEFAULT '[]',
        "amounts" text NOT NULL DEFAULT '[]',
        "steps" text NOT NULL DEFAULT '[]',
        "tips" text NOT NULL,
        "image_url" text NOT NULL,
        "color" text(20) NOT NULL DEFAULT '#FF8A7A',
        "_created_at" text NOT NULL,
        "_created_by" text,
        "_updated_at" text NOT NULL,
        "_updated_by" text
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "dish_dish_id_key" ON "dish" ("dish_id");
    `);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "cart_item" (
        "id" text PRIMARY KEY NOT NULL,
        "device_id" text(100) NOT NULL,
        "dish_id" integer NOT NULL,
        "_created_at" text NOT NULL,
        "_created_by" text,
        "_updated_at" text NOT NULL,
        "_updated_by" text
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "idx_cart_device_dish"
        ON "cart_item" ("device_id", "dish_id");
    `);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "favorite" (
        "id" text PRIMARY KEY NOT NULL,
        "device_id" text(100) NOT NULL,
        "dish_id" integer NOT NULL,
        "_created_at" text NOT NULL,
        "_created_by" text,
        "_updated_at" text NOT NULL,
        "_updated_by" text
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "idx_fav_device_dish"
        ON "favorite" ("device_id", "dish_id");
    `);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "guest_user" (
        "id" text PRIMARY KEY NOT NULL,
        "device_id" text(100) NOT NULL,
        "_created_at" text NOT NULL,
        "_created_by" text,
        "_updated_at" text NOT NULL,
        "_updated_by" text
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "guest_user_device_id_key"
        ON "guest_user" ("device_id");
    `);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "saved_menu" (
        "id" text PRIMARY KEY NOT NULL,
        "device_id" text(100) NOT NULL,
        "name" text(100) NOT NULL,
        "_created_at" text NOT NULL,
        "_created_by" text,
        "_updated_at" text NOT NULL,
        "_updated_by" text
      );

      CREATE INDEX IF NOT EXISTS "idx_saved_menu_device"
        ON "saved_menu" ("device_id");
    `);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "saved_menu_item" (
        "id" text PRIMARY KEY NOT NULL,
        "menu_id" text NOT NULL,
        "dish_id" integer NOT NULL,
        "name" text(100) NOT NULL,
        "category" text(50) NOT NULL,
        "color" text(20) NOT NULL DEFAULT '#FF8A7A',
        "image_url" text NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        "_created_at" text NOT NULL,
        "_created_by" text,
        "_updated_at" text NOT NULL,
        "_updated_by" text
      );

      CREATE INDEX IF NOT EXISTS "idx_saved_menu_item_menu"
        ON "saved_menu_item" ("menu_id");
    `);

    this.logger.log('Tables created/verified.');
  }

  private async seedDishesIfNeeded(): Promise<void> {
    const row = (this.db as AppDatabase)
      .select({ count: schema.dish.id })
      .from(schema.dish)
      .limit(1)
      .get();

    if (row) {
      this.logger.log('Dish table already has data — skipping seed.');
      return;
    }

    this.logger.log(`Seeding ${SEED_DISHES.length} dishes...`);
    const now: string = new Date().toISOString();

    for (const seedDish of SEED_DISHES) {
      (this.db as AppDatabase)
        .insert(schema.dish)
        .values({
          id: randomUUID(),
          dishId: seedDish.dishId,
          name: seedDish.name,
          category: seedDish.category,
          tags: seedDish.tags,
          difficulty: seedDish.difficulty,
          time: seedDish.time,
          description: seedDish.description,
          ingredients: seedDish.ingredients,
          amounts: seedDish.amounts,
          steps: seedDish.steps,
          tips: seedDish.tips,
          imageUrl: getDishImageUrl(seedDish.dishId),
          color: seedDish.color,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    this.logger.log(`Seeded ${SEED_DISHES.length} dishes successfully.`);
  }
}
