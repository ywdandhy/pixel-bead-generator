import { MARD_RGB } from '@/data/mardPalette';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// 将图像调整为指定宽高
export function resizeImage(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('无法获取 canvas context');
  }
  
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

// ImageData 转换为像素矩阵
export function imageDataToPixels(imageData: ImageData): RGB[][] {
  const { width, height, data } = imageData;
  const pixels: RGB[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: RGB[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      });
    }
    pixels.push(row);
  }
  
  return pixels;
}

// 将每个像素映射到 MARD 221 色调色板中最近的颜色（欧氏距离，平方比较省 sqrt）。
// mergeThreshold：颜色颗数少于阈值的，合并到最近邻的"够数"颜色，避免零碎单像素色污染色卡。
export function mapPixelsToMardPalette(
  pixels: RGB[][],
  mergeThreshold = 5
): { pixels: RGB[][]; symbolMap: Map<string, string> } {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  const N = MARD_RGB.length;

  // 1. 每像素找最近 MARD 色
  const idxIndex: Int16Array[] = new Array(h);
  const mapped: RGB[][] = new Array(h);
  for (let y = 0; y < h; y++) {
    const row = pixels[y];
    const mappedRow: RGB[] = new Array(w);
    const idxRow = new Int16Array(w);
    for (let x = 0; x < w; x++) {
      const px = row[x];
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < N; i++) {
        const c = MARD_RGB[i];
        const dr = px.r - c.r;
        const dg = px.g - c.g;
        const db = px.b - c.b;
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      const c = MARD_RGB[bestIdx];
      mappedRow[x] = { r: c.r, g: c.g, b: c.b };
      idxRow[x] = bestIdx;
    }
    mapped[y] = mappedRow;
    idxIndex[y] = idxRow;
  }

  // 2. 统计每个 MARD 色的颗数
  const counts = new Int32Array(N);
  for (let y = 0; y < h; y++) {
    const row = idxIndex[y];
    for (let x = 0; x < w; x++) counts[row[x]]++;
  }

  // 3. 颗数 < threshold 的色，重映射到最近邻"够数"色
  const remap = new Int16Array(N);
  for (let i = 0; i < N; i++) remap[i] = i;
  const aboveIdx: number[] = [];
  for (let i = 0; i < N; i++) if (counts[i] >= mergeThreshold) aboveIdx.push(i);

  if (aboveIdx.length > 0) {
    for (let i = 0; i < N; i++) {
      if (counts[i] >= mergeThreshold) continue;
      const src = MARD_RGB[i];
      let bestJ = aboveIdx[0];
      let bestDist = Infinity;
      for (const j of aboveIdx) {
        const tgt = MARD_RGB[j];
        const dr = src.r - tgt.r;
        const dg = src.g - tgt.g;
        const db = src.b - tgt.b;
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) { bestDist = d; bestJ = j; }
      }
      remap[i] = bestJ;
    }
    for (let y = 0; y < h; y++) {
      const idxRow = idxIndex[y];
      const mappedRow = mapped[y];
      for (let x = 0; x < w; x++) {
        const newIdx = remap[idxRow[x]];
        idxRow[x] = newIdx;
        const c = MARD_RGB[newIdx];
        mappedRow[x] = { r: c.r, g: c.g, b: c.b };
      }
    }
  }

  // 4. 构建 symbolMap：colorKey "r,g,b" → MARD 色号
  const symbolMap = new Map<string, string>();
  for (let y = 0; y < h; y++) {
    const idxRow = idxIndex[y];
    const mappedRow = mapped[y];
    for (let x = 0; x < w; x++) {
      const c = mappedRow[x];
      const key = `${c.r},${c.g},${c.b}`;
      if (!symbolMap.has(key)) symbolMap.set(key, MARD_RGB[idxRow[x]].code);
    }
  }

  return { pixels: mapped, symbolMap };
}

// RGB 转 Hex
export function rgbToHex(rgb: RGB): string {
  return '#' + [rgb.r, rgb.g, rgb.b]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

// 计算每个颜色的拼豆数量及总数
export function countBeads(pixels: RGB[][]): {
  colorCounts: Map<string, number>;
  total: number;
} {
  const colorCounts = new Map<string, number>();
  let total = 0;
  for (const row of pixels) {
    for (const px of row) {
      const key = `${px.r},${px.g},${px.b}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      total++;
    }
  }
  return { colorCounts, total };
}

// 从 data URL 加载为 HTMLImageElement
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
