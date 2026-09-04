import { NextRequest, NextResponse } from "next/server";
import { ensureBorrowingSchema } from "@/lib/migrate-settings";
import { db } from "@/lib/db";

// ─── /api/borrowers/all — merged list of Employees + external Borrowers ──────
// Returns a unified list for the BA Peminjaman dropdown.
// Employees are treated as internal borrowers (source = "pegawai").
// External borrowers from Borrower table (source = "eksternal").
export async function GET() {
  try {
    await ensureBorrowingSchema();

    // Fetch all employees
    const employees = await db.employee.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nip: true,
        position: true,
        department: true,
        phone: true,
        address: true,
      },
    });

    // Fetch all external borrowers
    const borrowers = await db.borrower.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nip: true,
        jabatan: true,
        organization: true,
        phone: true,
        address: true,
        role: true,
      },
    });

    // Merge into unified format
    const merged = [
      ...employees.map((e) => ({
        id: e.id,
        source: "pegawai" as const,
        name: e.name,
        nip: e.nip || "",
        jabatan: e.position || "",
        organization: e.department || "",
        phone: e.phone || "",
        address: e.address || "",
      })),
      ...borrowers.map((b) => ({
        id: b.id,
        source: "eksternal" as const,
        name: b.name,
        nip: b.nip || "",
        jabatan: b.jabatan || "",
        organization: b.organization || "",
        phone: b.phone || "",
        address: b.address || "",
      })),
    ];

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Error fetching merged borrowers:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar peminjam" }, { status: 500 });
  }
}

// POST — create new borrower. If organization matches school name,
// also create an Employee record (auto-sync).
export async function POST(request: NextRequest) {
  try {
    await ensureBorrowingSchema();
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const nip = String(body.nip ?? "").trim();
    const jabatan = String(body.jabatan ?? "").trim();
    const organization = String(body.organization ?? "").trim();
    const address = String(body.address ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    // Check if organization matches school name → auto-create Employee
    const settings = await db.schoolSettings.findFirst();
    const schoolName = settings?.schoolName || "";
    const isInternal = schoolName && organization.toLowerCase().includes(schoolName.toLowerCase());

    if (isInternal) {
      // Create as Employee (auto-sync)
      const employee = await db.employee.create({
        data: {
          name,
          nip,
          position: jabatan,
          department: organization,
          phone,
          address,
        },
      });
      return NextResponse.json({
        ...employee,
        source: "pegawai",
        jabatan: employee.position,
        organization: employee.department,
        message: "Peminjam ditambahkan ke data Pegawai (internal)",
      }, { status: 201 });
    }

    // External borrower → create in Borrower table
    const borrower = await db.borrower.create({
      data: {
        name,
        nip,
        jabatan,
        organization,
        address,
        phone,
        role: "Eksternal",
      },
    });
    return NextResponse.json({
      ...borrower,
      source: "eksternal",
      message: "Peminjam eksternal ditambahkan",
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating borrower:", error);
    return NextResponse.json({ error: "Gagal membuat peminjam" }, { status: 500 });
  }
}
