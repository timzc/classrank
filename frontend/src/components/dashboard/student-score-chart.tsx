import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Row {
  id: number;
  name: string;
  score: number;
  is_focused: boolean;
}

const FOCUSED_COLOR = '#000';
const NORMAL_COLOR = '#D1D1D6';

export function StudentScoreChart({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return <div className="py-12 text-center text-xs text-muted-foreground">所选周期内暂无数据</div>;
  }
  const sorted = [...data].sort((a, b) => b.score - a.score);
  const height = Math.max(280, sorted.length * 26);
  return (
    <div className="max-h-[560px] overflow-y-auto">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 11, fill: '#1d1d1f' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
            formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value}`, '总分']}
          />
          <ReferenceLine x={0} stroke="rgba(0,0,0,0.15)" />
          <Bar dataKey="score" radius={2}>
            {sorted.map((s) => (
              <Cell key={s.id} fill={s.is_focused ? FOCUSED_COLOR : NORMAL_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
