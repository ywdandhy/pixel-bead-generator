import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePreviewModal } from './ImagePreviewModal';
import {
  getAllGalleryEntries,
  deleteGalleryEntry,
  clearGallery,
  saveGalleryEntry,
  makeEntryId,
  getImportedCuratedUrls,
  markCuratedUrlImported,
  clearImportedCuratedUrls,
  type GalleryEntry,
} from '@/utils/galleryStorage';
import {
  resizeImage,
  imageDataToPixels,
  mapPixelsToMardPalette,
  countBeads,
} from '@/utils/imageProcessing';
import { renderBeadDataUrl } from '@/utils/beadRenderer';
import { CURATED_CHARACTERS, type CuratedCharacter } from '@/data/curatedCharacters';
import { BigThumb } from './GalleryCommon';

interface BrowsePageProps {
  onSelectImage: (entry: GalleryEntry) => void;
  refreshKey: number;
}

type PreviewKind = 'original' | 'anime' | 'bead';

// 标签分组顺序(未列出的标签会按字母序追加在末尾)。'我的上传' 不在图库,在「我的记录」页
const CATEGORY_ORDER = ['奥特曼', '动漫', '王者荣耀', '英雄联盟', 'DOTA2', '童话', 'NBA', '明星', '运动', '爱豆', '汽车'];

// 批量导入默认参数(与 App.tsx 默认值一致:100×100 格,合并阈值 10,显示符号+网格线)
const BATCH_GRID_SIZE = 100;
const BATCH_COLOR_COUNT = 10;
const BATCH_MAX_COLORS = 0;

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = url;
  });
}

function imageToJpegDataUrl(img: HTMLImageElement, maxDim = 1024, quality = 0.85): string {
  const aspect = img.naturalWidth / img.naturalHeight;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxDim || h > maxDim) {
    if (w >= h) { w = maxDim; h = Math.max(1, Math.round(maxDim / aspect)); }
    else { h = maxDim; w = Math.max(1, Math.round(maxDim * aspect)); }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取 canvas context');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

async function processCuratedToBead(img: HTMLImageElement): Promise<{ originalDataUrl: string; beadDataUrl: string }> {
  const originalDataUrl = imageToJpegDataUrl(img);
  const size = BATCH_GRID_SIZE;
  const aspectRatio = img.naturalWidth / img.naturalHeight;
  let targetWidth = size;
  let targetHeight = Math.round(size / aspectRatio);
  if (targetHeight > size) {
    targetHeight = size;
    targetWidth = Math.round(size * aspectRatio);
  }
  const imageData = resizeImage(img, targetWidth, targetHeight);
  const pixels = imageDataToPixels(imageData);
  const { pixels: mappedPixels, symbolMap } = mapPixelsToMardPalette(pixels, BATCH_COLOR_COUNT, BATCH_MAX_COLORS);
  const { colorCounts, total } = countBeads(mappedPixels);
  const beadDataUrl = renderBeadDataUrl(mappedPixels, symbolMap, {
    showSymbols: true,
    showGridLines: true,
    cellSize: 24,
    colorCounts,
    totalBeads: total,
  });
  return { originalDataUrl, beadDataUrl };
}

export function BrowsePage({ onSelectImage, refreshKey }: BrowsePageProps) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ entry: GalleryEntry; kind: PreviewKind } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(24);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllGalleryEntries();
      const filtered = all.filter(e => e.category !== '我的上传');
      setEntries(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [refreshKey]);

  const searchedEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return entries.filter(e => {
      const name = (e.name || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      const tags = (e.tags || []).join(' ').toLowerCase();
      return name.includes(q) || cat.includes(q) || tags.includes(q);
    });
  }, [entries, searchQuery]);

  // 按选中的标签筛选(搜索激活时忽略标签筛选)
  const taggedEntries = useMemo(() => {
    if (selectedTag === 'all') return entries;
    return entries.filter(e => (e.category || '未分类') === selectedTag);
  }, [entries, selectedTag]);

  const displayedEntries = searchedEntries ?? taggedEntries;

  // 可用标签列表(按 CATEGORY_ORDER 排序,带数量)
  const tags = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      const t = e.category || '未分类';
      map.set(t, (map.get(t) || 0) + 1);
    });
    const present = [...map.entries()].map(([id, count]) => ({ id, label: id, count }));
    present.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.id);
      const bi = CATEGORY_ORDER.indexOf(b.id);
      if (ai === -1 && bi === -1) return a.id.localeCompare(b.id);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return present;
  }, [entries]);

  const visibleEntries = displayedEntries.slice(0, visibleCount);
  const hasMore = displayedEntries.length > visibleCount;

  // 标签或搜索变化时重置分页
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedTag, searchQuery]);

  // 下拉自动分页:IntersectionObserver 监测哨兵元素
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(c => c + 24);
      }
    }, { rootMargin: '400px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const handleDelete = async (id: string) => {
    try {
      await deleteGalleryEntry(id);
      // 轻量刷新:只重新拉取条目,不动 loading 状态(避免闪烁),不刷新页面
      const all = await getAllGalleryEntries();
      setEntries(all.filter(e => e.category !== '我的上传'));
    } catch (e) {
      alert(`删除失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('确定清空所有生成记录？此操作不可恢复。')) return;
    try {
      await clearGallery();
      clearImportedCuratedUrls();
      void load();
    } catch (e) {
      alert(`清空失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const [batchProgress, setBatchProgress] = useState<{
    running: boolean;
    done: number;
    total: number;
    current: string | null;
    errors: string[];
  }>({ running: false, done: 0, total: 0, current: null, errors: [] });

  const runBatchImport = async (overrideList?: CuratedCharacter[]) => {
    if (batchProgress.running) return;
    const imported = getImportedCuratedUrls();
    const list = overrideList ?? CURATED_CHARACTERS.filter(c => !imported.has(c.imageUrl));
    if (list.length === 0) return;
    const total = list.length;
    setBatchProgress({ running: true, done: 0, total, current: null, errors: [] });
    const errors: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const char = list[i];
      setBatchProgress({ running: true, done: i, total, current: char.name, errors: [...errors] });
      try {
        const img = await loadImageFromUrl(char.imageUrl);
        const { originalDataUrl, beadDataUrl } = await processCuratedToBead(img);
        await saveGalleryEntry({
          id: makeEntryId(),
          createdAt: Date.now(),
          category: char.category,
          name: char.name,
          tags: char.tags ?? [],
          original: originalDataUrl,
          anime: null,
          bead: beadDataUrl,
        });
        markCuratedUrlImported(char.imageUrl);
      } catch (e) {
        errors.push(`${char.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setBatchProgress({ running: false, done: total, total, current: null, errors });
    void load();
  };

  // 进入浏览页时自动导入精选清单里未导入的角色(只跑一次)
  useEffect(() => {
    const imported = getImportedCuratedUrls();
    const pending = CURATED_CHARACTERS.filter(c => !imported.has(c.imageUrl));
    if (pending.length === 0) return;
    void runBatchImport(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewSrc = preview
    ? preview.kind === 'original'
      ? preview.entry.original
      : preview.kind === 'anime'
        ? preview.entry.anime
        : preview.entry.bead
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap border-2 rounded-none p-3 shadow-pixel-sm" style={{ borderColor: '#3A2A24', backgroundColor: '#FAF7F0' }}>
        <button
          onClick={() => void runBatchImport()}
          disabled={batchProgress.running}
          className="px-3 py-1.5 text-[10px] font-pixel tracking-wide border-2 rounded-none disabled:opacity-50"
          style={{ borderColor: '#3A2A24', backgroundColor: '#5D4A47', color: '#FFF8EE' }}
        >
          {batchProgress.running ? '处理中...' : '批量导入精选'}
        </button>
        {batchProgress.running && (
          <span className="text-[10px] font-pixel tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
            {batchProgress.done}/{batchProgress.total} · {batchProgress.current}
          </span>
        )}
        {!batchProgress.running && batchProgress.done > 0 && (
          <span className="text-[10px] font-pixel tracking-wide" style={{ color: batchProgress.errors.length ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
            完成 · 成功 {batchProgress.done - batchProgress.errors.length}/{batchProgress.total}{batchProgress.errors.length ? ` · 失败 ${batchProgress.errors.length}` : ''}
          </span>
        )}
        {entries.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-[10px] font-pixel tracking-wide border-2 rounded-none"
            style={{ borderColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive))' }}
          >
            清空
          </button>
        )}
        <span className="text-[10px] ml-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>
          精选清单共 {CURATED_CHARACTERS.length} 张 · 图库已存 {entries.length} 张
        </span>
      </div>

      <div className="flex items-center gap-2 border-2 rounded-none p-2 shadow-pixel-sm" style={{ borderColor: '#3A2A24', backgroundColor: '#FAF7F0' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索角色名 / 标签..."
          className="flex-1 px-3 py-1.5 text-xs bg-transparent outline-none"
          style={{ color: 'hsl(var(--foreground))' }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-2 py-1 text-[10px] font-pixel tracking-wide"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            清除
          </button>
        )}
        <span className="text-[10px] font-mono px-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {searchedEntries ? `${searchedEntries.length} 个匹配` : `${displayedEntries.length} 条`}
        </span>
      </div>

      {/* 标签筛选栏(顶部横向按钮) */}
      {!loading && !error && entries.length > 0 && !searchedEntries && (
        <div className="flex items-center gap-2 flex-wrap border-2 rounded-none p-2 shadow-pixel-sm" style={{ borderColor: '#3A2A24', backgroundColor: '#FAF7F0' }}>
          <button
            onClick={() => setSelectedTag('all')}
            className="px-3 py-1 text-[10px] font-pixel tracking-wide border-2 rounded-none"
            style={{
              borderColor: selectedTag === 'all' ? '#3A2A24' : 'transparent',
              backgroundColor: selectedTag === 'all' ? '#5D4A47' : 'transparent',
              color: selectedTag === 'all' ? '#FFF8EE' : 'hsl(var(--foreground))',
            }}
          >
            全部 ({entries.length})
          </button>
          {tags.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTag(t.id)}
              className="px-3 py-1 text-[10px] font-pixel tracking-wide border-2 rounded-none"
              style={{
                borderColor: selectedTag === t.id ? '#3A2A24' : 'transparent',
                backgroundColor: selectedTag === t.id ? '#5D4A47' : 'transparent',
                color: selectedTag === t.id ? '#FFF8EE' : 'hsl(var(--foreground))',
              }}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>加载中...</div>
      )}

      {error && (
        <div className="text-center py-12 text-xs" style={{ color: 'hsl(var(--destructive))' }}>
          加载失败：{error}
        </div>
      )}

      {!loading && !error && displayedEntries.length === 0 && (
        <div className="text-center py-12 text-xs px-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {entries.length === 0
            ? '图库为空。点击顶部「批量导入精选」可自动抓取各品类角色图。'
            : (searchedEntries ? '无匹配记录。' : '该标签下暂无记录。')}
        </div>
      )}

      {/* 平铺卡片网格(按标签筛选 + 搜索,分页加载) */}
      {!loading && !error && displayedEntries.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleEntries.map(entry => (
              <div
                key={entry.id}
                className="border-2 rounded-none p-2 shadow-pixel-sm"
                style={{ borderColor: '#3A2A24', backgroundColor: '#FAF7F0' }}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-[10px] font-pixel tracking-wide truncate" style={{ color: 'hsl(var(--foreground))' }}>
                    {entry.name || '未命名'}
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-[10px] font-pixel tracking-wide shrink-0 ml-2"
                    style={{ color: 'hsl(var(--destructive))' }}
                  >
                    删除
                  </button>
                </div>
                <div className={`grid ${entry.anime ? 'grid-cols-3' : 'grid-cols-2'} gap-1`}>
                  <BigThumb
                    label="原图"
                    src={entry.original}
                    baseFilename={entry.name || 'image'}
                    onClick={() => setPreview({ entry, kind: 'original' })}
                  />
                  {entry.anime && (
                    <BigThumb
                      label="动漫图"
                      src={entry.anime}
                      baseFilename={entry.name || 'image'}
                      onClick={() => setPreview({ entry, kind: 'anime' })}
                    />
                  )}
                  <BigThumb
                    label="拼豆图"
                    src={entry.bead}
                    baseFilename={entry.name || 'image'}
                    onClick={() => setPreview({ entry, kind: 'bead' })}
                  />
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="h-4" />
          )}
        </>
      )}

      {preview && previewSrc && (
        <ImagePreviewModal
          src={previewSrc}
          alt={preview.kind}
          confirmLabel="加载到生成器"
          onConfirm={() => {
            onSelectImage(preview.entry);
            setPreview(null);
          }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
