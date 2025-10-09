import QRCode from "qrcode";

import CryptoJS from "crypto-js";

import { v4 as uuidv4 } from "uuid";

const QR_SECRET_KEY = process.env.QR_SECRET_KEY || "eden-living-qr-secret-2024";

export interface QRCodeData {
  serviceRequestId: string;

  qrType: "start" | "completion";

  timestamp: number;

  uuid: string;

  signature: string;
}

export interface GeneratedSecureQRCode {
  payload: string;

  dataUrl: string;
}

function createSecurePayload(
  serviceRequestId: string,
  qrType: "start" | "completion",
): {
  qrData: QRCodeData;

  payload: string;
} {
  const timestamp = Date.now();

  const uuid = uuidv4();

  const dataToSign = `${serviceRequestId}:${qrType}:${timestamp}:${uuid}`;

  const signature = CryptoJS.HmacSHA256(dataToSign, QR_SECRET_KEY).toString();

  const qrData: QRCodeData = {
    serviceRequestId,

    qrType,

    timestamp,

    uuid,

    signature,
  };

  const payload = JSON.stringify(qrData);

  return { qrData, payload };
}

export async function generateSecureQRCode(
  serviceRequestId: string,

  qrType: "start" | "completion",
): Promise<GeneratedSecureQRCode> {
  const { payload } = createSecurePayload(serviceRequestId, qrType);

  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 300,

      margin: 2,

      color: {
        dark: "#000000",

        light: "#FFFFFF",
      },
    });

    return { payload, dataUrl };
  } catch (error) {
    console.error("Error generating QR code:", error);

    throw new Error("Failed to generate QR code");
  }
}

export async function generateQRCodeSVG(
  serviceRequestId: string,

  qrType: "start" | "completion",
): Promise<string> {
  const { payload } = createSecurePayload(serviceRequestId, qrType);

  try {
    const qrSvg = await QRCode.toString(payload, {
      type: "svg",

      width: 300,

      margin: 2,
    });

    return qrSvg;
  } catch (error) {
    console.error("Error generating QR SVG:", error);

    throw new Error("Failed to generate QR SVG");
  }
}

export function validateQRCode(qrString: string): QRCodeData | null {
  try {
    const qrData: QRCodeData = JSON.parse(qrString);

    if (
      !qrData.serviceRequestId ||
      !qrData.qrType ||
      !qrData.timestamp ||
      !qrData.uuid ||
      !qrData.signature
    ) {
      return null;
    }

    const dataToSign = `${qrData.serviceRequestId}:${qrData.qrType}:${qrData.timestamp}:${qrData.uuid}`;

    const expectedSignature = CryptoJS.HmacSHA256(
      dataToSign,
      QR_SECRET_KEY,
    ).toString();

    if (qrData.signature !== expectedSignature) {
      console.error("QR code signature validation failed");

      return null;
    }

    const expirationTime = 24 * 60 * 60 * 1000;

    if (Date.now() - qrData.timestamp > expirationTime) {
      console.error("QR code has expired");

      return null;
    }

    return qrData;
  } catch (error) {
    console.error("Error parsing QR code:", error);

    return null;
  }
}

export function isQRCodeExpired(timestamp: number): boolean {
  const expirationTime = 24 * 60 * 60 * 1000;

  return Date.now() - timestamp > expirationTime;
}

export function generateQRCodeHash(
  serviceRequestId: string,
  qrType: string,
): string {
  const timestamp = Date.now();

  const uuid = uuidv4();

  const data = `${serviceRequestId}:${qrType}:${timestamp}:${uuid}`;

  return CryptoJS.SHA256(data).toString();
}
