import { useState, useCallback } from 'react';
import { ImageUploader, ParameterControls, ActionButtons } from './components/ImageControls';
import { PixelGrid, ColorPalette } from './components/PixelGrid';
import { BrowsePage } from './components/BrowsePage';
import {
  resizeImage,
  imageDataToPixels,
  mapPixelsToMardPalette,
  countBeads,
  loadImageFromDataUrl,
  type RGB,
} from './utils/imageProcessing';
import { cartoonifyWithDoubao } from './utils/doubaoCartoonify';

type BeadSource = 'original' | 'cartoon' | null;
type Tab = 'generator' | 'browse';

function App() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [beadSourceImage, setBeadSourceImage] = useState<HTMLImageElement | null>(null);
  const [pixelData, setPixelData] = useState<{
    pixels: RGB[][];
    symbolMap: Map<string, string>;
    colorCounts: Map<string, number>;
    totalBeads: number;
  } | null>(null);
  const [gridSize, setGridSize] = useState<[number]>([30]);
  const [colorCount, setColorCount] = useState<[number]>([5]);
  const [showSymbols, setShowSymbols] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCartooning, setIsCartooning] = useState(false);
  const [cartoonDataUrl, setCartoonDataUrl] = useState<string | null>(null);
  const [beadSource, setBeadSource] = useState<BeadSource>(null);
  const [activeTab, setActiveTab] = useState<Tab>('generator');

  const processImage = useCallback((image: HTMLImageElement, size: number, mergeThreshold: number) => {
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const aspectRatio = image.width / image.height;
        let targetWidth = size;
        let targetHeight = Math.round(size / aspectRatio);
        if (targetHeight > size) {
          targetHeight = size;
          targetWidth = Math.round(size * aspectRatio);
        }
        const imageData = resizeImage(image, targetWidth, targetHeight);
        const pixels = imageDataToPixels(imageData);
        const { pixels: mappedPixels, symbolMap } = mapPixelsToMardPalette(pixels, mergeThreshold);
        const { colorCounts, total } = countBeads(mappedPixels);
        setPixelData({ pixels: mappedPixels, symbolMap, colorCounts, totalBeads: total });
      } catch (error) {
        console.error('图片处理失败:', error);
        alert('图片处理失败，请重试');
      } finally {
        setIsProcessing(false);
      }
    }, 0);
  }, []);

  const handleImageLoad = useCallback((image: HTMLImageElement) => {
    setOriginalImage(image);
    setBeadSourceImage(image);
    setCartoonDataUrl(null);
    setPixelData(null);
    setBeadSource(null);
  }, []);

  const handleGridSizeChange = (value: [number]) => {
    setGridSize(value);
    if (beadSourceImage) {
      processImage(beadSourceImage, value[0], colorCount[0]);
    }
  };

  const handleColorCountChange = (value: [number]) => {
    setColorCount(value);
    if (beadSourceImage) {
      processImage(beadSourceImage, gridSize[0], value[0]);
    }
  };

  const handleMakeBeads = () => {
    if (!originalImage) return;
    setBeadSourceImage(originalImage);
    setCartoonDataUrl(null);
    setBeadSource('original');
    processImage(originalImage, gridSize[0], colorCount[0]);
  };

  const handleMakeCartoonBeads = () => {
    if (!originalImage) return;
    setIsCartooning(true);
    setTimeout(async () => {
      try {
        const dataUrl = await cartoonifyWithDoubao(originalImage);
        setCartoonDataUrl(dataUrl);
        const cartoonImg = await loadImageFromDataUrl(dataUrl);
        setBeadSourceImage(cartoonImg);
        setBeadSource('cartoon');
        processImage(cartoonImg, gridSize[0], colorCount[0]);
      } catch (error) {
        console.error('动漫图生成失败:', error);
        const msg = error instanceof Error ? error.message : String(error);
        alert(`动漫图生成失败：${msg}`);
      } finally {
        setIsCartooning(false);
      }
    }, 0);
  };

  const handleExport = () => {
    if (!pixelData) return;
    const canvas = document.getElementById('bead-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'pixel-bead-pattern.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCartoon = () => {
    if (!cartoonDataUrl) return;
    const link = document.createElement('a');
    link.download = 'cartoon.png';
    link.href = cartoonDataUrl;
    link.click();
  };

  const cardClass = 'bg-white border rounded-xl';
  const cardStyle = { borderColor: 'hsl(var(--border))' };
  const headingClass = 'text-base font-semibold';

  const handleBrowseSelect = useCallback((src: string, alt: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      handleImageLoad(img);
      setActiveTab('generator');
    };
    img.onerror = () => alert('图片加载失败');
    img.src = src;
    void alt;
  }, [handleImageLoad]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F1EA' }}>
      <header className="border-b" style={{ backgroundColor: '#5D4A47', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="container mx-auto px-6 py-5">
          <h1 className="text-xl font-semibold" style={{ color: '#FFF8EE' }}>拼豆图纸生成器</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,248,238,0.7)' }}>
            上传图片，生成拼豆 / Q 版卡通图纸
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* 顶部 tab 切换 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('generator')}
            className="px-4 py-2 text-sm rounded-md"
            style={{
              backgroundColor: activeTab === 'generator' ? '#5D4A47' : 'transparent',
              color: activeTab === 'generator' ? '#FFF8EE' : 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            生成器
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className="px-4 py-2 text-sm rounded-md"
            style={{
              backgroundColor: activeTab === 'browse' ? '#5D4A47' : 'transparent',
              color: activeTab === 'browse' ? '#FFF8EE' : 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            浏览
          </button>
        </div>

        {activeTab === 'browse' ? (
          <BrowsePage onSelectImage={handleBrowseSelect} />
        ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-5">
            <div className={`${cardClass} p-5`} style={cardStyle}>
              <h2 className={`${headingClass} mb-4`}>上传图片</h2>
              <ImageUploader onImageLoad={handleImageLoad} />
            </div>

            {originalImage && (
              <>
                <div className={`${cardClass} p-5`} style={cardStyle}>
                  <h2 className={`${headingClass} mb-4`}>参数设置</h2>
                  <ParameterControls
                    gridSize={gridSize}
                    setGridSize={handleGridSizeChange}
                    colorCount={colorCount}
                    setColorCount={handleColorCountChange}
                    showSymbols={showSymbols}
                    setShowSymbols={setShowSymbols}
                    showGridLines={showGridLines}
                    setShowGridLines={setShowGridLines}
                  />
                </div>

                <div className={`${cardClass} p-5`} style={cardStyle}>
                  <h2 className={`${headingClass} mb-4`}>操作</h2>
                  <ActionButtons
                    onExport={handleExport}
                    onPrint={handlePrint}
                    onMakeBeads={handleMakeBeads}
                    onMakeCartoonBeads={handleMakeCartoonBeads}
                    beadLoading={isProcessing}
                    cartoonLoading={isCartooning}
                    exportDisabled={!pixelData}
                  />
                  <p className="text-xs mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    选择"转化为拼豆图"直接生成图纸；选择"AI 生成动漫图"调用豆包 Seedream 4.0 生成动漫图再生成图纸。
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-2 space-y-5">
            {originalImage && (
              <div className={`${cardClass} p-5`} style={cardStyle}>
                <h2 className={`${headingClass} mb-4`}>原图预览</h2>
                <div className="flex justify-center rounded-lg p-3" style={{ backgroundColor: '#FAF7F0' }}>
                  <img
                    src={originalImage.src}
                    alt="original"
                    className="max-w-full h-auto rounded"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              </div>
            )}

            {(isProcessing || isCartooning) && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'hsl(var(--primary))' }}></div>
                <p className="mt-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {isCartooning ? '正在生成动漫图（豆包 Seedream，约 8 秒）...' : '正在处理图片...'}
                </p>
              </div>
            )}

            {cartoonDataUrl && (
              <div className={`${cardClass} p-5`} style={cardStyle}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={headingClass}>动漫图（豆包 Seedream 4.0）</h2>
                  <button
                    onClick={handleExportCartoon}
                    className="px-3 py-1.5 text-sm rounded-md"
                    style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                  >
                    导出动漫图
                  </button>
                </div>
                <div className="flex justify-center rounded-lg p-3" style={{ backgroundColor: '#FAF7F0' }}>
                  <img src={cartoonDataUrl} alt="cartoon" className="max-w-full h-auto rounded" />
                </div>
              </div>
            )}

            {pixelData && (
              <>
                <div className={`${cardClass} p-5`} style={cardStyle}>
                  <h2 className={`${headingClass} mb-4`}>
                    图纸预览{beadSource === 'cartoon' ? ' · 来源：AI 动漫图' : ''}
                  </h2>
                  <PixelGrid
                    pixels={pixelData.pixels}
                    symbolMap={pixelData.symbolMap}
                    showSymbols={showSymbols}
                    showGridLines={showGridLines}
                    cellSize={showSymbols ? 24 : 20}
                  />
                </div>

                <div className={`${cardClass} p-5`} style={cardStyle}>
                  <ColorPalette
                    symbolMap={pixelData.symbolMap}
                    colorCounts={pixelData.colorCounts}
                    totalBeads={pixelData.totalBeads}
                  />
                </div>
              </>
            )}

            {!originalImage && !isProcessing && !isCartooning && (
              <div className={`${cardClass} p-12 text-center`} style={cardStyle}>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  请先上传一张图片开始制作
                </p>
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      <footer className="mt-10 py-5 text-center">
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          拼豆图纸生成器 · 适用于拼豆、钻石画、十字绣等手工艺品制作
        </p>
      </footer>
    </div>
  );
}

export default App;
