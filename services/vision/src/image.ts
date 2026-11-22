import { HttpError } from "./errors.js";

export interface ParsedImage {
  mime: "image/png" | "image/jpeg";
  bytes: number;
  width: number;
  height: number;
}

const DATA_URL = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * Validates a JPEG/PNG data URL: declared type, strict base64, decoded size, magic bytes, and
 * readable dimensions. The decoded buffer is used only for header inspection and is not retained.
 */
export function parseImageDataUrl(dataUrl: string, maxBytes: number): ParsedImage {
  const m = DATA_URL.exec(dataUrl);
  if (!m) throw new HttpError(400, "invalid_image", "imageDataUrl must be a base64 data URL of type image/jpeg or image/png.");
  const b64 = m[2]!;
  const decodedLen = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  if (decodedLen > maxBytes) throw new HttpError(413, "image_too_large", `Image exceeds ${maxBytes} bytes decoded.`);
  const buf = Buffer.from(b64, "base64");
  const dims = m[1] === "image/png" ? pngSize(buf) : jpegSize(buf);
  if (!dims) throw new HttpError(400, "invalid_image", "Image bytes do not match the declared type or are corrupt.");
  return { mime: m[1] as ParsedImage["mime"], bytes: buf.length, ...dims };
}

function pngSize(b: Buffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length < 24 || !b.subarray(0, 8).equals(sig) || b.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function jpegSize(b: Buffer) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1]!;
    if (marker === 0xff) { i++; continue; }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
    const len = b.readUInt16BE(i + 2);
    // SOF0-SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = b.readUInt16BE(i + 5);
      const width = b.readUInt16BE(i + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + len;
  }
  return null;
}
