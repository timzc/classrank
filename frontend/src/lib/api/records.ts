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

export interface DailyDetailItem {
  id: number;
  item: string;
  score: number;
}

export interface DailyDetailStudent {
  student_id: number;
  student_name: string;
  is_focused: boolean;
  bonus: DailyDetailItem[];
  penalty: DailyDetailItem[];
  net_score: number;
}

export interface DailyDetailsPayload {
  date: string;
  records: DailyDetailStudent[];
}

export interface RankingRow {
  id: number;
  name: string;
  score: number;
  is_focused: boolean;
}

export interface RecordsListPayload {
  type: 'daily' | 'cumulative';
  date: string;
  records: RankingRow[];
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

const qs = (params: Record<string, string | number | 'all' | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const recordsApi = {
  list: (params: { type?: 'daily' | 'cumulative'; date?: string; year_id?: number | 'all' } = {}) =>
    request<{ success: boolean; data: RecordsListPayload }>(
      `${ENDPOINTS.records}${qs({ type: params.type, date: params.date, academic_year_id: params.year_id })}`,
    ).then((r) => r.data),
  save: (payload: SaveRecordsPayload) =>
    request<{ success: boolean }>(ENDPOINTS.recordsSave, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  dailyDetails: (date: string, yearId?: number | 'all') =>
    request<{ success: boolean; data: DailyDetailsPayload }>(
      `${ENDPOINTS.recordsDailyDetails}${qs({ date, academic_year_id: yearId })}`,
    ).then((r) => r.data),
  get: (id: number) =>
    request<{ success: boolean; data: RecordItem }>(ENDPOINTS.recordDetail(id)).then((r) => r.data),
  update: (id: number, payload: Partial<Omit<RecordItem, 'id' | 'student_name'>> & { student_name?: string }) =>
    request<{ success: boolean }>(ENDPOINTS.recordUpdate(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.recordDelete(id), { method: 'DELETE' }),
  // Backend reads `date` and optional `academic_year_id` from query string, NOT body.
  removeByDate: (date: string, yearId?: number | 'all') =>
    request<{ success: boolean }>(
      `${ENDPOINTS.recordsDeleteByDate}${qs({ date, academic_year_id: yearId })}`,
      { method: 'DELETE' },
    ),
};
