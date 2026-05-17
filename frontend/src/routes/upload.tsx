import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Plus, Save } from 'lucide-react';
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

function flatten(parsed: ParsedResult): ResultRow[] {
  const out: ResultRow[] = [];
  let i = 0;
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

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.students(yearId),
    queryFn: () => studentsApi.list(yearId),
  });
  const knownNames = useMemo(() => students.map((s) => s.name), [students]);

  const parse = useMutation({
    mutationFn: (f: File) => ocrApi.parse(f),
    onSuccess: (data) => {
      if (data.date) setDate(data.date);
      setRows(flatten(data));
      toast.success('解析完成');
    },
    onError: (e: Error) => toast.error(e.message),
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader><CardTitle>上传</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Dropzone onFile={(f) => parse.mutate(f)} disabled={parse.isPending} />
          {parse.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 正在调用视觉模型解析，可能需要 30-180 秒...
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
