import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface StatsPayload {
  totals: { bonus: number; penalty: number; net: number };
  participating_students: number;
  focused_students: number;
  daily: Array<{ date: string; bonus: number; penalty: number; net: number; cumulative?: number }>;
  ranking: Array<{ id: number; name: string; score: number }>;
}

export const statsApi = {
  get: (params: { start?: string; end?: string; year_id?: number | 'all' } = {}) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
    const q = sp.toString();
    return request<{ success: boolean; data: StatsPayload }>(
      `${ENDPOINTS.stats}${q ? `?${q}` : ''}`,
    ).then((r) => r.data);
  },
};
