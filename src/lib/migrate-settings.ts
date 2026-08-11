import { db } from "@/lib/db";

/**
 * Ensure the `SchoolSettings` table has every column the current Prisma
 * schema expects.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The sandbox dev DB and the production (Neon / Vercel Postgres) DB can
 * drift out of sync when new columns are added to `schema.prisma` but no
 * explicit migration is run against production. Prisma's generated client
 * then issues queries that reference columns the production DB doesn't
 * have yet, which surfaces as a 500 on `/api/settings`.
 *
 * WHAT IT DOES
 * ────────────
 * Runs a series of idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
 * statements (PostgreSQL syntax) so calling this repeatedly is safe.
 * Only the columns that are missing are added; existing data is never
 * touched.
 *
 * Returns the list of statements that were executed.
 */
export async function ensureSchoolSettingsSchema(): Promise<string[]> {
  const executed: string[] = [];

  // Column name → DDL fragment (type + default). Mirrors schema.prisma.
  const columns: Array<{ name: string; ddl: string }> = [
    { name: "id", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "schoolName", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "logo", ddl: `TEXT` },
    { name: "appLogo", ddl: `TEXT` },
    { name: "favicon", ddl: `TEXT` },
    { name: "logoWidth", ddl: `DOUBLE PRECISION NOT NULL DEFAULT 3.0` },
    { name: "logoHeight", ddl: `DOUBLE PRECISION NOT NULL DEFAULT 3.0` },
    { name: "fontFamily", ddl: `TEXT NOT NULL DEFAULT 'Times New Roman'` },
    { name: "fontSize", ddl: `INTEGER NOT NULL DEFAULT 14` },
    { name: "isBold", ddl: `BOOLEAN NOT NULL DEFAULT FALSE` },
    { name: "textTransform", ddl: `TEXT NOT NULL DEFAULT 'none'` },
    { name: "underlineThickness", ddl: `DOUBLE PRECISION NOT NULL DEFAULT 1.0` },
    { name: "underlineWidth", ddl: `DOUBLE PRECISION NOT NULL DEFAULT 100.0` },
    { name: "address", ddl: `TEXT` },
    { name: "phone", ddl: `TEXT` },
    { name: "email", ddl: `TEXT` },
    { name: "npsn", ddl: `TEXT` },
    { name: "schoolCode", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "letterUnitCode", ddl: `TEXT NOT NULL DEFAULT 'TU'` },
    { name: "kopLines", ddl: `TEXT NOT NULL DEFAULT '[]'` },
    { name: "principalName", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "principalNip", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "treasurerName", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "treasurerNip", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "goodsManagerName", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "goodsManagerNip", ddl: `TEXT NOT NULL DEFAULT ''` },
    { name: "createdAt", ddl: `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` },
    { name: "updatedAt", ddl: `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` },
  ];

  // 1. Make sure the table itself exists (covers fresh Neon DBs).
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SchoolSettings" (
        "id" TEXT NOT NULL,
        CONSTRAINT "SchoolSettings_pkey" PRIMARY KEY ("id")
      )
    `;
    executed.push(`CREATE TABLE IF NOT EXISTS "SchoolSettings"`);
  } catch (e) {
    // SQLite (sandbox) doesn't support IF NOT EXISTS the same way; ignore
    // errors there — the table already exists in the sandbox DB.
    if (!isSqlite()) {
      console.error("[migrate] create table failed:", e);
      throw e;
    }
  }

  // 2. Add every missing column.
  for (const col of columns) {
    if (isSqlite()) {
      // SQLite has no IF NOT EXISTS for ADD COLUMN; check first.
      const exists = await columnExistsSqlite("SchoolSettings", col.name);
      if (exists) continue;
      try {
        await db.$executeRawUnsafe(
          `ALTER TABLE "SchoolSettings" ADD COLUMN "${col.name}" ${col.ddl}`
        );
        executed.push(`ADD COLUMN "${col.name}"`);
      } catch (e) {
        // If two requests race, the second will error — ignore.
        console.warn(`[migrate] sqlite add ${col.name} skipped:`, e);
      }
    } else {
      // PostgreSQL — supports IF NOT EXISTS natively.
      try {
        await db.$executeRawUnsafe(
          `ALTER TABLE "SchoolSettings" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.ddl}`
        );
        executed.push(`ADD COLUMN IF NOT EXISTS "${col.name}"`);
      } catch (e) {
        console.error(`[migrate] add ${col.name} failed:`, e);
        throw e;
      }
    }
  }

  return executed;
}

/**
 * Detect whether the active Prisma client is talking to SQLite.
 * Used to branch between PG and SQLite DDL syntax.
 */
function isSqlite(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("file:");
}

async function columnExistsSqlite(table: string, column: string): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM pragma_table_info('${table.replace(/'/g, "''")}') WHERE name = ?`,
    column
  );
  return rows.length > 0;
}

/**
 * Wraps a Prisma call. If it fails with a "column does not exist" style
 * error, runs `ensureSchoolSettingsSchema()` once and retries.
 *
 * Use this around every `db.schoolSettings.*` call so the app self-heals
 * after the first request following a deploy that adds new columns.
 */
export async function withSchemaHeal<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isSchemaError =
      /column .* does not exist/i.test(msg) ||
      /no such column/i.test(msg) ||
      /relation .* does not exist/i.test(msg) ||
      /unknown column/i.test(msg) ||
      /no such table/i.test(msg);

    if (!isSchemaError) throw err;

    console.warn("[migrate] schema error detected, running self-heal:", msg);
    await ensureSchoolSettingsSchema();
    await ensureSalaryMediaSchema();
    return op();
  }
}

/**
 * Ensure the `SalaryEntry` and `MediaEntry` tables exist in the production
 * DB (Neon Postgres). These tables were added to schema.prisma for the
 * Gaji & Media features; without this self-heal, the first request after
 * deploy returns 500 because Prisma queries reference tables that don't
 * exist yet in production.
 *
 * Idempotent — safe to call on every request. On SQLite (sandbox) the
 * tables already exist from `prisma db push`, so this is a no-op there.
 */
export async function ensureSalaryMediaSchema(): Promise<string[]> {
  const executed: string[] = [];

  if (isSqlite()) {
    // Sandbox DB already has these tables from `prisma db push`.
    return executed;
  }

  // ─── SalaryEntry ────────────────────────────────────────────────────────
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SalaryEntry" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "nip" TEXT NOT NULL DEFAULT '',
        "gender" TEXT NOT NULL DEFAULT 'L',
        "lessonCount" INTEGER NOT NULL DEFAULT 0,
        "unit" TEXT NOT NULL DEFAULT 'Jam',
        "pricePerLesson" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "period" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SalaryEntry_pkey" PRIMARY KEY ("id")
      )
    `;
    executed.push(`CREATE TABLE IF NOT EXISTS "SalaryEntry"`);
  } catch (e) {
    console.error("[migrate] create SalaryEntry failed:", e);
    throw e;
  }

  // ─── MediaEntry ────────────────────────────────────────────────────────
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "MediaEntry" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "mediaName" TEXT NOT NULL,
        "paymentType" TEXT NOT NULL DEFAULT 'Tunai',
        "pricePerMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "unitCount" INTEGER NOT NULL DEFAULT 1,
        "totalReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "period" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MediaEntry_pkey" PRIMARY KEY ("id")
      )
    `;
    executed.push(`CREATE TABLE IF NOT EXISTS "MediaEntry"`);
  } catch (e) {
    console.error("[migrate] create MediaEntry failed:", e);
    throw e;
  }

  return executed;
}
