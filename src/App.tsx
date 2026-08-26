import { useState, useCallback } from 'react';
import { ImageUploader, ParameterControls, ActionButtons } from './components/ImageControls';
import { PixelGrid } from './components/PixelGrid';
import { BrowsePage } from './components/BrowsePage';
import { MyRecordsPage } from './components/MyRecordsPage';
import {
  resizeImage,
  imageDataToPixels,
  mapPixelsToMardPalette,
  countBeads,
  loadImageFromDataUrl,
  type RGB,
} from './utils/imageProcessing';
import { cartoonifyWithDoubao } from './utils/doubaoCartoonify';
import { renderBeadDataUrl } from './utils/beadRenderer';
import { saveGalleryEntry, makeEntryId, type GalleryEntry } from './utils/galleryStorage';

type BeadSource = 'original' | 'cartoon' | null;
type Tab = 'generator' | 'browse' | 'records';

function App() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [beadSourceImage, setBeadSourceImage] = useState<HTMLImageElement | null>(null);
  const [pixelData, setPixelData] = useState<{
    pixels: RGB[][];
    symbolMap: Map<string, string>;
    colorCounts: Map<string, number>;
    totalBeads: number;
  } | null>(null);
  const [gridSize, setGridSize] = useState<[number]>([100]);
  const [colorCount, setColorCount] = useState<[number]>([10]);
  const [showSymbols, setShowSymbols] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCartooning, setIsCartooning] = useState(false);
  const [cartoonDataUrl, setCartoonDataUrl] = useState<string | null>(null);
  const [beadSource, setBeadSource] = useState<BeadSource>(null);
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  const [galleryVersion, setGalleryVersion] = useState(0);

  const processImage = useCallback(async (
    image: HTMLImageElement,
    size: number,
    mergeThreshold: number,
    mirror: boolean,
    captureBead = false,
  ): Promise<string | null> => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 0));
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
      const finalPixels = mirror ? mappedPixels.map(row => [...row].reverse()) : mappedPixels;
      const { colorCounts, total } = countBeads(finalPixels);
      setPixelData({ pixels: finalPixels, symbolMap, colorCounts, totalBeads: total });
      if (captureBead) {
        return renderBeadDataUrl(finalPixels, symbolMap, {
          showSymbols,
          showGridLines,
          cellSize: showSymbols ? 24 : 20,
        });
      }
      return null;
    } catch (error) {
      console.error('图片处理失败:', error);
      alert('图片处理失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [showSymbols, showGridLines]);

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
      void processImage(beadSourceImage, value[0], colorCount[0], mirror);
    }
  };

  const handleColorCountChange = (value: [number]) => {
    setColorCount(value);
    if (beadSourceImage) {
      void processImage(beadSourceImage, gridSize[0], value[0], mirror);
    }
  };

  const handleMirrorChange = (value: boolean) => {
    setMirror(value);
    if (beadSourceImage) {
      void processImage(beadSourceImage, gridSize[0], colorCount[0], value);
    }
  };

  const handleMakeBeads = async () => {
    if (!originalImage) return;
    setBeadSourceImage(originalImage);
    setCartoonDataUrl(null);
    setBeadSource('original');
    try {
      const beadDataUrl = await processImage(originalImage, gridSize[0], colorCount[0], mirror, true);
      if (beadDataUrl) {
        await saveGalleryEntry({
          id: makeEntryId(),
          createdAt: Date.now(),
          category: '我的上传',
          name: '我的上传',
          tags: [],
          original: originalImage.src,
          anime: null,
          bead: beadDataUrl,
        });
        setGalleryVersion(v => v + 1);
      }
    } catch {
      // processImage 已经 alert 过
    }
  };

  const handleMakeCartoonBeads = async () => {
    if (!originalImage) return;
    setIsCartooning(true);
    try {
      const dataUrl = await cartoonifyWithDoubao(originalImage);
      setCartoonDataUrl(dataUrl);
      const cartoonImg = await loadImageFromDataUrl(dataUrl);
      setBeadSourceImage(cartoonImg);
      setBeadSource('cartoon');
      const beadDataUrl = await processImage(cartoonImg, gridSize[0], colorCount[0], mirror, true);
      if (beadDataUrl) {
        await saveGalleryEntry({
          id: makeEntryId(),
          createdAt: Date.now(),
          category: '我的上传',
          name: '我的上传',
          tags: [],
          original: originalImage.src,
          anime: dataUrl,
          bead: beadDataUrl,
        });
        setGalleryVersion(v => v + 1);
      }
    } catch (error) {
      console.error('动漫图生成失败:', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`动漫图生成失败：${msg}`);
    } finally {
      setIsCartooning(false);
    }
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

  const cardClass = 'bg-white border-2 rounded-none shadow-pixel';
  const cardStyle = { borderColor: '#3A2A24' };
  const headingClass = 'text-sm font-pixel tracking-wide';

  const handleBrowseSelect = useCallback((entry: GalleryEntry) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 加载原图 + 自动生成拼豆图(用当前 gridSize/colorCount/mirror 设置)
      setOriginalImage(img);
      setBeadSourceImage(img);
      setCartoonDataUrl(null);
      setBeadSource('original');
      setPixelData(null);
      void processImage(img, gridSize[0], colorCount[0], mirror);
      setActiveTab('generator');
    };
    img.onerror = () => alert('图片加载失败');
    img.src = entry.original;
  }, [handleImageLoad, processImage, gridSize, colorCount, mirror]);

  return (
    <div className="min-h-screen">
      <header className="border-b-2" style={{ backgroundColor: '#5D4A47', borderColor: '#3A2A24' }}>
        <div className="container mx-auto px-6 py-5">
          <h1 className="text-sm font-pixel tracking-wide" style={{ color: '#FFF8EE' }}>拼豆图纸生成器</h1>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,248,238,0.7)' }}>
            上传图片，生成拼豆 / Q 版卡通图纸
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* 顶部 tab 切换 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('generator')}
            className="px-4 py-2 text-xs font-pixel tracking-wide rounded-none"
            style={{
              backgroundColor: activeTab === 'generator' ? '#5D4A47' : 'transparent',
              color: activeTab === 'generator' ? '#FFF8EE' : 'hsl(var(--foreground))',
              border: '2px solid #3A2A24',
            }}
          >
            生成器
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className="px-4 py-2 text-xs font-pixel tracking-wide rounded-none"
            style={{
              backgroundColor: activeTab === 'browse' ? '#5D4A47' : 'transparent',
              color: activeTab === 'browse' ? '#FFF8EE' : 'hsl(var(--foreground))',
              border: '2px solid #3A2A24',
            }}
          >
            图库
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className="px-4 py-2 text-xs font-pixel tracking-wide rounded-none"
            style={{
              backgroundColor: activeTab === 'records' ? '#5D4A47' : 'transparent',
              color: activeTab === 'records' ? '#FFF8EE' : 'hsl(var(--foreground))',
              border: '2px solid #3A2A24',
            }}
          >
            我的记录
          </button>
        </div>

        {activeTab === 'browse' ? (
          <BrowsePage onSelectImage={handleBrowseSelect} refreshKey={galleryVersion} />
        ) : activeTab === 'records' ? (
          <MyRecordsPage refreshKey={galleryVersion} onSelectImage={handleBrowseSelect} />
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
                    mirror={mirror}
                    setMirror={handleMirrorChange}
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
                    选择"转化为拼豆图"直接生成图纸；选择"AI 生成动漫图"调用豆包 Seedream 5.0 Pro 生成动漫图再生成图纸。两种方式均会保存原图+动漫图+拼豆图三张到图片库（原图直转无动漫图）。
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
                  <h2 className={headingClass}>动漫图（豆包 Seedream 5.0 Pro）</h2>
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
