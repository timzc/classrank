import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Series {
  id: number;
  name: string;
  daily: Array<{ date: string; net: number; cumulative: number }>;
}

const PALETTE = [
  '#0A84FF', // Blue
  '#FF9500', // Orange
  '#34C759', // Green
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#5AC8FA', // Teal
  '#FFCC00', // Yellow
  '#5856D6', // Indigo
];

export function FocusedTrendChart({ data }: { data: Series[] }) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground">
        暂无重点关注的学生，去「学生管理」页打开开关后回来查看趋势
      </div>
    );
  }

  const dates = data[0]?.daily.map((d) => d.date) ?? [];
  const points = dates.map((date, i) => {
    const point: Record<string, string | number> = { date };
    for (const s of data) {
      point[s.name] = s.daily[i]?.cumulative ?? 0;
    }
    return point;
  });

  return (
    <div className="h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6E6E73' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ stroke: 'rgba(0,0,0,0.15)', strokeDasharray: '3 3' }}
            contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
            formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value}`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          {data.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.name}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
