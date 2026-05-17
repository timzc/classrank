import { request } from './client';
import { ENDPOINTS } from './endpoints';

export type ScoreType = 'bonus' | 'penalty';

export interface RecordItem {
  id: number;
  student_id: number;
  student_name: string;
  date: string;
  type: ScoreType;
  item: string;
  score: number;
}

export interface SaveRecordsPayload {
  date: string;
  academic_year_id?: number | 'all';
  students: Array<{
    name: string;
    bonus_items?: Array<{ item: string; score: number }>;
    penalty_items?: Array<{ item: string; score: number }>;
  }>;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const recordsApi = {
  list: (params: { start?: string; end?: string; year_id?: number | 'all' } = {}) =>
    request<{ success: boolean; data: RecordItem[] }>(
      `${ENDPOINTS.records}${qs(params)}`,
    ).then((r) => r.data),
  save: (payload: SaveRecordsPayload) =>
    request<{ success: boolean }>(ENDPOINTS.recordsSave, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  dailyDetails: (date: string, yearId?: number | 'all') =>
    request<{ success: boolean; data: RecordItem[] }>(
      `${ENDPOINTS.recordsDailyDetails}${qs({ date, year_id: yearId })}`,
    ).then((r) => r.data),
  get: (id: number) =>
    request<{ success: boolean; data: RecordItem }>(ENDPOINTS.recordDetail(id)).then((r) => r.data),
  update: (id: number, payload: Partial<Omit<RecordItem, 'id' | 'student_name'>>) =>
    request<{ success: boolean }>(ENDPOINTS.recordUpdate(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.recordDelete(id), { method: 'DELETE' }),
  removeByDate: (date: string, yearId?: number | 'all') =>
    request<{ success: boolean }>(ENDPOINTS.recordsDeleteByDate, {
      method: 'DELETE',
      body: JSON.stringify({ date, academic_year_id: yearId }),
    }),
};
