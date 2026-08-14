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
// manifest: link ke /manifest.webmanifest (di-generate oleh src/app/manifest.ts)
// apple-touch-icon: ikon saat diinstall di iOS home screen — pakai logo user
//   (raster PNG 180 dari /api/pwa-icon/180, lebih reliable di iOS daripada SVG).
// appleWebApp: mode standalone di iOS (tanpa Safari chrome).
// themeColor (di Viewport): warna address bar Android Chrome.
export const metadata: Metadata = {
  title: {
    default: "SIMAPRAS",
    template: "SIMAPRAS · %s",
  },
  applicationName: "SIMAPRAS",
  description: "Sistem Informasi Manajemen Sarana Prasarana Sekolah",
  keywords: ["SIMAPRAS", "Sarpras", "Inventaris", "Sekolah", "KIB", "Manajemen"],
  authors: [{ name: "SIMAPRAS" }],
  manifest: "/manifest.webmanifest",
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
