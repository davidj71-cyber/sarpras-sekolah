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
 *
 * PERFORMANCE: The result is cached at module level so subsequent calls
 * resolve instantly. The schema check only runs ONCE per cold start.
 */
let schoolSettingsSchemaPromise: Promise<string[]> | null = null;

export function ensureSchoolSettingsSchema(): Promise<string[]> {
  if (schoolSettingsSchemaPromise) return schoolSettingsSchemaPromise;
  schoolSettingsSchemaPromise = (async () => {
    try {
      return await doEnsureSchoolSettingsSchema();
    } catch (e) {
      // Reset on failure so the next request can retry.
      schoolSettingsSchemaPromise = null;
      throw e;
    }
  })();
  return schoolSettingsSchemaPromise;
}

async function doEnsureSchoolSettingsSchema(): Promise<string[]> {
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
 *
 * PERFORMANCE: The result is cached at module level so subsequent calls
 * resolve instantly. The schema check (~20 ALTER TABLE IF NOT EXISTS
 * queries on Postgres) only runs ONCE per cold start, not per request.
 * This eliminates 1-2s overhead on every API call after the first.
 */
let salaryMediaSchemaPromise: Promise<string[]> | null = null;

export function ensureSalaryMediaSchema(): Promise<string[]> {
  if (salaryMediaSchemaPromise) return salaryMediaSchemaPromise;
  salaryMediaSchemaPromise = (async () => {
    try {
      return await doEnsureSalaryMediaSchema();
    } catch (e) {
      // Reset on failure so the next request can retry.
      salaryMediaSchemaPromise = null;
      throw e;
    }
  })();
  return salaryMediaSchemaPromise;
}

async function doEnsureSalaryMediaSchema(): Promise<string[]> {
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
        "bankAccount" TEXT NOT NULL DEFAULT '',
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

  // ─── SalaryEntry: ADD COLUMN bankAccount (idempotent untuk tabel yang sudah ada) ──
  // Kolom `bankAccount` ditambahkan belakangan (sebelumnya tabel tidak punya).
  // ALTER TABLE ADD COLUMN IF NOT EXISTS aman dijalankan berulang.
  try {
    await db.$executeRaw`
      ALTER TABLE "SalaryEntry" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT NOT NULL DEFAULT ''
    `;
    executed.push(`ADD COLUMN "SalaryEntry.bankAccount"`);
  } catch (e) {
    // Beberapa DB lama mungkin tidak support IF NOT EXISTS — ignore error.
    console.warn("[migrate] ADD COLUMN bankAccount skipped:", e);
  }

  // ─── SalaryEntry: ADD COLUMN status & jabatan (pembeda kategori pegawai) ──
  // Kolom `status` (mis. GTTS/PTTS/PNS/PPPK) & `jabatan` (mis. GURU SEMENTARA)
  // dipakai sebagai pembeda data pegawai — TIDAK masuk format cetak gaji.
  // DDL idempoten; aman dijalankan berulang. Nama kolom hardcoded (bukan input
  // user), jadi $executeRawUnsafe aman dipakai di sini.
  for (const col of ["status", "jabatan"] as const) {
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "SalaryEntry" ADD COLUMN IF NOT EXISTS "${col}" TEXT NOT NULL DEFAULT ''`
      );
      executed.push(`ADD COLUMN "SalaryEntry.${col}"`);
    } catch (e) {
      console.warn(`[migrate] ADD COLUMN ${col} skipped:`, e);
    }
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

  // ─── MediaPayment ─────────────────────────────────────────────────────
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "MediaPayment" (
        "id" TEXT NOT NULL,
        "mediaId" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "month" INTEGER NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "notes" TEXT NOT NULL DEFAULT '',
        "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MediaPayment_pkey" PRIMARY KEY ("id")
      )
    `;
    executed.push(`CREATE TABLE IF NOT EXISTS "MediaPayment"`);
    try {
      await db.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "MediaPayment_mediaId_year_month_key" ON "MediaPayment"("mediaId", "year", "month")`;
      executed.push(`CREATE INDEX MediaPayment_unique`);
    } catch (e) {
      console.warn("[migrate] MediaPayment unique index skipped:", e);
    }
    try {
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS "MediaPayment_mediaId_idx" ON "MediaPayment"("mediaId")`;
    } catch (e) {
      console.warn("[migrate] MediaPayment mediaId index skipped:", e);
    }
  } catch (e) {
    console.error("[migrate] create MediaPayment failed:", e);
    throw e;
  }

  // ─── SalaryPayment ────────────────────────────────────────────────────
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SalaryPayment" (
        "id" TEXT NOT NULL,
        "salaryId" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "month" INTEGER NOT NULL,
        "lessonCount" INTEGER NOT NULL DEFAULT 0,
        "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "notes" TEXT NOT NULL DEFAULT '',
        "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "signaturePrinted" BOOLEAN NOT NULL DEFAULT false,
        "bankPrinted" BOOLEAN NOT NULL DEFAULT false,
        "fullyPaidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SalaryPayment_pkey" PRIMARY KEY ("id")
      )
    `;
    executed.push(`CREATE TABLE IF NOT EXISTS "SalaryPayment"`);
    try {
      await db.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "SalaryPayment_salaryId_year_month_key" ON "SalaryPayment"("salaryId", "year", "month")`;
      executed.push(`CREATE INDEX SalaryPayment_unique`);
    } catch (e) {
      console.warn("[migrate] SalaryPayment unique index skipped:", e);
    }
    try {
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS "SalaryPayment_salaryId_idx" ON "SalaryPayment"("salaryId")`;
    } catch (e) {
      console.warn("[migrate] SalaryPayment salaryId index skipped:", e);
    }
  } catch (e) {
    console.error("[migrate] create SalaryPayment failed:", e);
    throw e;
  }

  // ─── SalaryPayment: ADD COLUMN signaturePrinted, bankPrinted, fullyPaidAt ──
  // Tracking cetak per mode: auto-record (fullyPaidAt) ter-set saat kedua
  // laporan (Tanda Tangan Guru + Bank) sudah tercetak untuk bulan tersebut.
  const salaryPaymentNewCols: Array<{ name: string; ddl: string }> = [
    { name: "signaturePrinted", ddl: `BOOLEAN NOT NULL DEFAULT false` },
    { name: "bankPrinted", ddl: `BOOLEAN NOT NULL DEFAULT false` },
    { name: "fullyPaidAt", ddl: `TIMESTAMP(3)` },
  ];
  for (const col of salaryPaymentNewCols) {
    if (isSqlite()) {
      const exists = await columnExistsSqlite("SalaryPayment", col.name);
      if (exists) continue;
      try {
        await db.$executeRawUnsafe(
          `ALTER TABLE "SalaryPayment" ADD COLUMN "${col.name}" ${col.ddl}`
        );
        executed.push(`ADD COLUMN "SalaryPayment.${col.name}"`);
      } catch (e) {
        console.warn(`[migrate] sqlite add SalaryPayment.${col.name} skipped:`, e);
      }
    } else {
      try {
        await db.$executeRawUnsafe(
          `ALTER TABLE "SalaryPayment" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.ddl}`
        );
        executed.push(`ADD COLUMN IF NOT EXISTS "SalaryPayment.${col.name}"`);
      } catch (e) {
        console.error(`[migrate] add SalaryPayment.${col.name} failed:`, e);
      }
    }
  }

  // ─── Migrate data lama: anggap record existing sudah lengkap ──
  // Record lama (sebelum fitur tracking) memiliki signaturePrinted=false &
  // bankPrinted=false (default). Agar tidak mengunci data yang sudah berjalan,
  // set kedua flag=true dan fullyPaidAt=paidAt untuk record yang belum di-migrate.
  try {
    if (isSqlite()) {
      await db.$executeRawUnsafe(
        `UPDATE "SalaryPayment" SET "signaturePrinted" = 1, "bankPrinted" = 1, "fullyPaidAt" = "paidAt" WHERE "fullyPaidAt" IS NULL AND "paidAt" IS NOT NULL`
      );
    } else {
      await db.$executeRawUnsafe(
        `UPDATE "SalaryPayment" SET "signaturePrinted" = true, "bankPrinted" = true, "fullyPaidAt" = "paidAt" WHERE "fullyPaidAt" IS NULL AND "paidAt" IS NOT NULL`
      );
    }
    executed.push(`MIGRATE legacy SalaryPayment → fullyPaidAt=paidAt`);
  } catch (e) {
    console.warn("[migrate] legacy SalaryPayment migration skipped:", e);
  }

  // ─── OrderItem: ADD COLUMN photos (JSON array of base64 data URLs) ──
  // Foto bukti pesanan per item. Disimpan sebagai JSON string '[]' default.
  // Idempoten — aman dijalankan berulang.
  try {
    if (isSqlite()) {
      const exists = await columnExistsSqlite("OrderItem", "photos");
      if (!exists) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "OrderItem" ADD COLUMN "photos" TEXT NOT NULL DEFAULT '[]'`
        );
        executed.push(`ADD COLUMN "OrderItem.photos" (sqlite)`);
      }
    } else {
      await db.$executeRawUnsafe(
        `ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "photos" TEXT NOT NULL DEFAULT '[]'`
      );
      executed.push(`ADD COLUMN IF NOT EXISTS "OrderItem.photos"`);
    }
  } catch (e) {
    console.warn("[migrate] ADD COLUMN OrderItem.photos skipped:", e);
  }

  return executed;
}
