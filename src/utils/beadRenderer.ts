// 离屏 canvas 渲染拼豆图,用于保存到图库(不依赖 PixelGrid 的 DOM canvas)。
// 可选 colorCounts + totalBeads 时,在网格下方追加图例(颜色 + 符号 + 数量)。
import type { RGB } from './imageProcessing';

export interface BeadRenderOptions {
  showSymbols: boolean;
  showGridLines: boolean;
  cellSize: number;
  colorCounts?: Map<string, number>;
  totalBeads?: number;
}

// 图例单格尺寸(固定,与网格 cellSize 解耦)
const LEGEND_PADDING = 16;
const LEGEND_CELL_W = 220;
const LEGEND_CELL_H = 60;
const LEGEND_SWATCH = 48;
const LEGEND_TITLE_H = 56;

export function renderBeadCanvas(
  pixels: RGB[][],
  symbolMap: Map<string, string>,
  options: BeadRenderOptions
): HTMLCanvasElement {
  const { showSymbols, showGridLines, cellSize, colorCounts, totalBeads } = options;
  const height = pixels.length;
  const width = pixels[0].length;
  const gridW = width * cellSize;
  const gridH = height * cellSize;

  // 计算图例区高度
  const colors = Array.from(symbolMap.entries()).map(([colorKey, symbol]) => {
    const [r, g, b] = colorKey.split(',').map(Number);
    const count = colorCounts?.get(colorKey) ?? 0;
    return { r, g, b, symbol, count, colorKey };
  });
  const legendColors = colors.sort((a, b) => b.count - a.count);

  let legendH = 0;
  if (colorCounts && legendColors.length > 0) {
    const cols = Math.max(1, Math.floor((gridW - LEGEND_PADDING * 2) / LEGEND_CELL_W));
    const rows = Math.ceil(legendColors.length / cols);
    legendH = LEGEND_TITLE_H + rows * LEGEND_CELL_H + LEGEND_PADDING * 2;
  }

  const canvas = document.createElement('canvas');
  canvas.width = gridW;
  canvas.height = gridH + legendH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 网格
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = pixels[y][x];
      const posX = x * cellSize;
      const posY = y * cellSize;

      ctx.fillStyle = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`;
      ctx.fillRect(posX, posY, cellSize, cellSize);

      if (showGridLines) {
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(posX, posY, cellSize, cellSize);
      }

      if (showSymbols) {
        const colorKey = `${pixel.r},${pixel.g},${pixel.b}`;
        const symbol = symbolMap.get(colorKey) || '';
        const len = symbol.length;
        const fontSize = len <= 1 ? cellSize * 0.6 : len === 2 ? cellSize * 0.5 : cellSize * 0.4;
        ctx.fillStyle = getContrastColor(pixel);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, posX + cellSize / 2, posY + cellSize / 2);
      }
    }
  }

  // 图例区(网格下方)
  if (colorCounts && legendColors.length > 0) {
    const legendStartY = gridH;

    // 分隔线
    ctx.strokeStyle = '#3A2A24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, legendStartY);
    ctx.lineTo(gridW, legendStartY);
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#3A2A24';
    ctx.font = `bold 28px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `颜色图例 · MARD 221 色 · 共 ${totalBeads ?? legendColors.reduce((s, c) => s + c.count, 0)} 颗 · ${legendColors.length} 种`,
      LEGEND_PADDING,
      legendStartY + LEGEND_TITLE_H / 2,
    );

    // 颜色格子
    const cols = Math.max(1, Math.floor((gridW - LEGEND_PADDING * 2) / LEGEND_CELL_W));
    const gridStartY = legendStartY + LEGEND_TITLE_H;
    legendColors.forEach((color, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = LEGEND_PADDING + col * LEGEND_CELL_W;
      const y = gridStartY + row * LEGEND_CELL_H;

      // 色块
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.fillRect(x, y + (LEGEND_CELL_H - LEGEND_SWATCH) / 2, LEGEND_SWATCH, LEGEND_SWATCH);
      ctx.strokeStyle = '#3A2A24';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y + (LEGEND_CELL_H - LEGEND_SWATCH) / 2, LEGEND_SWATCH, LEGEND_SWATCH);

      // 符号 + 数量
      ctx.fillStyle = '#3A2A24';
      ctx.font = `bold 22px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(color.symbol, x + LEGEND_SWATCH + 12, y + LEGEND_CELL_H / 2 - 10);

      ctx.font = `18px Arial`;
      ctx.fillStyle = '#666666';
      ctx.fillText(`${color.count} 颗`, x + LEGEND_SWATCH + 12, y + LEGEND_CELL_H / 2 + 14);
    });
  }

  return canvas;
}

export function renderBeadDataUrl(
  pixels: RGB[][],
  symbolMap: Map<string, string>,
  options: BeadRenderOptions
): string {
  return renderBeadCanvas(pixels, symbolMap, options).toDataURL('image/png');
}

function getContrastColor(rgb: RGB): string {
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
