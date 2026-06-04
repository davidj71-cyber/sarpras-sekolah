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
  kopLines: "[]",
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
    const kopLines = Array.isArray(body.kopLines)
      ? JSON.stringify(body.kopLines)
      : body.kopLines ?? "[]";

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
          kopLines,
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
          kopLines,
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
