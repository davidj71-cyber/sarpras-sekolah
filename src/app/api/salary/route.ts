import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

export async function GET() {
  try {
    // Self-heal: create tables in Neon production if missing (idempotent).
    await ensureSalaryMediaSchema();

    const entries = await db.salaryEntry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching salary entries:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar gaji" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Self-heal before write as well, so the first POST doesn't 500.
    await ensureSalaryMediaSchema();

    const body = await request.json();

    const lessonCount = Number(body.lessonCount) || 0;
    const pricePerLesson = Number(body.pricePerLesson) || 0;
    const totalReceived = lessonCount * pricePerLesson;

    const entry = await db.salaryEntry.create({
      data: {
        name: String(body.name ?? "").trim(),
        nip: String(body.nip ?? "").trim(),
        bankAccount: String(body.bankAccount ?? "").trim(),
        gender: String(body.gender ?? "L").trim(),
        lessonCount,
        unit: String(body.unit ?? "Jam").trim(),
        pricePerLesson,
        totalReceived,
        period: String(body.period ?? "").trim(),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating salary entry:", error);
    return NextResponse.json(
      { error: "Gagal membuat data gaji" },
      { status: 500 }
    );
  }
}
