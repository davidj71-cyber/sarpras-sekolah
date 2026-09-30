import { getSettings, logoToResponse, fallbackResponse } from "@/lib/logo-server";

// ─── /api/favicon — browser tab icon ────────────────────────────────────────
// Priority: favicon → appLogo → letterhead logo → fallback "S" SVG
//
// CACHE: maxAge=0 (no-cache) supaya browser selalu fetch favicon terbaru.
// Sebelumnya maxAge=3600 (1 jam) — setelah user upload favicon baru, browser
// masih pakai favicon lama selama 1 jam karena cache. Dengan no-cache, setiap
// perubahan favicon langsung terlihat.
//
// Untuk performa, favicon response tetap di-cache di browser sebentar via
// stale-while-revalidate supaya tidak fetch terus-menerus, tapi tetap update
// cepat saat ada perubahan.
export async function GET() {
  const settings = await getSettings();

  return (
    logoToResponse(settings?.favicon, 0) ??
    logoToResponse(settings?.appLogo, 0) ??
    logoToResponse(settings?.logo, 0) ??
    fallbackResponse(0)
  );
}
