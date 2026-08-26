import { useEffect, useState } from 'react';

interface ImagePreviewModalProps {
  src: string;
  alt: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
}

export function ImagePreviewModal({ src, alt, onConfirm, onClose, confirmLabel = '生成拼豆图' }: ImagePreviewModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          {!loaded && !error && (
            <div className="flex items-center justify-center" style={{ width: 480, height: 480 }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#5D4A47' }}></div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ width: 480, height: 480 }}>
              图片加载失败
            </div>
          )}
          <img
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className="max-w-full rounded-lg"
            style={{ display: loaded && !error ? 'block' : 'none', maxHeight: '60vh' }}
          />
        </div>
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border"
            style={{ borderColor: '#E8E4DC' }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!loaded || error}
            className="px-4 py-2 text-sm rounded-md text-white disabled:opacity-40"
            style={{ backgroundColor: '#5D4A47' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
