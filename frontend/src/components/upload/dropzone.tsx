import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dropzone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onPaste={(e) => {
        const f = e.clipboardData.files?.[0];
        if (f) onFile(f);
      }}
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
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-12 text-center transition-colors',
        dragOver ? 'border-foreground bg-black/[0.03]' : 'border-border hover:bg-black/[0.02]',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <div className="text-sm font-medium">点击 / 拖拽 / 粘贴上传考评图片</div>
      <div className="text-xs text-muted-foreground">支持 PNG · JPG · 最大 10MB</div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
