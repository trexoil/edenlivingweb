import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { generateSecureQRCode } from "@/lib/qr-code";

import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,

  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Get current user

    const {
      data: { user },

      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile

    const { data: profile, error: profileError } = await supabase

      .from("profiles")

      .select("*")

      .eq("id", user.id)

      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get service request details

    const { data: serviceRequest, error: requestError } = await supabase

      .from("service_requests")

      .select("*")

      .eq("id", params.id)

      .single();

    if (requestError || !serviceRequest) {
      return NextResponse.json(
        { error: "Service request not found" },

        { status: 404 },
      );
    }

    // Check permissions - only the resident who created the request can generate QR codes

    if (profile.role === "resident" && serviceRequest.resident_id !== user.id) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Parse request body

    const body = await request.json();

    const { qr_type } = body; // 'start' | 'completion'

    if (!qr_type || !["start", "completion"].includes(qr_type)) {
      return NextResponse.json({ error: "Invalid QR type" }, { status: 400 });
    }

    // Check service request status for QR type validity

    if (qr_type === "start") {
      // Start QR can only be generated when service is assigned or processing

      if (!["assigned", "processing"].includes(serviceRequest.status)) {
        return NextResponse.json(
          {
            error:
              "Start QR can only be generated when service is assigned or processing",
          },

          { status: 400 },
        );
      }
    } else if (qr_type === "completion") {
      // Completion QR can only be generated when service is in progress

      if (serviceRequest.status !== "in_progress") {
        return NextResponse.json(
          {
            error:
              "Completion QR can only be generated when service is in progress",
          },

          { status: 400 },
        );
      }
    }

    // Generate unique QR code

    const qrCode = await generateSecureQRCode(params.id, qr_type);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Save QR code record to database

    const qrRecord = {
      id: uuidv4(),

      service_request_id: params.id,

      qr_type,

      token: qrCode.payload, // Store the payload string, not the dataUrl
      expires_at: expiresAt.toISOString(),

      is_used: false,

      created_at: new Date().toISOString(),
    };

    const { data: savedQrRecord, error: saveError } = await supabase

      .from("service_qr_codes")

      .insert(qrRecord)

      .select()

      .single();

    if (saveError) {
      console.error("Error saving QR code:", saveError);

      return NextResponse.json(
        { error: "Failed to save QR code" },

        { status: 500 },
      );
    }

    // Update service request with QR code reference

    const updateField =
      qr_type === "start" ? "start_qr_code" : "completion_qr_code";

    await supabase

      .from("service_requests")

      .update({
        [updateField]: savedQrRecord.id,

        updated_at: new Date().toISOString(),
      })

      .eq("id", params.id);

    return NextResponse.json({
      success: true,

      qr_code: qrCode.dataUrl,

      qr_payload: qrCode.payload,

      qr_id: savedQrRecord.id,

      expires_at: expiresAt.toISOString(),

      qr_type,
    });
  } catch (error) {
    console.error("Generate QR code API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },

      { status: 500 },
    );
  }
}
