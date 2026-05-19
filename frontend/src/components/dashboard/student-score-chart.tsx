import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

interface Row {
  id: number;
  name: string;
  score: number;
  is_focused: boolean;
}

interface RankedRow extends Row {
  rank: number;
}

const FOCUSED_COLOR = '#FF9500'; // Apple Orange
const NORMAL_COLOR = '#0A84FF'; // Apple Blue

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RankedRow }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-foreground">
        {row.name}
        {row.is_focused && (
          <span className="ml-1 rounded-sm bg-[#FF9500]/15 px-1 py-px text-[10px] text-[#FF9500]">重点</span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3 tabular-nums text-muted-foreground">
        <span>第 {row.rank} 名</span>
        <span className={cn(row.score >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]')}>
          {row.score >= 0 ? '+' : ''}{row.score} 分
        </span>
      </div>
    </div>
  );
}

function ChartStrip({
  rows,
  height,
  barSlot,
  domain,
}: {
  rows: RankedRow[];
  height: number;
  barSlot: number;
  domain: [number, number];
}) {
  const innerWidth = Math.max(rows.length * barSlot, 320);
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: innerWidth, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 56 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#1d1d1f' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={56}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6E6E73' }}
              axisLine={false}
              tickLine={false}
              domain={domain}
            />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="rgba(0,0,0,0.15)" />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {rows.map((s) => (
                <Cell
                  key={s.id}
                  fill={s.is_focused ? FOCUSED_COLOR : NORMAL_COLOR}
                  className={s.is_focused ? 'focused-bar' : undefined}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StudentScoreChart({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return <div className="py-12 text-center text-xs text-muted-foreground">暂无学生</div>;
  }
  const sorted = [...data].sort((a, b) => b.score - a.score);
  const all: RankedRow[] = sorted.map((s, i) => ({ ...s, rank: i + 1 }));
  const focused = all.filter((d) => d.is_focused);
  const minScore = Math.min(0, ...all.map((d) => d.score));
  const maxScore = Math.max(0, ...all.map((d) => d.score));
  const domain: [number, number] = [minScore, maxScore];

  return (
    <div className="space-y-4">
      {focused.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            重点关注（{focused.length}）
          </div>
          <ChartStrip rows={focused} height={200} barSlot={72} domain={domain} />
        </div>
      )}
      <div>
        <div className="mb-1 text-[11px] font-medium text-muted-foreground">
          全部学生（{all.length}）
        </div>
        <ChartStrip rows={all} height={360} barSlot={44} domain={domain} />
      </div>
    </div>
  );
}
