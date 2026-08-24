import { NextResponse } from "next/server";
import { ensureSchoolSettingsSchema } from "@/lib/migrate-settings";

/**
 * POST /api/migrate
 * ─────────────────
 * Runs idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for every
 * SchoolSettings column the current Prisma schema expects.
 *
 * Call this once after every deploy that adds new settings columns.
 * Safe to call repeatedly — only missing columns are added.
 *
 * Auth: none (the endpoint only ever adds columns that already exist in
 * the schema, so it cannot destroy data). For a real production app you
 * might want to gate this behind an admin token, but for this internal
 * school inventory tool the convenience is worth it.
 */
export async function POST() {
  try {
    const executed = await ensureSchoolSettingsSchema();
    return NextResponse.json({
      ok: true,
      message: `Schema synchronized. ${executed.length} statement(s) executed.`,
      executed,
    });
  } catch (error) {
    console.error("[/api/migrate] failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Same as POST but easier to trigger from a browser address bar — useful
  // when the user just wants to paste a URL once after a deploy.
  return POST();
}
