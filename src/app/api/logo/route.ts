import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Default fallback favicon: a green rounded square with a white "S"
// Used when the school hasn't uploaded a logo yet, so the browser tab
// always shows a branded icon for SIMAPRAS.
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <text x="32" y="45" font-size="38" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">S</text>
</svg>`;

function svgResponse(svg: string, maxAge = 300) {
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}, must-revalidate`,
    },
  });
}

export async function GET() {
  try {
    const settings = await db.schoolSettings.findFirst();
    const logo = settings?.logo;

    if (logo) {
      // Data URL form: data:<mime>;base64,<payload>
      const match = logo.match(/^data:([^;]+);base64,(.*)$/s);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=3600, must-revalidate",
          },
        });
      }

      // Raw SVG string form
      const trimmed = logo.trim();
      if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) {
        return svgResponse(logo, 3600);
      }
    }
  } catch (error) {
    console.error("Error fetching logo:", error);
  }

  // Fallback branded icon
  return svgResponse(FALLBACK_SVG);
}
