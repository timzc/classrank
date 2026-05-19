import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Row {
  id: number;
  name: string;
  score: number;
  is_focused: boolean;
}

const FOCUSED_COLOR = '#000';
const NORMAL_COLOR = '#8E8E93';
const BAR_SLOT = 44;

export function StudentScoreChart({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return <div className="py-12 text-center text-xs text-muted-foreground">所选周期内暂无数据</div>;
  }
  const sorted = [...data].sort((a, b) => b.score - a.score);
  const innerWidth = sorted.length * BAR_SLOT;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: innerWidth, height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} margin={{ top: 8, right: 12, left: -8, bottom: 56 }}>
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
            <YAxis tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
              formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value}`, '总分']}
            />
            <ReferenceLine y={0} stroke="rgba(0,0,0,0.15)" />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {sorted.map((s) => (
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
