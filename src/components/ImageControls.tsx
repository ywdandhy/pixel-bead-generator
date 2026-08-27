import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, Download, Printer, Sparkles, Grid3x3 } from 'lucide-react';

interface ImageUploaderProps {
  onImageLoad: (image: HTMLImageElement) => void;
}

export function ImageUploader({ onImageLoad }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => onImageLoad(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-primary/40'
        }`}
        style={{ backgroundColor: '#FAF7F0' }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">
          拖拽图片到此处，或点击上传
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="default"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-pixel text-[10px] tracking-wide"
          onClick={() => fileInputRef.current?.click()}
        >
          选择图片
        </Button>
      </div>
    </div>
  );
}

interface ParameterControlsProps {
  gridSize: [number];
  setGridSize: (value: [number]) => void;
  colorCount: [number];
  setColorCount: (value: [number]) => void;
  maxColors: [number];
  setMaxColors: (value: [number]) => void;
  showSymbols: boolean;
  setShowSymbols: (value: boolean) => void;
  showGridLines: boolean;
  setShowGridLines: (value: boolean) => void;
  mirror: boolean;
  setMirror: (value: boolean) => void;
}

export function ParameterControls({
  gridSize,
  setGridSize,
  colorCount,
  setColorCount,
  maxColors,
  setMaxColors,
  showSymbols,
  setShowSymbols,
  showGridLines,
  setShowGridLines,
  mirror,
  setMirror,
}: ParameterControlsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="gridSize" className="text-foreground font-pixel text-[10px] tracking-wide">
          格子大小: {gridSize[0]} x {gridSize[0]}
        </Label>
        <div className="flex items-center gap-2">
          <Slider
            id="gridSize"
            min={10}
            max={100}
            step={5}
            value={gridSize}
            onValueChange={setGridSize}
            className="flex-1"
          />
          <input
            type="number"
            id="gridSizeInput"
            min={10}
            max={100}
            step={5}
            value={gridSize[0]}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              if (!isNaN(value) && value >= 10 && value <= 100) {
                setGridSize([value]);
              }
            }}
            className="w-16 px-2 py-1 border rounded text-sm border-border bg-background text-foreground"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          控制图纸的格子数量，数值越大格子越多
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="colorCount" className="text-foreground font-pixel text-[10px] tracking-wide">颜色合并阈值: {colorCount[0]}</Label>
        <div className="flex items-center gap-2">
          <Slider
            id="colorCount"
            min={1}
            max={50}
            step={1}
            value={colorCount}
            onValueChange={setColorCount}
            className="flex-1"
          />
          <input
            type="number"
            id="colorCountInput"
            min={1}
            max={50}
            step={1}
            value={colorCount[0]}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              if (!isNaN(value) && value >= 1 && value <= 50) {
                setColorCount([value]);
              }
            }}
            className="w-16 px-2 py-1 border rounded text-sm border-border bg-background text-foreground"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          像素数少于阈值的颜色会合并到最近邻 MARD 色，避免单像素色污染色卡（调色板为 MARD 221 色固定）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxColors" className="text-foreground font-pixel text-[10px] tracking-wide">
          色号上限: {maxColors[0] === 0 ? '不限' : maxColors[0]}
        </Label>
        <div className="flex items-center gap-2">
          <Slider
            id="maxColors"
            min={0}
            max={64}
            step={1}
            value={maxColors}
            onValueChange={setMaxColors}
            className="flex-1"
          />
          <input
            type="number"
            id="maxColorsInput"
            min={0}
            max={64}
            step={1}
            value={maxColors[0]}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              if (!isNaN(value) && value >= 0 && value <= 64) {
                setMaxColors([value]);
              }
            }}
            className="w-16 px-2 py-1 border rounded text-sm border-border bg-background text-foreground"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          限制拼豆图使用的最多色号数（0=不限）。超出部分按数量从少到多合并到最近邻保留色
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="showSymbols" className="text-foreground font-pixel text-[10px] tracking-wide">显示符号</Label>
          <input
            id="showSymbols"
            type="checkbox"
            checked={showSymbols}
            onChange={(e) => setShowSymbols(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background text-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showGridLines" className="text-foreground font-pixel text-[10px] tracking-wide">显示网格线</Label>
          <input
            id="showGridLines"
            type="checkbox"
            checked={showGridLines}
            onChange={(e) => setShowGridLines(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background text-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="mirror" className="text-foreground font-pixel text-[10px] tracking-wide">左右镜像</Label>
          <input
            id="mirror"
            type="checkbox"
            checked={mirror}
            onChange={(e) => setMirror(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background text-primary"
          />
        </div>
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  onExport: () => void;
  onPrint: () => void;
  onMakeBeads: () => void;
  onMakeCartoonBeads: () => void;
  beadLoading?: boolean;
  cartoonLoading?: boolean;
  exportDisabled?: boolean;
}

export function ActionButtons({
  onExport,
  onPrint,
  onMakeBeads,
  onMakeCartoonBeads,
  beadLoading,
  cartoonLoading,
  exportDisabled,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          onClick={onMakeBeads}
          disabled={beadLoading || cartoonLoading}
          variant="default"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-pixel text-[10px] tracking-wide flex-1"
        >
          <Grid3x3 className="mr-2 h-4 w-4" />
          {beadLoading ? '生成中...' : '转化为拼豆图'}
        </Button>
        <Button
          onClick={onMakeCartoonBeads}
          disabled={beadLoading || cartoonLoading}
          variant="default"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-pixel text-[10px] tracking-wide flex-1"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {cartoonLoading ? '生成中...' : 'AI 生成动漫图'}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={onExport} disabled={exportDisabled} variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground font-pixel text-[10px] tracking-wide flex-1">
          <Download className="mr-2 h-4 w-4" />
          导出图片
        </Button>
        <Button onClick={onPrint} disabled={exportDisabled} variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground font-pixel text-[10px] tracking-wide flex-1">
          <Printer className="mr-2 h-4 w-4" />
          打印图纸
        </Button>
      </div>
    </div>
  );
}
