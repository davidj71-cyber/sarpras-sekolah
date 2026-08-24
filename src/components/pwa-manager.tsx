"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── PWA Manager ─────────────────────────────────────────────────────────────
// Client component yang:
//  1. Mendaftarkan service worker (/sw.js) — syarat installability Android.
//  2. Mendengarkan event `beforeinstallprompt` — saat browser menganggap
//     app ini installable, simpan event-nya.
//  3. Menampilkan tombol floating "Pasang Aplikasi" yang memicu prompt install
//     bawaan browser (Chrome/Edge Android).
//  4. Setelah terinstall (appinstalled) → tombol otomatis hilang.
//
// Catatan render: tombol hanya muncul setelah `beforeinstallprompt` fire
// (selalu setelah mount), jadi lazy-init `installed`/`dismissed` dari
// localStorage/matchMedia TIDAK menyebabkan hydration mismatch (SSR & first
// client render keduanya menghasilkan null karena deferredPrompt masih null).

// Type untuk BeforeInstallPromptEvent (tidak ada di lib.dom standar).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "simapras:pwa-install-dismissed";

/** Cek apakah app sudah jalan dalam mode standalone (terinstall). */
function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true
    );
  } catch {
    return false;
  }
}

/** Cek apakah user sebelumnya menutup tombol install. */
function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function PWAManager() {
  // Lazy-init dari client-only sources — aman karena output render selalu null
  // sampai deferredPrompt ter-set (yang hanya terjadi pasca-mount via event).
  const [installed, setInstalled] = useState<boolean>(readStandalone);
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 1. Register service worker — syarat installability Android Chrome.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Silent fail — SW opsional, app tetap jalan tanpa PWA.
          console.warn("SW registration failed:", err);
        });
    }

    // 2. Tangkap beforeinstallprompt — simpan untuk dipicu saat user klik tombol.
    //    setState di dalam event callback (bukan synchronous effect body) →
    //    tidak memicu cascading render warning.
    const onBeforeInstall = (e: Event) => {
      // Cegah Chrome menampilkan mini-infobar otomatis — kita pakai tombol custom.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        /* noop */
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Jangan render apa-apa kalau sudah terinstall / belum installable / didismiss.
  if (installed || !deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "dismissed") {
      // User tolak → sembunyikan tombol (jangan ganggu lagi sesi ini).
      setDismissed(true);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* noop */
      }
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border bg-card p-1.5 pl-4 shadow-lg"
        role="dialog"
        aria-label="Pasang aplikasi"
      >
        <div className="flex items-center gap-2 pr-1">
          <Download className="size-4 text-primary" aria-hidden />
          <span className="text-sm font-medium">Pasang Aplikasi</span>
        </div>
        <button
          onClick={handleInstall}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Pasang
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
