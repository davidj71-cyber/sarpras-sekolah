import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const defaultSettings = {
  schoolName: "",
  logo: null,
  logoWidth: 3.0,
  logoHeight: 3.0,
  fontFamily: "Times New Roman",
  fontSize: 14,
  isBold: false,
  textTransform: "none",
  underlineThickness: 1.0,
  underlineWidth: 100.0,
  address: null,
  phone: null,
  email: null,
  npsn: null,
  schoolCode: "",
  letterUnitCode: "TU",
  kopLines: "[]",
  principalName: "",
  principalNip: "",
  treasurerName: "",
  treasurerNip: "",
};

export async function GET() {
  try {
    const settings = await db.schoolSettings.findFirst();

    if (!settings) {
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Gagal mengambil pengaturan sekolah" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const existing = await db.schoolSettings.findFirst();

    // Ensure kopLines is a valid JSON string
    // Each item normalized to: { text, style, bold, fontSize, textTransform }
    const normalizeItem = (item: unknown) => {
      if (typeof item === 'string') {
        return { text: item, style: 'detail', bold: false, fontSize: 0, textTransform: '' }
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        const transformRaw = typeof obj.textTransform === 'string' ? obj.textTransform : ''
        const validTransform = ['none', 'uppercase', 'capitalize', 'lowercase'].includes(transformRaw) ? transformRaw : ''
        const fontSizeNum = typeof obj.fontSize === 'number' ? obj.fontSize : parseFloat(String(obj.fontSize ?? '0'))
        return {
          text: String(obj.text ?? ''),
          style: obj.style === 'header' ? 'header' : 'detail',
          bold: Boolean(obj.bold ?? false),
          fontSize: !isNaN(fontSizeNum) && fontSizeNum > 0 ? fontSizeNum : 0,
          textTransform: validTransform,
        }
      }
      return { text: '', style: 'detail', bold: false, fontSize: 0, textTransform: '' }
    }

    let kopLines: string;
    if (Array.isArray(body.kopLines)) {
      kopLines = JSON.stringify(body.kopLines.map(normalizeItem));
    } else if (typeof body.kopLines === 'string') {
      // Try to parse and re-normalize
      try {
        const parsed = JSON.parse(body.kopLines);
        if (Array.isArray(parsed)) {
          kopLines = JSON.stringify(parsed.map(normalizeItem));
        } else {
          kopLines = "[]";
        }
      } catch {
        kopLines = "[]";
      }
    } else {
      kopLines = "[]";
    }

    let settings;

    if (existing) {
      settings = await db.schoolSettings.update({
        where: { id: existing.id },
        data: {
          schoolName: body.schoolName,
          logo: body.logo,
          logoWidth: body.logoWidth,
          logoHeight: body.logoHeight,
          fontFamily: body.fontFamily,
          fontSize: body.fontSize,
          isBold: body.isBold,
          textTransform: body.textTransform,
          underlineThickness: body.underlineThickness,
          underlineWidth: body.underlineWidth,
          address: body.address,
          phone: body.phone,
          email: body.email,
          npsn: body.npsn,
          schoolCode: body.schoolCode,
          letterUnitCode: body.letterUnitCode,
          kopLines,
          principalName: body.principalName ?? "",
          principalNip: body.principalNip ?? "",
          treasurerName: body.treasurerName ?? "",
          treasurerNip: body.treasurerNip ?? "",
        },
      });
    } else {
      settings = await db.schoolSettings.create({
        data: {
          schoolName: body.schoolName ?? "",
          logo: body.logo,
          logoWidth: body.logoWidth ?? 3.0,
          logoHeight: body.logoHeight ?? 3.0,
          fontFamily: body.fontFamily ?? "Times New Roman",
          fontSize: body.fontSize ?? 14,
          isBold: body.isBold ?? false,
          textTransform: body.textTransform ?? "none",
          underlineThickness: body.underlineThickness ?? 1.0,
          underlineWidth: body.underlineWidth ?? 100.0,
          address: body.address,
          phone: body.phone,
          email: body.email,
          npsn: body.npsn,
          schoolCode: body.schoolCode ?? "",
          letterUnitCode: body.letterUnitCode ?? "TU",
          kopLines,
          principalName: body.principalName ?? "",
          principalNip: body.principalNip ?? "",
          treasurerName: body.treasurerName ?? "",
          treasurerNip: body.treasurerNip ?? "",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan sekolah" },
      { status: 500 }
    );
  }
}
