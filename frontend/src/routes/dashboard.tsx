import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, startOfWeek, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { StatCard } from '@/components/dashboard/stat-card';
import { StudentScoreChart } from '@/components/dashboard/student-score-chart';
import { RankingTable } from '@/components/dashboard/ranking-table';
import { DailyDetails } from '@/components/dashboard/daily-details';
import { statsApi } from '@/lib/api/stats';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';

type Preset = 'today' | 'week' | 'month' | 'all';

function presetRange(p: Preset): DateRange | undefined {
  const today = new Date();
  if (p === 'today') return { from: today, to: today };
  if (p === 'week') return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
  if (p === 'month') return { from: startOfMonth(today), to: today };
  return undefined;
}

export default function DashboardPage() {
  const { yearId } = useCurrentYear();
  const [preset, setPreset] = useState<Preset>('week');
  const [range, setRange] = useState<DateRange | undefined>(() => presetRange('week'));

  const params = useMemo(() => ({
    start: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
    end: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    year_id: yearId,
  }), [range, yearId]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.stats(params),
    queryFn: () => statsApi.range(params),
  });

  const dates = useMemo(() => {
    if (range?.from) {
      const out: string[] = [];
      const end = range.to ?? range.from;
      const start = range.from;
      for (let d = end; d >= start; d = subDays(d, 1)) {
        out.push(format(d, 'yyyy-MM-dd'));
      }
      return out;
    }
    // Preset = "全部": derive dates from the data response (newest first)
    if (data?.daily?.length) {
      return [...data.daily.map((d) => d.date)].reverse();
    }
    return [] as string[];
  }, [range, data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={preset}
          onValueChange={(v) => {
            if (!v) return;
            setPreset(v as Preset);
            setRange(presetRange(v as Preset));
          }}
        >
          <ToggleGroupItem value="today">今日</ToggleGroupItem>
          <ToggleGroupItem value="week">本周</ToggleGroupItem>
          <ToggleGroupItem value="month">本月</ToggleGroupItem>
          <ToggleGroupItem value="all">全部</ToggleGroupItem>
        </ToggleGroup>
        <DateRangePicker value={range} onChange={(r) => { setRange(r); setPreset('all'); }} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (() => {
          const ranked = [...data.ranking].sort((a, b) => b.score - a.score);
          const top = ranked[0];
          const bottom = ranked[ranked.length - 1];
          const avg = data.participating_students > 0
            ? Math.round(data.totals.net / data.participating_students)
            : 0;
          const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n}`;
          return (
            <>
              <StatCard
                label="最高分"
                value={top ? fmt(top.score) : '—'}
                subtitle={top?.name}
                tone={top && top.score >= 0 ? 'positive' : top ? 'negative' : undefined}
              />
              <StatCard
                label="最低分"
                value={bottom ? fmt(bottom.score) : '—'}
                subtitle={bottom?.name}
                tone={bottom && bottom.score >= 0 ? 'positive' : bottom ? 'negative' : undefined}
              />
              <StatCard
                label="平均分"
                value={fmt(avg)}
                subtitle={`参与 ${data.participating_students} 人`}
                tone={avg >= 0 ? 'positive' : 'negative'}
              />
              <StatCard label="参与人数" value={data.participating_students} />
              <StatCard label="重点关注" value={data.focused_students} />
            </>
          );
        })()}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>学生分数</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#FF9500] focused-bar" /> 重点关注
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#0A84FF]" /> 其他
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {data ? <StudentScoreChart data={data.ranking} /> : <Skeleton className="h-[320px]" />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>学生排行</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {data ? <RankingTable rows={data.ranking} /> : <Skeleton className="h-40" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>每日详情</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <DailyDetails dates={dates} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
