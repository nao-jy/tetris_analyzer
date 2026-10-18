import type { Piece } from "../coldclear/cold_clear_2";

type Cell = Piece | "G" | null;

type Hsv = { h: number; s: number; v: number };

// Hue centers follow the colors used by common guideline-style Tetris games.
// The wider color families account for different game palettes and capture
// color shifts caused by browser/video rendering.
const PIECE_HUES: Array<{ piece: Piece; hue: number }> = [
  { piece: "I", hue: 186 },
  { piece: "O", hue: 52 },
  { piece: "T", hue: 278 },
  { piece: "L", hue: 25 },
  { piece: "J", hue: 218 },
  { piece: "S", hue: 112 },
  { piece: "Z", hue: 0 },
];

function rgbToHsv(r: number, g: number, b: number): Hsv {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  return { h: (hue + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

function hueDistance(a: number, b: number) {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
}

function classifyPixel(hsv: Hsv): Piece | "G" | null {
  // Dark pixels are mostly the playfield and its shadows. Ignore them so
  // glowing background effects cannot vote for a piece color.
  if (hsv.v < 0.27) return null;

  // Garbage in the reference image is a bright, nearly neutral gray. Requiring
  // bright neutral pixels avoids treating the dark gray playfield as garbage.
  if (hsv.s < 0.2) return hsv.v >= 0.58 ? "G" : null;
  if (hsv.s < 0.34) return null;

  let closest: Piece | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of PIECE_HUES) {
    const distance = hueDistance(hsv.h, candidate.hue);
    if (distance < closestDistance) {
      closest = candidate.piece;
      closestDistance = distance;
    }
  }

  // Leave unusual effects and heavily shifted colors unclassified.
  return closestDistance <= 34 ? closest : null;
}

function classifyCell(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  left: number,
  top: number,
  width: number,
  height: number,
): Cell {
  // The outer part of each tile contains grid lines, outlines and neighboring
  // glow. The center is much more representative of the actual block fill.
  const x0 = Math.max(0, Math.floor(left + width * 0.22));
  const x1 = Math.min(imageWidth, Math.ceil(left + width * 0.78));
  const y0 = Math.max(0, Math.floor(top + height * 0.2));
  const y1 = Math.min(imageHeight, Math.ceil(top + height * 0.8));
  const votes = new Map<Piece | "G", number>();
  let sampleCount = 0;

  // Sampling every other pixel is enough at typical board screenshot sizes,
  // while keeping analysis fast for tall boards.
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      sampleCount += 1;
      const offset = (y * imageWidth + x) * 4;
      const result = classifyPixel(
        rgbToHsv(pixels[offset], pixels[offset + 1], pixels[offset + 2]),
      );
      if (result) votes.set(result, (votes.get(result) ?? 0) + 1);
    }
  }

  if (sampleCount === 0 || votes.size === 0) return null;
  const [winner, count] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
  const confidence = count / sampleCount;

  // Require broad support inside the cell. A spark or a thin trail should not
  // fill an otherwise empty cell.
  const minimumCoverage = winner === "G" ? 0.42 : 0.28;
  return confidence >= minimumCoverage ? winner : null;
}

export async function imageToBoard(dataUrl: string, rows: number): Promise<Cell[][]> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("撮影画像を読み込めませんでした"));
    image.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("画像解析用のCanvasを作成できませんでした");
  context.drawImage(image, 0, 0);
  const { data, width, height } = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: 10 }, (_, column) =>
      classifyCell(
        data,
        width,
        height,
        (column * width) / 10,
        (row * height) / rows,
        width / 10,
        height / rows,
      ),
    ),
  );
}
