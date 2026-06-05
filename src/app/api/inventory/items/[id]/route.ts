import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        room: true,
        bilik: true,
        cabinet: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Barang inventaris tidak ditemukan" },
        { status: 404 }
      );
    }

    // Parse photos JSON
    const itemWithPhotos = {
      ...item,
      photos: JSON.parse(item.photos || "[]"),
    };

    return NextResponse.json(itemWithPhotos);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data barang inventaris" },
      { status: 500 }
    );
  }
}

// Helper: only include field if explicitly provided in body
// This prevents accidental resets when partial updates are sent (e.g., photo upload)
function buildUpdateData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};

  // Simple string fields - only update if provided
  const simpleFields = [
    "name", "registrationNumber", "brand", "condition",
    "unit", "sumberDana", "notes",
  ];

  for (const field of simpleFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  // Number fields - only update if provided
  const numberFields = [
    "quantity", "price",
  ];

  for (const field of numberFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  // Nullable fields - allow explicit null (e.g., removing roomId)
  // but don't set to null if not provided at all
  const nullableFields = [
    "tahunPengadaan",
    "roomId", "bilikId", "cabinetId",
  ];

  for (const field of nullableFields) {
    if (body[field] !== undefined) {
      // Explicitly provided (could be null to clear, or a value to set)
      data[field] = body[field] ?? null;
    }
    // If not provided at all, don't include in data (Prisma will keep current value)
  }

  // Photos - special handling (JSON string)
  if (body.photos !== undefined) {
    data.photos = JSON.stringify(body.photos);
  }

  return data;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data = buildUpdateData(body);

    const item = await db.inventoryItem.update({
      where: { id },
      data,
    });

    // Return item with parsed photos
    const itemWithPhotos = {
      ...item,
      photos: JSON.parse(item.photos || "[]"),
    };

    return NextResponse.json(itemWithPhotos);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui barang inventaris" },
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

    // Get item photos before deleting to clean up files
    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (item) {
      try {
        const photos: string[] = JSON.parse(item.photos || "[]");
        const { unlink } = await import("fs/promises");
        const path = await import("path");
        const uploadDir = path.join(process.cwd(), "public", "uploads", "items");
        for (const photo of photos) {
          try {
            await unlink(path.join(uploadDir, photo));
          } catch {
            // File might not exist, that's OK
          }
        }
      } catch {
        // Photo cleanup failed, but still delete the item
      }
    }

    await db.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Barang inventaris berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Gagal menghapus barang inventaris" },
      { status: 500 }
    );
  }
}
