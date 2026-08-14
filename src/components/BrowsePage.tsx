import { useState, useMemo } from 'react';
import { CATEGORIES, getGalleryImage } from '@/data/categories';
import { ImagePreviewModal } from './ImagePreviewModal';

interface BrowsePageProps {
  onSelectImage: (src: string, alt: string) => void;
}

interface GalleryImage {
  src: string;
  alt: string;
  index: number;
}

export function BrowsePage({ onSelectImage }: BrowsePageProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(CATEGORIES[0].id);
  const [preview, setPreview] = useState<GalleryImage | null>(null);

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCategoryId) ?? CATEGORIES[0],
    [activeCategoryId]
  );

  const images = useMemo<GalleryImage[]>(
    () =>
      Array.from({ length: activeCategory.images.length }, (_, i) => ({
        src: getGalleryImage(activeCategory.id, i, 300),
        alt: `${activeCategory.label} ${i + 1}`,
        index: i,
      })),
    [activeCategory]
  );

  return (
    <div className="grid lg:grid-cols-[200px_1fr] gap-6">
      {/* 左侧分类 */}
      <aside className={`${'card'} p-3`}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>分类</h2>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className="text-left px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                backgroundColor: cat.id === activeCategoryId ? '#5D4A47' : 'transparent',
                color: cat.id === activeCategoryId ? '#fff' : 'hsl(var(--foreground))',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </aside>

      {/* 右侧图库 */}
      <div>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          {activeCategory.label}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <GalleryItem
              key={`${activeCategoryId}-${img.index}`}
              img={img}
              onClick={() => setPreview(img)}
            />
          ))}
        </div>
      </div>

      {preview && (
        <ImagePreviewModal
          src={getGalleryImage(activeCategory.id, preview.index, 600)}
          alt={preview.alt}
          onConfirm={() => {
            onSelectImage(
              getGalleryImage(activeCategory.id, preview.index, 600),
              preview.alt
            );
            setPreview(null);
          }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

interface GalleryItemProps {
  img: GalleryImage;
  onClick: () => void;
}

function GalleryItem({ img, onClick }: GalleryItemProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden"
      style={{ backgroundColor: '#FAF7F0' }}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#5D4A47' }}></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
          加载失败
        </div>
      )}
      <img
        src={img.src}
        alt={img.alt}
        crossOrigin="anonymous"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className="w-full h-full object-cover transition-opacity"
        style={{ opacity: loaded && !error ? 1 : 0 }}
      />
    </button>
  );
}
