import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "items");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
];

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Tidak ada file yang dikirim. Pastikan Anda mengirimkan file dengan format FormData.", code: "NO_FILE" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Tidak ada file yang dikirim. Pastikan field bernama 'file' berisi file gambar.", code: "NO_FILE" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Format file "${file.type}" tidak didukung. Format yang didukung: JPG, PNG, GIF, WebP, BMP, SVG`,
          code: "INVALID_TYPE",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          error: `Ukuran file ${sizeMB}MB melebihi batas maksimal 10MB. Silakan kompres foto terlebih dahulu atau gunakan foto dengan resolusi lebih kecil.`,
          code: "FILE_TOO_LARGE",
        },
        { status: 400 }
      );
    }

    // Validate file is not empty
    if (file.size === 0) {
      return NextResponse.json(
        { error: "File kosong, silakan pilih foto lain", code: "EMPTY_FILE" },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || ".jpg";
    const timestamp = Date.now();
    const uniqueId = randomUUID().slice(0, 8);
    const filename = `item_${timestamp}_${uniqueId}${ext}`;

    // Save file
    const filePath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({ filename });
  } catch (error) {
    console.error("Error uploading file:", error);

    // Check for specific errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          error: "Koneksi terputus saat mengupload. Periksa koneksi internet Anda dan coba lagi.",
          code: "NETWORK_ERROR",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Terjadi kesalahan server saat mengupload foto. Silakan coba lagi.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
