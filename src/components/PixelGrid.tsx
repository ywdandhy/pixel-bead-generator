import { useRef, useEffect, useState } from 'react';
import { RGB, rgbToHex } from '@/utils/imageProcessing';
import { renderBeadCanvas } from '@/utils/beadRenderer';

interface PixelGridProps {
  pixels: RGB[][];
  symbolMap: Map<string, string>;
  showSymbols: boolean;
  showGridLines: boolean;
  cellSize?: number;
  colorCounts?: Map<string, number>;
  totalBeads?: number;
}

export function PixelGrid({
  pixels,
  symbolMap,
  showSymbols,
  showGridLines,
  cellSize = 20,
  colorCounts,
  totalBeads,
}: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || pixels.length === 0) return;

    // 用离屏 canvas 渲染(网格 + 图例),再画到 DOM canvas 上,避免逻辑重复
    const offscreen = renderBeadCanvas(pixels, symbolMap, {
      showSymbols,
      showGridLines,
      cellSize,
      colorCounts,
      totalBeads,
    });

    const canvas = canvasRef.current;
    canvas.width = offscreen.width;
    canvas.height = offscreen.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(offscreen, 0, 0);
  }, [pixels, symbolMap, showSymbols, showGridLines, cellSize, colorCounts, totalBeads]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`rounded-lg bg-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className="flex justify-between items-center px-3 py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        <h3 className="text-[10px] font-pixel tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>图纸预览</h3>
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
          className={`block ${isFullscreen ? 'h-full w-full object-contain' : 'max-w-full h-auto'}`}
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
      <h3 className="text-xs font-pixel tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>颜色图例 · MARD 221 色</h3>
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
