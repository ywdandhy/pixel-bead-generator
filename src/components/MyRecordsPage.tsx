// 「我的记录」页:专门展示用户自己上传生成的记录(category === '我的上传')
// 与 BrowsePage(图库,精选角色)分开,布局简化:平铺卡片,无标签 sidebar

import { useEffect, useMemo, useState } from 'react';
import { ImagePreviewModal } from './ImagePreviewModal';
import {
  getAllGalleryEntries,
  deleteGalleryEntry,
  type GalleryEntry,
} from '@/utils/galleryStorage';
import { BigThumb } from './GalleryCommon';

interface MyRecordsPageProps {
  refreshKey: number;
  onSelectImage: (entry: GalleryEntry) => void;
}

type PreviewKind = 'original' | 'anime' | 'bead';

export function MyRecordsPage({ refreshKey, onSelectImage }: MyRecordsPageProps) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [preview, setPreview] = useState<{ entry: GalleryEntry; kind: PreviewKind } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllGalleryEntries();
      setEntries(all.filter(e => e.category === '我的上传'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => {
      const name = (e.name || '').toLowerCase();
      const tags = (e.tags || []).join(' ').toLowerCase();
      return name.includes(q) || tags.includes(q);
    });
  }, [entries, searchQuery]);

  const handleDelete = async (id: string) => {
    try {
      await deleteGalleryEntry(id);
      window.location.reload();
    } catch (e) {
      alert(`删除失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('确定清空所有我的记录？此操作不可恢复。')) return;
    try {
      // 只删「我的上传」类别的条目,精选图库不受影响
      const myEntries = entries;
      for (const e of myEntries) {
        await deleteGalleryEntry(e.id);
      }
      void load();
    } catch (e) {
      alert(`清空失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const previewSrc = preview
    ? preview.kind === 'original'
      ? preview.entry.original
      : preview.kind === 'anime'
        ? preview.entry.anime
        : preview.entry.bead
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap border-2 rounded-none p-3 shadow-pixel-sm" style={{ borderColor: '#3A2A24', backgroundColor: '#FAF7F0' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索我的记录..."
          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-transparent outline-none"
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
          {filtered.length} 条
        </span>
        {entries.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-[10px] font-pixel tracking-wide border-2 rounded-none"
            style={{ borderColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive))' }}
          >
            清空全部
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>加载中...</div>
      )}

      {error && (
        <div className="text-center py-12 text-xs" style={{ color: 'hsl(var(--destructive))' }}>
          加载失败：{error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 text-xs px-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {entries.length === 0
            ? '还没有生成记录。在「生成器」里上传图片并点击「转化为拼豆图」或「AI 生成动漫图」后会自动保存到这里。'
            : '无匹配记录。'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="border-2 rounded-none p-3 shadow-pixel-sm"
              style={{ borderColor: '#3A2A24', backgroundColor: '#FAF7F0' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-pixel tracking-wide truncate" style={{ color: 'hsl(var(--foreground))' }}>
                    {entry.name || '我的上传'}
                  </div>
                  <div className="text-[10px] font-mono mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {new Date(entry.createdAt).toLocaleString()}{entry.anime ? ' · 含动漫图' : ' · 原图直转'}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="px-3 py-1 text-[10px] font-pixel tracking-wide border-2 rounded-none"
                  style={{ borderColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive))' }}
                >
                  删除
                </button>
              </div>
              <div className={`grid ${entry.anime ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-3`}>
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
