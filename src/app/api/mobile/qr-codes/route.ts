import { NextRequest, NextResponse } from "next/server";

import { createMobileClientWithSession } from "@/lib/supabase/mobile-server";

import { generateSecureQRCode } from "@/lib/qr-code";

export async function POST(request: NextRequest) {
  try {
    console.log("Mobile QR codes POST - Starting");

    const authHeader = request.headers.get("authorization");

    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    const requestData = await request.json();

    console.log("Mobile QR codes POST - Request data:", requestData);

    const { resource_type, resource_id, qr_type } = requestData;

    if (!resource_type || !resource_id || !qr_type) {
      return NextResponse.json(
        {
          success: false,

          error: "Missing required fields: resource_type, resource_id, qr_type",
        },

        { status: 400 },
      );
    }

    if (!["service_request", "order"].includes(resource_type)) {
      return NextResponse.json(
        {
          success: false,

          error: 'Invalid resource_type. Must be "service_request" or "order"',
        },

        { status: 400 },
      );
    }

    if (!["start", "completion"].includes(qr_type)) {
      return NextResponse.json(
        {
          success: false,

          error: 'Invalid qr_type. Must be "start" or "completion"',
        },

        { status: 400 },
      );
    }

    if (accessToken && accessToken.startsWith("demo-token-")) {
      console.log("Demo token detected, creating secure QR code");

      const qrCode = await generateSecureQRCode(resource_id, qr_type);

      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();

      return NextResponse.json({
        success: true,

        data: {
          id: "demo",

          qr_code: qrCode.dataUrl,

          qr_payload: qrCode.payload,

          expires_at: expiresAt,

          qr_type,
        },
      });
    }

    const supabase = await createMobileClientWithSession(request);

    console.log("Mobile QR codes POST - Getting user");

    const {
      data: { user },

      error: authError,
    } = await supabase.auth.getUser();

    console.log(
      "Mobile QR codes POST - User:",

      user ? user.id : "None",

      "Error:",

      authError?.message || "None",
    );

    if (authError || !user) {
      console.log("Mobile QR codes POST - Authentication failed");

      return NextResponse.json(
        { success: false, error: "Unauthorized", details: authError?.message },

        { status: 401 },
      );
    }

    if (resource_type === "service_request") {
      const { data: serviceRequest, error: requestError } = await supabase

        .from("service_requests")

        .select("*")

        .eq("id", resource_id)

        .single();

      if (requestError || !serviceRequest) {
        return NextResponse.json(
          { success: false, error: "Service request not found" },

          { status: 404 },
        );
      }

      if (serviceRequest.resident_id !== user.id) {
        return NextResponse.json(
          {
            success: false,

            error: "You can only generate QR codes for your own requests",
          },

          { status: 403 },
        );
      }

      if (qr_type === "start" && serviceRequest.status !== "pending") {
        return NextResponse.json(
          {
            success: false,

            error: "Can only generate start QR for pending requests",
          },

          { status: 400 },
        );
      }

      if (qr_type === "completion" && serviceRequest.status !== "in_progress") {
        return NextResponse.json(
          {
            success: false,

            error: "Can only generate completion QR for in-progress requests",
          },

          { status: 400 },
        );
      }
    } else if (resource_type === "order") {
      const { data: order, error: orderError } = await supabase

        .from("orders")

        .select("*")

        .eq("id", resource_id)

        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { success: false, error: "Order not found" },

          { status: 404 },
        );
      }

      if (order.resident_id !== user.id) {
        return NextResponse.json(
          {
            success: false,

            error: "You can only generate QR codes for your own orders",
          },

          { status: 403 },
        );
      }

      if (qr_type !== "completion") {
        return NextResponse.json(
          { success: false, error: "Orders only support completion QR codes" },

          { status: 400 },
        );
      }
    }

    const qrCode = await generateSecureQRCode(resource_id, qr_type);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const qrRecord: Record<string, unknown> = {
      qr_type,

      token: qrCode.payload, // Store the payload string, not the dataUrl

      expires_at: expiresAt,

      is_used: false,
    };

    if (resource_type === "service_request") {
      qrRecord.service_request_id = resource_id;
    } else {
      // Orders use order_id column
      qrRecord.order_id = resource_id;
    }

    const { data: savedQR, error: saveError } = await supabase

      .from("service_qr_codes")

      .insert(qrRecord)

      .select()

      .single();

    if (saveError) {
      console.error("Error saving QR code:", saveError);

      return NextResponse.json(
        {
          success: false,

          error: `Failed to save QR code: ${saveError.message}`,
        },

        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,

      data: {
        id: savedQR.id,

        qr_code: savedQR.token ?? qrCode.dataUrl,

        qr_payload: qrCode.payload,

        expires_at: expiresAt,

        qr_type,
      },
    });
  } catch (error) {
    console.error("Mobile QR codes POST error:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },

      { status: 500 },
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,

    headers: {
      "Access-Control-Allow-Origin": "*",

      "Access-Control-Allow-Methods": "POST, OPTIONS",

      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
