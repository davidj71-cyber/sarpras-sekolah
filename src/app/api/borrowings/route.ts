import { NextRequest, NextResponse } from "next/server";
import { ensureBorrowingSchema } from "@/lib/migrate-settings";
import { db } from "@/lib/db";

// ─── /api/borrowings — Berita Acara Peminjaman ───────────────────────────────
export async function GET() {
  try {
    await ensureBorrowingSchema();
    const borrowings = await db.borrowingEntry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        borrower: true,
        items: true,
        returnEntry: true,
      },
    });
    return NextResponse.json(borrowings);
  } catch (error) {
    console.error("Error fetching borrowings:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar peminjaman" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureBorrowingSchema();
    const body = await request.json();

    // Generate nomor BA otomatis jika kosong
    let baNumber = String(body.baNumber ?? "").trim();
    if (!baNumber) {
      const count = await db.borrowingEntry.count();
      baNumber = `${String(count + 1).padStart(3, "0")}/BA-PIN/${new Date().getFullYear()}`;
    }

    // Parse proofPhotos — JSON array of base64 data URLs
    let proofPhotos = "[]";
    if (Array.isArray(body.proofPhotos)) {
      proofPhotos = JSON.stringify(
        body.proofPhotos.filter((p: unknown) => typeof p === "string" && (p as string).startsWith("data:image/"))
      );
    }

    // ── Handle borrowerId: bisa dari Employee (source=pegawai) atau Borrower (source=eksternal) ──
    // Jika source=pegawai, borrowerId = Employee.id → perlu cari/create Borrower record
    // yang match dengan Employee tersebut (by name).
    let borrowerId = String(body.borrowerId);
    if (body.borrowerSource === "pegawai") {
      // Cari Borrower yang match dengan Employee by name
      const employee = await db.employee.findUnique({ where: { id: borrowerId } });
      if (employee) {
        const existingBorrower = await db.borrower.findFirst({
          where: { name: { equals: employee.name } },
        });
        if (existingBorrower) {
          borrowerId = existingBorrower.id;
        } else {
          // Create Borrower record untuk Employee ini
          const newBorrower = await db.borrower.create({
            data: {
              name: employee.name,
              nip: employee.nip || "",
              jabatan: employee.position || "",
              organization: employee.department || "",
              phone: employee.phone || "",
              address: employee.address || "",
              role: "Pegawai",
            },
          });
          borrowerId = newBorrower.id;
        }
      }
    } else {
      // Fallback: kalau borrowerId tidak ditemukan di Borrower table,
      // coba cari by name di borrowers list (mungkin dari merged list yang ID-nya Employee.id)
      const borrowerExists = await db.borrower.findUnique({ where: { id: borrowerId } });
      if (!borrowerExists) {
        // Mungkin borrowerId = Employee.id — coba cari employee & auto-create Borrower
        const employee = await db.employee.findUnique({ where: { id: borrowerId } });
        if (employee) {
          const existingBorrower = await db.borrower.findFirst({
            where: { name: { equals: employee.name } },
          });
          if (existingBorrower) {
            borrowerId = existingBorrower.id;
          } else {
            const newBorrower = await db.borrower.create({
              data: {
                name: employee.name,
                nip: employee.nip || "",
                jabatan: employee.position || "",
                organization: employee.department || "",
                phone: employee.phone || "",
                address: employee.address || "",
                role: "Pegawai",
              },
            });
            borrowerId = newBorrower.id;
          }
        }
      }
    }

    const borrowing = await db.borrowingEntry.create({
      data: {
        baNumber,
        borrowDate: body.borrowDate ? new Date(body.borrowDate) : new Date(),
        expectedReturnDate: body.expectedReturnDate ? new Date(body.expectedReturnDate) : null,
        borrowerId,
        purpose: String(body.purpose ?? "").trim(),
        notes: String(body.notes ?? "").trim(),
        status: "Dipinjam",
        lenderName: String(body.lenderName ?? "").trim(),
        lenderNip: String(body.lenderNip ?? "").trim(),
        proofPhotos,
        items: body.items
          ? {
              create: (body.items as Array<{
                itemName: string;
                registrationNumber?: string;
                quantity?: number;
                unit?: string;
                condition?: string;
                notes?: string;
              }>).map((item) => ({
                itemName: item.itemName,
                registrationNumber: item.registrationNumber ?? "",
                quantity: item.quantity ?? 1,
                unit: item.unit ?? "Unit",
                condition: item.condition ?? "Baik",
                notes: item.notes ?? "",
              })),
            }
          : undefined,
      },
      include: {
        borrower: true,
        items: true,
        returnEntry: true,
      },
    });

    return NextResponse.json(borrowing, { status: 201 });
  } catch (error) {
    console.error("Error creating borrowing:", error);
    return NextResponse.json({ error: "Gagal membuat berita acara peminjaman" }, { status: 500 });
  }
}
