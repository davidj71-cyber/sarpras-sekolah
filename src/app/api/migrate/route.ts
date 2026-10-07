import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSchoolSettingsSchema } from "@/lib/migrate-settings";

/**
 * POST /api/migrate
 * ─────────────────
 * Creates any missing tables in the production database (Neon PostgreSQL).
 * Safe to call repeatedly — uses CREATE TABLE IF NOT EXISTS.
 *
 * This is needed because `prisma db push` in the build script may not run
 * properly on Vercel (build env vars, connection issues, etc), leaving
 * new tables (BankAccount, PrintLog) uncreated.
 *
 * Call this once after every deploy that adds new tables.
 */
export async function POST() {
  const results: Array<{ table: string; status: string; error?: string }> = [];

  // 1. SchoolSettings schema-heal (columns) — skipped in production, but
  //    the CREATE TABLE IF NOT EXISTS below handles table creation.
  try {
    await ensureSchoolSettingsSchema();
    results.push({ table: "SchoolSettings", status: "ok" });
  } catch (error) {
    results.push({
      table: "SchoolSettings",
      status: "error",
      error: error instanceof Error ? error.message.slice(0, 200) : String(error),
    });
  }

  // 2. Create missing tables (CREATE TABLE IF NOT EXISTS — safe, idempotent)
  //    Using raw SQL because Prisma's db push may not have run during build.
  const tablesToEnsure = [
    {
      name: "BankAccount",
      ddl: `CREATE TABLE IF NOT EXISTS "BankAccount" (
        "id" TEXT NOT NULL,
        "accountNumber" TEXT NOT NULL,
        "accountName" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL DEFAULT '',
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
      )`,
    },
    {
      name: "PrintLog",
      ddl: `CREATE TABLE IF NOT EXISTS "PrintLog" (
        "id" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "printDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "periodLabel" TEXT NOT NULL DEFAULT '',
        "letterNumber" TEXT NOT NULL DEFAULT '',
        "bankName" TEXT NOT NULL DEFAULT '',
        "printMode" TEXT NOT NULL DEFAULT '',
        "title" TEXT NOT NULL DEFAULT '',
        "contentHtml" TEXT NOT NULL,
        "orientation" TEXT NOT NULL DEFAULT 'portrait',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PrintLog_pkey" PRIMARY KEY ("id")
      )`,
    },
    {
      name: "User",
      ddl: `CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL DEFAULT '',
        "username" TEXT NOT NULL,
        "password" TEXT NOT NULL DEFAULT '',
        "role" TEXT NOT NULL DEFAULT 'staff',
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "User_username_key" UNIQUE ("username")
      )`,
    },
  ];

  for (const { name, ddl } of tablesToEnsure) {
    try {
      await db.$executeRawUnsafe(ddl);
      results.push({ table: name, status: "ok" });
    } catch (error) {
      results.push({
        table: name,
        status: "error",
        error: error instanceof Error ? error.message.slice(0, 200) : String(error),
      });
    }
  }

  // 3. Auto-seed admin user if not exists
  try {
    const existingAdmin = await db.user.findUnique({ where: { username: 'admin' } });
    if (!existingAdmin) {
      await db.user.create({
        data: {
          name: 'Administrator',
          username: 'admin',
          password: '1sampai0',
          role: 'admin',
          active: true,
        },
      });
      results.push({ table: "User (seed admin)", status: "created" });
    } else {
      results.push({ table: "User (seed admin)", status: "exists" });
    }
  } catch (error) {
    results.push({
      table: "User (seed admin)",
      status: "error",
      error: error instanceof Error ? error.message.slice(0, 200) : String(error),
    });
  }

  const hasErrors = results.some((r) => r.status === "error");
  return NextResponse.json(
    {
      ok: !hasErrors,
      results,
      message: hasErrors
        ? "Migration completed with some errors. Check results."
        : "Migration completed successfully. All tables ensured.",
    },
    { status: hasErrors ? 500 : 200 }
  );
}

export async function GET() {
  // Same as POST but easier to trigger from a browser address bar.
  return POST();
}
