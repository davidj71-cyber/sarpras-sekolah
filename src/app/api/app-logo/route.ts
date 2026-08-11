import { getSettings, logoToResponse, fallbackResponse } from "@/lib/logo-server";

// ─── /api/app-logo — application logo (login page & sidebar) ────────────────
// Priority: appLogo → letterhead logo → fallback "S" SVG
export async function GET() {
  const settings = await getSettings();

  // Prefer the dedicated app logo; fall back to the letterhead logo so an
  // app that only configured one logo still looks branded.
  return (
    logoToResponse(settings?.appLogo, 300) ??
    logoToResponse(settings?.logo, 300) ??
    fallbackResponse(300)
  );
}
