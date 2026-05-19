import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface StatsRangePayload {
  totals: { bonus: number; penalty: number; net: number };
  participating_students: number;
  focused_students: number;
  daily: Array<{ date: string; bonus: number; penalty: number; net: number; cumulative: number }>;
  ranking: Array<{ id: number; name: string; score: number; is_focused: boolean }>;
  focused_trend: Array<{
    id: number;
    name: string;
    daily: Array<{ date: string; net: number; cumulative: number }>;
  }>;
}

export interface SingleDayStatsPayload {
  total_students: number;
  focused_students: number;
  highest_score: number;
  lowest_score: number;
  cumulative_highest: number;
}

function buildQs(params: Record<string, string | number | 'all' | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export const statsApi = {
  range: (params: { start?: string; end?: string; year_id?: number | 'all' } = {}) =>
    request<{ success: boolean; data: StatsRangePayload }>(
      `${ENDPOINTS.statsRange}${buildQs({ start: params.start, end: params.end, academic_year_id: params.year_id })}`,
    ).then((r) => r.data),
  single: (params: { date?: string; year_id?: number | 'all' } = {}) =>
    request<{ success: boolean; data: SingleDayStatsPayload }>(
      `${ENDPOINTS.stats}${buildQs({ date: params.date, academic_year_id: params.year_id })}`,
    ).then((r) => r.data),
};
