import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Branded fallback: a green rounded square with a white "S" for SIMAPRAS.
// Used when no logo is configured so the browser tab / login always shows
// a branded icon.
export const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <text x="32" y="45" font-size="38" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">S</text>
</svg>`;

/**
 * Convert a stored logo value (base64 data URL or raw SVG string) into a
 * NextResponse with the correct Content-Type. Returns null if the value
 * is not a usable image.
 */
export function logoToResponse(
  logo: string | null | undefined,
  maxAge = 300
): NextResponse | null {
  if (!logo) return null;

  // Data URL form: data:<mime>;base64,<payload>
  const match = logo.match(/^data:([^;]+);base64,(.*)$/s);
  if (match) {
    const mime = match[1];
    const buffer = Buffer.from(match[2], "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": `public, max-age=${maxAge}, must-revalidate`,
      },
    });
  }

  // Raw SVG string form
  const trimmed = logo.trim();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) {
    return new NextResponse(logo, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": `public, max-age=${maxAge}, must-revalidate`,
      },
    });
  }

  return null;
}

export function fallbackResponse(maxAge = 300): NextResponse {
  return new NextResponse(FALLBACK_SVG, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}, must-revalidate`,
    },
  });
}

/** Fetch school settings, tolerating DB errors. */
export async function getSettings() {
  try {
    return await db.schoolSettings.findFirst();
  } catch (error) {
    console.error("Error fetching settings for logo:", error);
    return null;
  }
}
