import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dropzone({
  onFiles,
  disabled,
  compact,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickImages = (list: FileList | null | undefined) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pickImages(e.dataTransfer.files);
      }}
      onPaste={(e) => pickImages(e.clipboardData.files)}
      role="button"
      aria-label="上传考评图片"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ref.current?.click();
        }
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-surface text-center transition-colors',
        compact ? 'px-4 py-4' : 'px-6 py-12 gap-3',
        dragOver ? 'border-foreground bg-black/[0.03]' : 'border-border hover:bg-black/[0.02]',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <Upload className={cn('text-muted-foreground', compact ? 'h-4 w-4' : 'h-6 w-6')} />
      <div className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
        {compact ? '继续添加图片' : '点击 / 拖拽 / 粘贴上传考评图片'}
      </div>
      {!compact && (
        <div className="text-xs text-muted-foreground">支持 PNG · JPG · 可一次选择多张</div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          pickImages(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
