/**
 * Pure TypeScript GIF89a Multi-Frame Animated GIF Encoder
 * Zero external worker dependencies — works reliably inside sandboxed iframes.
 */

const MAX_PALETTE_SIZE = 256;

/**
 * Builds a 256-color palette (RGB triplets, length = 768) tailored to UI blueprints
 * (6x6x6 RGB cube = 216 colors + 24 high-precision grays/slates + 16 vivid UI accent colors)
 */
function buildBlueprintPalette(): Uint8Array {
  const palette = new Uint8Array(MAX_PALETTE_SIZE * 3);
  let idx = 0;

  // 1. 6x6x6 RGB color cube (216 colors)
  const levels = [0, 51, 102, 153, 204, 255];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        palette[idx * 3] = levels[r];
        palette[idx * 3 + 1] = levels[g];
        palette[idx * 3 + 2] = levels[b];
        idx++;
      }
    }
  }

  // 2. 24 precision dark/light UI slate & gray shades for crisp dark/light mode backgrounds
  const slates: Array<[number, number, number]> = [
    [11, 15, 25],    // #0B0F19 (Dark canvas bg)
    [15, 23, 42],    // #0F172A (Slate 900)
    [23, 33, 56],    // Slate 850
    [30, 41, 59],    // #1E293B (Slate 800)
    [40, 53, 75],    // Slate 750
    [51, 65, 85],    // #334155 (Slate 700)
    [71, 85, 105],   // #475569 (Slate 600)
    [100, 116, 139], // #64748B (Slate 500)
    [148, 163, 184], // #94A3B8 (Slate 400)
    [203, 213, 225], // #CBD5E1 (Slate 300)
    [226, 232, 240], // #E2E8F0 (Slate 200)
    [241, 245, 249], // #F1F5F9 (Slate 100)
    [248, 250, 252], // #F8FAFC (Light canvas bg)
    [254, 252, 232], // #FEFCE8 (Sticky note yellow light)
    [254, 240, 138], // #FEF08A (Sticky note border)
    [45, 38, 20],    // Dark sticky note bg
    [16, 185, 129],  // #10B981 (Emerald 500 - Trigger)
    [52, 211, 153],  // #34D399 (Emerald 400)
    [139, 92, 246],  // #8B5CF6 (Violet 500 - AI)
    [168, 85, 247],  // #A855F7 (Purple 500 - AI Sub)
    [245, 158, 11],  // #F59E0B (Amber 500 - Router)
    [59, 130, 246],  // #3B82F6 (Blue 500 - Action)
    [99, 102, 241],  // #6366F1 (Indigo 500 - MindMap)
    [236, 72, 153],  // #EC4899 (Pink 500)
  ];

  for (const [r, g, b] of slates) {
    if (idx < MAX_PALETTE_SIZE) {
      palette[idx * 3] = r;
      palette[idx * 3 + 1] = g;
      palette[idx * 3 + 2] = b;
      idx++;
    }
  }

  // Fill remaining slots with fine grayscale ramp
  while (idx < MAX_PALETTE_SIZE) {
    const v = Math.round(((idx - 240) / 15) * 255);
    palette[idx * 3] = v;
    palette[idx * 3 + 1] = v;
    palette[idx * 3 + 2] = v;
    idx++;
  }

  return palette;
}

/**
 * Maps RGBA ImageData pixels to 8-bit palette indices using a 15-bit RGB lookup table
 */
function createQuantizer(palette: Uint8Array) {
  const lut = new Int16Array(32768).fill(-1);

  return function quantizeFrame(rgba: Uint8ClampedArray): Uint8Array {
    const pixelCount = rgba.length >> 2;
    const indexed = new Uint8Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
      const offset = i << 2;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];

      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let bestIdx = lut[key];

      if (bestIdx === -1) {
        let bestDist = Infinity;
        bestIdx = 0;
        for (let p = 0; p < MAX_PALETTE_SIZE; p++) {
          const pr = palette[p * 3];
          const pg = palette[p * 3 + 1];
          const pb = palette[p * 3 + 2];
          const dr = r - pr;
          const dg = g - pg;
          const db = b - pb;
          const dist = dr * dr * 2 + dg * dg * 4 + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = p;
            if (dist === 0) break;
          }
        }
        lut[key] = bestIdx;
      }

      indexed[i] = bestIdx;
    }

    return indexed;
  };
}

/**
 * Standard GIF89a LZW encoder for 8-bit indexed pixel arrays
 */
function lzwEncode(indexStream: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const MAX_DICT_CODE = 4095;

  const output: number[] = [];
  output.push(minCodeSize);

  let subBlock = new Uint8Array(255);
  let subBlockLen = 0;

  let curAccum = 0;
  let curBits = 0;

  const flushByte = (b: number) => {
    subBlock[subBlockLen++] = b;
    if (subBlockLen === 255) {
      output.push(255);
      for (let i = 0; i < 255; i++) output.push(subBlock[i]);
      subBlockLen = 0;
    }
  };

  const writeCode = (code: number, bits: number) => {
    curAccum |= code << curBits;
    curBits += bits;
    while (curBits >= 8) {
      flushByte(curAccum & 0xff);
      curAccum >>= 8;
      curBits -= 8;
    }
  };

  // Dictionary table: prefix * 256 + suffix -> code
  const dict = new Int32Array(4096 * 256).fill(-1);
  let nextCode = eoiCode + 1;
  let codeSize = minCodeSize + 1;

  const resetDict = () => {
    dict.fill(-1);
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  };

  writeCode(clearCode, codeSize);

  if (indexStream.length > 0) {
    let prefix = indexStream[0];

    for (let i = 1; i < indexStream.length; i++) {
      const k = indexStream[i];
      const dictKey = (prefix << 8) | k;
      const existing = dict[dictKey];

      if (existing !== -1) {
        prefix = existing;
      } else {
        writeCode(prefix, codeSize);
        if (nextCode <= MAX_DICT_CODE) {
          dict[dictKey] = nextCode;
          if (nextCode === 1 << codeSize && codeSize < 12) {
            codeSize++;
          }
          nextCode++;
        } else {
          writeCode(clearCode, codeSize);
          resetDict();
        }
        prefix = k;
      }
    }

    writeCode(prefix, codeSize);
  }

  writeCode(eoiCode, codeSize);

  if (curBits > 0) {
    flushByte(curAccum & 0xff);
  }

  if (subBlockLen > 0) {
    output.push(subBlockLen);
    for (let i = 0; i < subBlockLen; i++) output.push(subBlock[i]);
  }

  // Block terminator
  output.push(0x00);

  return new Uint8Array(output);
}

/**
 * Encodes an array of ImageData frames into an infinitely looping animated GIF89a Blob.
 */
export function encodeAnimatedGif(
  frames: ImageData[],
  width: number,
  height: number,
  delayMs = 80
): Blob {
  const palette = buildBlueprintPalette();
  const quantize = createQuantizer(palette);
  const chunks: Uint8Array[] = [];

  const writeBytes = (...bytes: number[]) => {
    chunks.push(new Uint8Array(bytes));
  };

  const writeUint16LE = (val: number) => {
    chunks.push(new Uint8Array([val & 0xff, (val >> 8) & 0xff]));
  };

  // 1. GIF89a Header
  writeBytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // "GIF89a"

  // 2. Logical Screen Descriptor
  writeUint16LE(width);
  writeUint16LE(height);
  writeBytes(
    0xf7, // Global Color Table Flag (1), Color Res (7), Sort (0), GCT Size (7 -> 256 colors)
    0x00, // Background Color Index
    0x00  // Pixel Aspect Ratio
  );

  // 3. Global Color Table (768 bytes)
  chunks.push(palette);

  // 4. Netscape 2.0 Application Extension for Infinite Looping
  writeBytes(
    0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, // "NETSCAPE2.0"
    0x03, 0x01, 0x00, 0x00, 0x00 // Loop forever
  );

  const delayHundredths = Math.max(2, Math.round(delayMs / 10));

  // 5. Encode each frame
  for (const frame of frames) {
    // Graphic Control Extension
    writeBytes(
      0x21, 0xf9, 0x04,
      0x04, // Disposal method: Do not dispose (1)
      delayHundredths & 0xff,
      (delayHundredths >> 8) & 0xff,
      0x00, // Transparent color index (unused)
      0x00  // Block terminator
    );

    // Image Descriptor
    writeBytes(0x2c);
    writeUint16LE(0); // Left
    writeUint16LE(0); // Top
    writeUint16LE(width);
    writeUint16LE(height);
    writeBytes(0x00); // No local color table

    // Quantize & LZW compress frame
    const indexedPixels = quantize(frame.data);
    const compressed = lzwEncode(indexedPixels, 8);
    chunks.push(compressed);
  }

  // 6. GIF Trailer
  writeBytes(0x3b);

  return new Blob(chunks as BlobPart[], { type: 'image/gif' });
}
