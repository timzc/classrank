import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { studentsApi, type Student } from '@/lib/api/students';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';
import { cn } from '@/lib/utils';

interface HistoryDay {
  date: string;
  bonus: Array<{ id: number; item: string; score: number }>;
  penalty: Array<{ id: number; item: string; score: number }>;
  net_score: number;
}

interface HistoryResponse {
  student_id: number;
  student_name: string;
  is_focused: boolean;
  total_score: number;
  history: HistoryDay[];
}

export function StudentDetailSheet({
  open, onOpenChange, student,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Student | null;
}) {
  const { yearId } = useCurrentYear();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.studentHistory(student?.id ?? 0, yearId),
    queryFn: () => studentsApi.history(student!.id, yearId) as Promise<HistoryResponse>,
    enabled: !!student && open,
  });

  const chartData = useMemo(() => {
    const history = data?.history ?? [];
    // backend returns DESC by date; chart wants ASC
    return [...history].reverse().map((h) => ({ date: h.date, net: h.net_score }));
  }, [data]);

  const totalScore = data?.total_score ?? student?.total_score ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{student?.name}</SheetTitle>
          <div className="text-xs text-muted-foreground">总分 {totalScore}</div>
        </SheetHeader>
        <div className="space-y-4 overflow-auto">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }} />
              <Line type="monotone" dataKey="net" stroke="#000" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="divide-y border-t">
            {isLoading && <div className="py-6 text-center text-xs text-muted-foreground">加载中…</div>}
            {!isLoading && (data?.history?.length ?? 0) === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">暂无记录</div>
            )}
            {(data?.history ?? []).map((day) => (
              <div key={day.date} className="py-2 space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{day.date}</span>
                  <span className={cn('tabular-nums', day.net_score >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]')}>
                    {day.net_score >= 0 ? '+' : ''}{day.net_score}
                  </span>
                </div>
                {day.bonus.map((b) => (
                  <div key={`b-${b.id}`} className="flex items-center justify-between pl-2 text-[11px] text-muted-foreground">
                    <span>+ {b.item}</span>
                    <span className="text-[hsl(var(--success))] tabular-nums">+{b.score}</span>
                  </div>
                ))}
                {day.penalty.map((p) => (
                  <div key={`p-${p.id}`} className="flex items-center justify-between pl-2 text-[11px] text-muted-foreground">
                    <span>- {p.item}</span>
                    <span className="text-[hsl(var(--destructive))] tabular-nums">-{p.score}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
