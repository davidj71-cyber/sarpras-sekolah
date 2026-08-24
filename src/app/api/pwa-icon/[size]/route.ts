import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSettings, FALLBACK_SVG } from "@/lib/logo-server";

// ─── /api/pwa-icon/[size] — PWA app icon (PNG) dari logo sekolah ─────────────
// Membuat ikon PNG berukuran tepat (192/512) dari logo yang diupload user
// (favicon → appLogo → letterhead logo → fallback "S"). Dipakai oleh
// manifest.webmanifest supaya saat diinstall di Android, ikonnya = logo
// sekolah, bukan ikon generik.
//
// Query param:
//   ?maskable=1  → background hijau full-bleed + logo di tengah (safe zone 80%)
//                  untuk adaptive icon Android (purpose: "maskable")
//   (default)    → logo apa adanya, fit-contain, background transparan
//                  (purpose: "any")
//
// Output PNG di-cache 24 jam (browser + CDN) supaya generate sekali per size.

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/** Decode stored logo value (data URL base64 / raw SVG) → Buffer sharp-readable. */
function decodeLogo(
  logo: string | null | undefined
): Buffer | null {
  if (!logo) return null;
  // Data URL: data:<mime>;base64,<payload>
  const match = logo.match(/^data:([^;]+);base64,(.*)$/s);
  if (match) {
    try {
      return Buffer.from(match[2], "base64");
    } catch {
      return null;
    }
  }
  // Raw SVG string
  const trimmed = logo.trim();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) {
    return Buffer.from(logo, "utf-8");
  }
  return null;
}

/** Rasterize the fallback "S" SVG to a PNG buffer of given size. */
async function fallbackPng(size: number, maskable: boolean): Promise<Buffer> {
  if (maskable) {
    // Full-bleed green + fallback SVG centered (SVG already has green bg + S,
    // but for maskable we redraw to ensure full-bleed without rounded corners).
    const bg = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 22, g: 163, b: 74, alpha: 1 }, // #16a34a
      },
    })
      .png()
      .toBuffer();
    const inner = Math.round(size * 0.55);
    const s = await sharp(Buffer.from(FALLBACK_SVG, "utf-8"))
      .resize(inner, inner, { fit: "contain" })
      .png()
      .toBuffer();
    return sharp(bg).composite([{ input: s, gravity: "center" }]).png().toBuffer();
  }
  return sharp(Buffer.from(FALLBACK_SVG, "utf-8"))
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params;
  // Clamp size to safe range (16–1024) — defensive against weird path params.
  const parsed = parseInt(sizeStr, 10);
  const size = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 16), 1024) : 512;
  const url = new URL(request.url);
  const maskable = url.searchParams.get("maskable") === "1";

  const CACHE_HEADERS = {
    "Content-Type": "image/png",
    "Cache-Control":
      "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
  };

  try {
    const settings = await getSettings();
    const logoValue =
      settings?.favicon || settings?.appLogo || settings?.logo || null;
    const logoBuf = decodeLogo(logoValue);

    // No usable logo → render fallback "S".
    if (!logoBuf) {
      const buf = await fallbackPng(size, maskable);
      return new NextResponse(buf, { headers: CACHE_HEADERS });
    }

    if (maskable) {
      // Adaptive icon Android: background hijau full-bleed + logo centered
      // di safe zone 80% (supaya tidak terpotong oleh mask bulat/rounded).
      const inner = Math.round(size * 0.8);
      const logoResized = await sharp(logoBuf)
        .resize(inner, inner, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      const bg = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 22, g: 163, b: 74, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await sharp(bg)
        .composite([{ input: logoResized, gravity: "center" }])
        .png()
        .toBuffer();

      return new NextResponse(result, { headers: CACHE_HEADERS });
    }

    // Non-maskable: logo apa adanya, fit-contain, background transparan.
    const result = await sharp(logoBuf)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    return new NextResponse(result, { headers: CACHE_HEADERS });
  } catch (err) {
    // Sharp error (mis. format logo tidak dikenali) → fallback "S".
    console.error("pwa-icon error:", err);
    try {
      const buf = await fallbackPng(size, maskable);
      return new NextResponse(buf, { headers: CACHE_HEADERS });
    } catch {
      // Last-resort: 1x1 transparent pixel.
      const transparent = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64"
      );
      return new NextResponse(transparent, { headers: CACHE_HEADERS });
    }
  }
}
