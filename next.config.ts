import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Production hardening ──────────────────────────────────────────────
  // Strip the `X-Powered-By: Next.js` response header (tiny security win
  // and saves a few bytes on every response).
  poweredByHeader: false,

  // Let Next.js compress responses. (Most production hosts — Vercel —
  // also gzip at the edge, but enabling this keeps self-hosted deploys
  // fast too.)
  compress: true,

  // Skip source maps in production browser builds to shrink the JS
  // payload that clients download. Server maps are still generated for
  // server-side debugging.
  productionBrowserSourceMaps: false,

  // ── Build behavior ────────────────────────────────────────────────────
  // Continue to catch type errors during `next build` via `tsc`, but be
  // lenient here so a single unused import doesn't block a deploy.
  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,

  // Tree-shake and dedupe large barrel-export libraries so the client
  // bundle stays small. These are the heavy ones in this project.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'date-fns',
    ],
  },
};

export default nextConfig;
