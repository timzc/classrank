import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { recordsApi, type DailyDetailStudent } from '@/lib/api/records';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';

export function DailyDetails({ dates }: { dates: string[] }) {
  return (
    <div className="divide-y">
      {dates.map((d) => <DailyRow key={d} date={d} />)}
      {dates.length === 0 && (
        <div className="py-6 text-center text-xs text-muted-foreground">暂无记录</div>
      )}
    </div>
  );
}

function DailyRow({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const { yearId } = useCurrentYear();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dailyDetails(date, yearId),
    queryFn: () => recordsApi.dailyDetails(date, yearId),
    enabled: open,
  });
  const remove = useMutation({
    mutationFn: () => recordsApi.removeByDate(date, yearId),
    onSuccess: () => {
      toast.success('已删除该日全部记录');
      qc.invalidateQueries({ queryKey: ['records'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: async ({ student, name }: { student: DailyDetailStudent; name: string }) => {
      for (const b of student.bonus) {
        await recordsApi.update(b.id, { student_name: name, item: b.item, score: b.score, type: 'bonus' });
      }
      for (const p of student.penalty) {
        await recordsApi.update(p.id, { student_name: name, item: p.item, score: p.score, type: 'penalty' });
      }
    },
    onSuccess: () => toast.success('姓名已更新'),
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['records'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const students = data?.records ?? [];

  return (
    <div>
      <div className="flex items-center justify-between rounded-md hover:bg-black/[0.03]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 py-3 px-1 text-left text-sm font-medium"
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform text-muted-foreground', open && 'rotate-90')} />
          {date}
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { if (confirm(`确定删除 ${date} 全部记录？`)) remove.mutate(); }}
          aria-label="删除整日"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
      {open && (
        <div className="pl-7 pb-3 space-y-2">
          {isLoading && <div className="text-xs text-muted-foreground">加载中...</div>}
          {students.length === 0 && !isLoading && (
            <div className="text-xs text-muted-foreground">该日无记录</div>
          )}
          {students.map((s) => (
            <div key={s.student_id} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <StudentName
                  student={s}
                  saving={rename.isPending}
                  onRename={(name) => rename.mutate({ student: s, name })}
                />
                <span className={cn('tabular-nums', s.net_score >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]')}>
                  {s.net_score >= 0 ? '+' : ''}{s.net_score}
                </span>
              </div>
              {s.bonus.map((b) => (
                <div key={`b-${b.id}`} className="flex items-center justify-between pl-2 text-[11px] text-muted-foreground">
                  <span>+ {b.item}</span>
                  <span className="text-[hsl(var(--success))] tabular-nums">+{b.score}</span>
                </div>
              ))}
              {s.penalty.map((p) => (
                <div key={`p-${p.id}`} className="flex items-center justify-between pl-2 text-[11px] text-muted-foreground">
                  <span>- {p.item}</span>
                  <span className="text-[hsl(var(--destructive))] tabular-nums">-{p.score}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentName({
  student,
  saving,
  onRename,
}: {
  student: DailyDetailStudent;
  saving: boolean;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(student.student_name);

  const startEdit = () => {
    setValue(student.student_name);
    setEditing(true);
  };
  const submit = () => {
    const name = value.trim();
    setEditing(false);
    if (!name || name === student.student_name) return;
    onRename(name);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        className="w-28 rounded border bg-background px-1.5 py-0.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }

  return (
    <span className="group flex items-center gap-1">
      <span className="font-medium">{student.student_name}</span>
      <button
        type="button"
        onClick={startEdit}
        disabled={saving}
        aria-label="修改姓名"
        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </span>
  );
}
