import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 10MB" }, { status: 400 });
    }

    // Generate unique filename
    const ext = path.extname(file.name) || ".jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `item_${timestamp}_${random}${ext}`;

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Compress and resize image using sharp
    const uploadDir = path.join(process.cwd(), "public", "uploads", "items");
    const filePath = path.join(uploadDir, filename);

    // Resize to max 1200px width, maintain aspect ratio, compress quality
    await sharp(buffer)
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toFile(filePath);

    return NextResponse.json({
      filename,
      path: `/uploads/items/${filename}`,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Gagal mengupload file" },
      { status: 500 }
    );
  }
}
