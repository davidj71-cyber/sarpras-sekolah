import { getSettings, logoToResponse, fallbackResponse } from "@/lib/logo-server";

// ─── /api/favicon — browser tab icon ────────────────────────────────────────
// Priority: favicon → appLogo → letterhead logo → fallback "S" SVG
export async function GET() {
  const settings = await getSettings();

  return (
    logoToResponse(settings?.favicon, 3600) ??
    logoToResponse(settings?.appLogo, 3600) ??
    logoToResponse(settings?.logo, 3600) ??
    fallbackResponse(3600)
  );
}
