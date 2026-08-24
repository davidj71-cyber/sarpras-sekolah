import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/logo-server";

// ─── Web App Manifest (PWA) ──────────────────────────────────────────────────
// Served at /manifest.webmanifest. Menentukan bagaimana aplikasi tampil saat
// diinstall di Android/iOS: nama, ikon, warna tema, display mode.
//
// Nama sekolah diambil dinamis dari SchoolSettings (→ "Add to Home Screen"
// akan pakai nama sekolah, bukan "SIMAPRAS").
// Ikon di-generate on-the-fly dari logo yang diupload user via /api/pwa-icon,
// jadi ikon saat terinstall = logo sekolah.
//
// force-dynamic supaya nama sekolah / logo terbaru selalu dipakai (bukan
// di-cache di build time).

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const schoolName = (settings?.schoolName || "").trim() || "SIMAPRAS";

  // short_name: untuk label di home screen Android (max ~12 char ideal).
  // Jika nama sekolah panjang, pakai "SIMAPRAS" sebagai short name supaya
  // tidak terpotong jadi aneh di launcher.
  const shortName =
    schoolName.length <= 12 ? schoolName : "SIMAPRAS";

  return {
    name: schoolName,
    short_name: shortName,
    description:
      "Sistem Informasi Manajemen Sarana Prasarana Sekolah — inventaris, pesanan, gaji, media.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    categories: ["education", "productivity", "business"],
    lang: "id",
    dir: "ltr",
    icons: [
      // PNG icons rasterized dari logo user (atau fallback "S").
      // purpose "any" = ikon biasa; "maskable" = adaptive icon Android.
      {
        src: "/api/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/pwa-icon/192?maskable=1",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/api/pwa-icon/512?maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      // SVG (favicon dinamis) sebagai tambahan — ukuran "any".
      // Sebagian browser (Chrome 76+) bisa pakai SVG untuk favicon.
      {
        src: "/api/favicon",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
