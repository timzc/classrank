import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function ManualJsonDialog({ onLoad }: { onLoad: (parsed: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">粘贴 JSON</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>粘贴 OCR JSON</DialogTitle>
          <DialogDescription>用于跳过图片解析直接载入结构化数据。</DialogDescription>
        </DialogHeader>
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "date": "2026-05-16", "students": [...] }' />
        <DialogFooter>
          <Button
            onClick={() => {
              try {
                const parsed = JSON.parse(text);
                onLoad(parsed);
                setOpen(false);
                setText('');
              } catch {
                toast.error('JSON 格式不合法');
              }
            }}
          >
            载入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
