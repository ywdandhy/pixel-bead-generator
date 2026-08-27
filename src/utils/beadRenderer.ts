// 离屏 canvas 渲染拼豆图,用于保存到图库(不依赖 PixelGrid 的 DOM canvas)。
// 顶部加"逗豆乐拼馆"logo 标题头,网格中央加对角线水印,可选 colorCounts + totalBeads 时下方追加图例。
import type { RGB } from './imageProcessing';

export interface BeadRenderOptions {
  showSymbols: boolean;
  showGridLines: boolean;
  cellSize: number;
  colorCounts?: Map<string, number>;
  totalBeads?: number;
}

const BRAND = '逗豆乐拼馆';
const HEADER_H = 64;
const LOGO_PATH = '/logo.png';

// 预加载 logo 图片(模块级,首次 import 就开始加载)
let logoImg: HTMLImageElement | null = null;
const logoLoader = new Image();
logoLoader.onload = () => { logoImg = logoLoader; };
logoLoader.onerror = () => { logoImg = null; };
logoLoader.src = LOGO_PATH;

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
  canvas.height = HEADER_H + gridH + legendH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 顶部标题头:逗豆乐拼馆 logo(图片优先,未加载完则用文字 fallback)
  ctx.fillStyle = '#5D4A47';
  ctx.fillRect(0, 0, gridW, HEADER_H);
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    // 绘制 logo 图片,等比缩放到 header 高度,居中
    const logoH = HEADER_H - 12;
    const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
    const logoX = (gridW - logoW) / 2;
    const logoY = 6;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
  } else {
    // fallback:纯文字 logo
    ctx.fillStyle = '#FFF8EE';
    ctx.font = `bold 30px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(BRAND, gridW / 2, HEADER_H / 2);
  }

  // 网格(偏移 HEADER_H)
  const gridOffsetY = HEADER_H;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = pixels[y][x];
      const posX = x * cellSize;
      const posY = gridOffsetY + y * cellSize;

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

  // 对角线水印:逗豆乐拼馆(半透明,覆盖网格中央)
  ctx.save();
  ctx.translate(gridW / 2, gridOffsetY + gridH / 2);
  ctx.rotate(-Math.PI / 6);
  const wmFontSize = Math.max(80, Math.min(gridW, gridH) / 5);
  ctx.font = `bold ${wmFontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 描边 + 填充,双重水印效果
  ctx.strokeStyle = 'rgba(93, 74, 71, 0.10)';
  ctx.lineWidth = 4;
  ctx.strokeText(BRAND, 0, 0);
  ctx.fillStyle = 'rgba(93, 74, 71, 0.06)';
  ctx.fillText(BRAND, 0, 0);
  ctx.restore();

  // 图例区(网格下方)
  if (colorCounts && legendColors.length > 0) {
    const legendStartY = gridOffsetY + gridH;

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
