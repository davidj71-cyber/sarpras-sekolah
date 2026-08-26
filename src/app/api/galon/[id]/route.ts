import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── /api/galon/[id] — Single GalonEntry operations ──────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await db.galonEntry.findUnique({
      where: { id },
      include: { store: { select: { id: true, name: true } } },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Data galon tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error fetching galon entry:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data galon" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const emptyCount = Number(body.emptyCount) || 0;
    const filledCount = Number(body.filledCount) || 0;

    const paymentMethod = String(body.paymentMethod ?? "Cash").trim() === "Bon" ? "Bon" : "Cash";
    const paymentStatus = paymentMethod === "Cash"
      ? "LUNAS"
      : String(body.paymentStatus ?? "BELUM_BAYAR").trim();

    const receivedDateRaw = body.receivedDate ? new Date(body.receivedDate) : new Date();
    if (isNaN(receivedDateRaw.getTime())) {
      return NextResponse.json(
        { error: "Tanggal terima tidak valid" },
        { status: 400 }
      );
    }

    let paidAt: Date | null = null;
    if (paymentMethod === "Cash") {
      paidAt = receivedDateRaw;
    } else if (body.paidAt) {
      const d = new Date(body.paidAt);
      if (!isNaN(d.getTime())) paidAt = d;
    }

    const storeId = body.storeId ? String(body.storeId) : null;
    let storeName = String(body.storeName ?? "").trim();
    if (storeId && !storeName) {
      const store = await db.store.findUnique({ where: { id: storeId }, select: { name: true } });
      if (store) storeName = store.name;
    }

    const entry = await db.galonEntry.update({
      where: { id },
      data: {
        emptyCount,
        filledCount,
        storeId: storeId || null,
        storeName,
        courier: String(body.courier ?? "").trim(),
        recipient: String(body.recipient ?? "").trim(),
        receivedDate: receivedDateRaw,
        paymentMethod,
        paymentStatus,
        paidAt,
        notes: String(body.notes ?? "").trim(),
      },
      include: { store: { select: { id: true, name: true } } },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error updating galon entry:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data galon" },
      { status: 500 }
    );
  }
}

// ── PATCH: Tandai Bon sebagai sudah dibayar (set paidAt + paymentStatus=LUNAS) ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Jika body.paidAt diberikan, pakai; kalau null/undefined, default = hari ini.
    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    if (isNaN(paidAt.getTime())) {
      return NextResponse.json(
        { error: "Tanggal bayar tidak valid" },
        { status: 400 }
      );
    }

    const entry = await db.galonEntry.update({
      where: { id },
      data: {
        paymentStatus: "LUNAS",
        paidAt,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error marking galon as paid:", error);
    return NextResponse.json(
      { error: "Gagal menandai galon sebagai lunas" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.galonEntry.delete({ where: { id } });

    return NextResponse.json({ message: "Data galon berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting galon entry:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data galon" },
      { status: 500 }
    );
  }
}
