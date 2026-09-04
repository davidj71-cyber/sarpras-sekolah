import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { PWAManager } from "@/components/pwa-manager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ─── PWA / Mobile meta tags ──────────────────────────────────────────────────
// Manifest di-inline sebagai data URI supaya browser tidak perlu fetch
// /manifest.webmanifest (yang kena Vercel SSO Protection → CORS error).
// Dengan data URI, manifest langsung embedded di HTML head → no fetch → no CORS.
// apple-touch-icon: ikon saat diinstall di iOS home screen — pakai logo user.
// appleWebApp: mode standalone di iOS (tanpa Safari chrome).
// themeColor (di Viewport): warna address bar Android Chrome.

// Inline manifest sebagai data URI — eliminasi fetch /manifest.webmanifest
const inlineManifest = {
  name: "SIMAPRAS",
  short_name: "SIMAPRAS",
  description: "Sistem Informasi Manajemen Sarana Prasarana Sekolah",
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
    { src: "/api/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/api/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/api/pwa-icon/192?maskable=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/api/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    { src: "/api/favicon", sizes: "any", type: "image/svg+xml", purpose: "any" },
  ],
};
const manifestDataUri = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(inlineManifest))}`;

export const metadata: Metadata = {
  title: {
    default: "SIMAPRAS",
    template: "SIMAPRAS · %s",
  },
  applicationName: "SIMAPRAS",
  description: "Sistem Informasi Manajemen Sarana Prasarana Sekolah",
  keywords: ["SIMAPRAS", "Sarpras", "Inventaris", "Sekolah", "KIB", "Manajemen"],
  authors: [{ name: "SIMAPRAS" }],
  manifest: manifestDataUri,
  icons: {
    icon: [{ url: "/api/favicon" }],
    shortcut: [{ url: "/api/favicon" }],
    apple: [{ url: "/api/pwa-icon/180", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SIMAPRAS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <PWAManager />
        <Toaster />
      </body>
    </html>
  );
}
