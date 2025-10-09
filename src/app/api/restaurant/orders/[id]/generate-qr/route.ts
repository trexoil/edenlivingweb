import { NextResponse } from "next/server";

import { generateSecureQRCode } from "@/lib/qr-code";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const qrCode = await generateSecureQRCode(params.id, "completion");

    return NextResponse.json({
      qr_code: qrCode.dataUrl,

      qr_payload: qrCode.payload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "qr_failed" },
      { status: 500 },
    );
  }
}
