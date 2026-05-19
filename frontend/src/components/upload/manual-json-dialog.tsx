import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCopy, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const SAMPLE_JSON = JSON.stringify(
  {
    date: '2026-05-16',
    class_info: '高一(3)班',
    students: [
      {
        name: '张三',
        bonus: [
          { item: '主动回答问题', score: 2 },
          { item: '帮助同学', score: 1 },
        ],
        penalty: [
          { item: '迟到', score: 1 },
        ],
      },
      {
        name: '李四',
        bonus: [
          { item: '值日认真', score: 1 },
        ],
        penalty: [],
      },
    ],
  },
  null,
  2,
);

export function ManualJsonDialog({ onLoad }: { onLoad: (parsed: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_JSON);
      toast.success('模板已复制');
    } catch {
      toast.error('复制失败');
    }
  };

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">模板样例</div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={copyTemplate}
              >
                <ClipboardCopy className="h-3 w-3" /> 复制
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setText(SAMPLE_JSON)}
              >
                <FileJson className="h-3 w-3" /> 填入文本框
              </Button>
            </div>
          </div>
          <pre className="max-h-40 overflow-auto rounded-md border bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
{SAMPLE_JSON}
          </pre>
        </div>

        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="在此粘贴 JSON,字段同上方模板"
          className="font-mono text-xs"
        />
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
