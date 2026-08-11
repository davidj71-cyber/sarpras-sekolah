import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

export async function GET() {
  try {
    // Self-heal: create tables in Neon production if missing (idempotent).
    await ensureSalaryMediaSchema();

    const entries = await db.mediaEntry.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching media entries:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar media" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Self-heal before write as well, so the first POST doesn't 500.
    await ensureSalaryMediaSchema();

    const body = await request.json();

    const unitCount = Number(body.unitCount) || 0;
    const pricePerMonth = Number(body.pricePerMonth) || 0;
    const totalReceived = unitCount * pricePerMonth;

    const entry = await db.mediaEntry.create({
      data: {
        name: String(body.name ?? "").trim(),
        mediaName: String(body.mediaName ?? "").trim(),
        paymentType: String(body.paymentType ?? "Tunai").trim(),
        pricePerMonth,
        unitCount,
        totalReceived,
        period: String(body.period ?? "").trim(),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating media entry:", error);
    return NextResponse.json(
      { error: "Gagal membuat data media" },
      { status: 500 }
    );
  }
}
