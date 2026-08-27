// 图库相关共享组件 + 工具函数(BrowsePage / MyRecordsPage 共用)

export function getExtensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  if (!match) return '';
  const mime = match[1];
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/webp') return '.webp';
  return '';
}

export function downloadImage(dataUrl: string, baseFilename: string): void {
  const link = document.createElement('a');
  link.download = `${baseFilename}${getExtensionFromDataUrl(dataUrl)}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printImage(dataUrl: string): void {
  const win = window.open('', '_blank');
  if (!win) {
    alert('请允许弹出窗口以使用打印功能');
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>打印</title>
    <style>@page { margin: 1cm; } body { margin: 0; text-align: center; } img { max-width: 100%; max-height: 100vh; }</style>
  </head><body>
    <img src="${dataUrl}" onload="setTimeout(function(){window.print();},100)" />
  </body></html>`);
  win.document.close();
}

interface BigThumbProps {
  label: string;
  src: string | null;
  placeholder?: string | null;
  baseFilename?: string;
  onClick?: () => void;
}

export function BigThumb({ label, src, placeholder, baseFilename, onClick }: BigThumbProps) {
  return (
    <div
      className="border-2 rounded-none overflow-hidden shadow-pixel-sm"
      style={{ borderColor: '#3A2A24', backgroundColor: '#FFFFFF' }}
    >
      <button
        onClick={onClick}
        disabled={!onClick}
        className="relative aspect-square w-full block disabled:cursor-default"
      >
        {src ? (
          <img src={src} alt={label} loading="lazy" className="w-full h-full object-contain" />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-[11px] font-pixel tracking-wide text-center px-3 leading-relaxed"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {placeholder ?? '—'}
          </div>
        )}
        <span
          className="absolute top-2 left-2 text-[10px] font-pixel tracking-wide px-2 py-1"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#3A2A24' }}
        >
          {label}
        </span>
      </button>
      {src && (
        <div className="flex border-t-2" style={{ borderColor: '#3A2A24' }}>
          <button
            onClick={() => downloadImage(src, baseFilename ? `${baseFilename}-${label}` : label)}
            className="flex-1 py-1.5 text-[10px] font-pixel tracking-wide hover:bg-[#5D4A47] hover:text-[#FFF8EE]"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            下载
          </button>
          <button
            onClick={() => printImage(src)}
            className="flex-1 py-1.5 text-[10px] font-pixel tracking-wide border-l-2 hover:bg-[#5D4A47] hover:text-[#FFF8EE]"
            style={{ borderColor: '#3A2A24', color: 'hsl(var(--foreground))' }}
          >
            打印
          </button>
        </div>
      )}
    </div>
  );
}
