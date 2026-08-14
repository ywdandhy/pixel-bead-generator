import { useRef, useEffect, useState } from 'react';
import { RGB, rgbToHex } from '@/utils/imageProcessing';

interface PixelGridProps {
  pixels: RGB[][];
  symbolMap: Map<string, string>;
  showSymbols: boolean;
  showGridLines: boolean;
  cellSize?: number;
}

export function PixelGrid({
  pixels,
  symbolMap,
  showSymbols,
  showGridLines,
  cellSize = 20,
}: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || pixels.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const height = pixels.length;
    const width = pixels[0].length;

    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    // 清空画布
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制格子
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = pixels[y][x];
        const posX = x * cellSize;
        const posY = y * cellSize;

        // 填充颜色
        ctx.fillStyle = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`;
        ctx.fillRect(posX, posY, cellSize, cellSize);

        // 绘制网格线
        if (showGridLines) {
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          ctx.strokeRect(posX, posY, cellSize, cellSize);
        }

        // 绘制符号（MARD 色号，2-3 字符）
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
  }, [pixels, symbolMap, showSymbols, showGridLines, cellSize]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`rounded-lg bg-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className="flex justify-between items-center px-3 py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        <h3 className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>图纸预览</h3>
        <button
          onClick={toggleFullscreen}
          className="px-2 py-1 text-xs rounded"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {isFullscreen ? '退出全屏' : '全屏查看'}
        </button>
      </div>
      <div className={`relative ${isFullscreen ? 'h-full w-full' : 'overflow-auto'}`}>
        <canvas
          id="bead-canvas"
          ref={canvasRef}
          className={`block ${isFullscreen ? 'h-full w-full object-contain' : ''}`}
        />
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// 获取对比色（黑色或白色）
function getContrastColor(rgb: RGB): string {
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

interface ColorPaletteProps {
  symbolMap: Map<string, string>;
  colorCounts?: Map<string, number>;
  totalBeads?: number;
}

export function ColorPalette({ symbolMap, colorCounts, totalBeads }: ColorPaletteProps) {
  const colors = Array.from(symbolMap.entries()).map(([colorKey, symbol]) => {
    const [r, g, b] = colorKey.split(',').map(Number);
    const count = colorCounts?.get(colorKey) ?? 0;
    const hex = rgbToHex({ r, g, b });
    return { r, g, b, symbol, count, colorKey, hex };
  });

  const total = totalBeads ?? colors.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>颜色图例 · MARD 221 色</h3>
      <div className="grid grid-cols-2 gap-2">
        {colors.map((color, idx) => {
          const pct = total > 0 ? (color.count / total) * 100 : 0;
          return (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded-md text-xs"
              style={{ backgroundColor: '#FAF7F0', color: 'hsl(var(--foreground))' }}
            >
              <div
                className="w-6 h-6 rounded shrink-0"
                style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-mono font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  {color.symbol} · {color.count} 颗
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {color.hex} · {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs font-medium pt-1" style={{ color: 'hsl(var(--foreground))' }}>
        共 {colors.length} 种颜色，{total} 颗拼豆
      </p>
    </div>
  );
}
