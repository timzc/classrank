import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Row {
  id: number;
  name: string;
  score: number;
  is_focused: boolean;
}

const FOCUSED_COLOR = '#000';
const NORMAL_COLOR = '#8E8E93';

function ChartStrip({
  rows,
  height,
  barSlot,
  domain,
}: {
  rows: Row[];
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
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
              formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v}`, '总分']}
            />
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
  const focused = data.filter((d) => d.is_focused).sort((a, b) => b.score - a.score);
  const all = [...data].sort((a, b) => b.score - a.score);
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
