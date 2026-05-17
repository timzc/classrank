import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface TrendPoint {
  date: string;
  net: number;
  cumulative?: number;
}

export function TrendChart({ data, mode }: { data: TrendPoint[]; mode: 'daily' | 'cumulative' }) {
  if (mode === 'daily') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <Bar dataKey="net" fill="#000" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }} />
        <Line type="monotone" dataKey="cumulative" stroke="#000" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
