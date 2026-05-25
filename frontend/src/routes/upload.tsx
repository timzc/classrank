import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertCircle, Loader2, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dropzone } from '@/components/upload/dropzone';
import { ResultTable, type ResultRow } from '@/components/upload/result-table';
import { ManualJsonDialog } from '@/components/upload/manual-json-dialog';
import { ocrApi, type ParsedResult } from '@/lib/api/ocr';
import { studentsApi } from '@/lib/api/students';
import { recordsApi } from '@/lib/api/records';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';

interface PendingImage {
  id: string;
  file: File;
  url: string;
  error?: string;
}

function flatten(parsed: ParsedResult, startIndex = 0): ResultRow[] {
  const out: ResultRow[] = [];
  let i = startIndex;
  for (const s of parsed.students ?? []) {
    for (const b of s.bonus ?? []) out.push({ id: `r${i++}`, studentName: s.name, type: 'bonus', item: b.item, score: b.score });
    for (const p of s.penalty ?? []) out.push({ id: `r${i++}`, studentName: s.name, type: 'penalty', item: p.item, score: p.score });
  }
  return out;
}

function toSavePayload(date: string, rows: ResultRow[], yearId: number | 'all') {
  const map = new Map<string, { name: string; bonus: { item: string; score: number }[]; penalty: { item: string; score: number }[] }>();
  for (const r of rows) {
    if (!r.studentName.trim() || !r.item.trim() || !r.score) continue;
    const e = map.get(r.studentName) ?? { name: r.studentName, bonus: [], penalty: [] };
    (r.type === 'bonus' ? e.bonus : e.penalty).push({ item: r.item, score: r.score });
    map.set(r.studentName, e);
  }
  return { date, academic_year_id: yearId, students: Array.from(map.values()) };
}

export default function UploadPage() {
  const { yearId } = useCurrentYear();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.students(yearId),
    queryFn: () => studentsApi.list(yearId),
  });
  const knownNames = useMemo(() => students.map((s) => s.name), [students]);

  const addFiles = (files: File[]) => {
    const next = files.map((file) => ({
      id: `img-${Date.now()}-${seq.current++}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setPending((prev) => [...prev, ...next]);
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearPending = () => {
    pending.forEach((p) => URL.revokeObjectURL(p.url));
    setPending([]);
  };

  const parse = useMutation({
    mutationFn: async (images: PendingImage[]) => {
      const aggregated: ResultRow[] = [];
      let firstDate: string | undefined;
      let idx = 0;
      const successIds: string[] = [];
      const failures: { id: string; name: string; error: string }[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setProgress({ current: i + 1, total: images.length });
        try {
          const data = await ocrApi.parse(img.file);
          if (!firstDate && data.date) firstDate = data.date;
          const next = flatten(data, idx);
          idx += next.length;
          aggregated.push(...next);
          successIds.push(img.id);
        } catch (e) {
          failures.push({
            id: img.id,
            name: img.file.name,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      return { rows: aggregated, date: firstDate, successIds, failures };
    },
    onSuccess: ({ rows: parsedRows, date: parsedDate, successIds, failures }) => {
      if (parsedDate) setDate(parsedDate);
      if (parsedRows.length > 0) setRows((prev) => [...prev, ...parsedRows]);

      // 成功的从 pending 中移除；失败的保留并标记错误，便于用户重试
      setPending((prev) => {
        const removed = new Set(successIds);
        const failedMap = new Map(failures.map((f) => [f.id, f.error]));
        const next: PendingImage[] = [];
        for (const p of prev) {
          if (removed.has(p.id)) {
            URL.revokeObjectURL(p.url);
            continue;
          }
          next.push({ ...p, error: failedMap.get(p.id) ?? p.error });
        }
        return next;
      });

      if (failures.length === 0) {
        toast.success(`解析完成，共 ${parsedRows.length} 条`);
        return;
      }
      const failDetail = failures.map((f) => `${f.name}: ${f.error}`).join('\n');
      if (successIds.length === 0) {
        toast.error(`全部 ${failures.length} 张解析失败`, { description: failDetail, duration: 10000 });
      } else {
        toast.warning(
          `成功 ${successIds.length} 张（${parsedRows.length} 条），失败 ${failures.length} 张`,
          { description: failDetail, duration: 10000 },
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setProgress(null),
  });

  const save = useMutation({
    mutationFn: () => recordsApi.save(toSavePayload(date, rows, yearId)),
    onSuccess: () => {
      toast.success('已保存');
      setRows([]);
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['records'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parsing = parse.isPending;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader><CardTitle>上传</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Dropzone onFiles={addFiles} disabled={parsing} compact={pending.length > 0} />

          {pending.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>已选 {pending.length} 张</span>
                <button
                  type="button"
                  onClick={clearPending}
                  disabled={parsing}
                  className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> 清空
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {pending.map((p) => (
                  <div
                    key={p.id}
                    title={p.error ? `${p.file.name}\n解析失败：${p.error}` : p.file.name}
                    className={`group relative aspect-square overflow-hidden rounded-md border bg-surface ${
                      p.error ? 'border-destructive ring-1 ring-destructive' : ''
                    }`}
                  >
                    <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                    {p.error && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-destructive/90 px-1.5 py-1 text-[10px] leading-tight text-destructive-foreground">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">解析失败</span>
                      </div>
                    )}
                    {!parsing && (
                      <button
                        type="button"
                        onClick={() => removePending(p.id)}
                        aria-label="移除"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pending.some((p) => p.error) && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
                  有 {pending.filter((p) => p.error).length} 张解析失败，点击下方按钮可重试。悬停缩略图查看错误详情。
                </div>
              )}
              <Button
                size="sm"
                className="w-full"
                onClick={() => parse.mutate(pending)}
                disabled={parsing}
              >
                {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {parsing && progress
                  ? `解析中 ${progress.current}/${progress.total}`
                  : pending.some((p) => p.error)
                    ? `重试解析 (${pending.length})`
                    : `解析图片 (${pending.length})`}
              </Button>
            </div>
          )}

          {parsing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 正在调用视觉模型解析，单张约 30-180 秒...
            </div>
          )}
          <ManualJsonDialog onLoad={(p) => setRows(flatten(p as ParsedResult))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>解析结果</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" className="w-[150px]" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => setRows((r) => [...r, { id: `r${Date.now()}`, studentName: '', type: 'bonus', item: '', score: 1 }])}>
              <Plus className="h-3.5 w-3.5" /> 新增行
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || rows.length === 0}>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 保存
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">上传图片 / 粘贴 JSON / 新增行后开始编辑</div>
          ) : (
            <ResultTable rows={rows} onChange={setRows} knownStudents={knownNames} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
