import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface Student {
  id: number;
  name: string;
  is_focused: boolean;
  total_score: number;
}

export const studentsApi = {
  list: (yearId?: number | 'all') =>
    request<{ success: boolean; data: Student[] }>(
      `${ENDPOINTS.students}${yearId !== undefined ? `?year_id=${yearId}` : ''}`,
    ).then((r) => r.data),
  add: (name: string) =>
    request<{ success: boolean; data: Pick<Student, 'id' | 'name' | 'is_focused'> }>(ENDPOINTS.studentAdd, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  update: (id: number, payload: Partial<Pick<Student, 'name' | 'is_focused'>>) =>
    request<{ success: boolean; data: Pick<Student, 'id' | 'name' | 'is_focused'> }>(ENDPOINTS.studentUpdate(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.studentDelete(id), { method: 'DELETE' }),
  history: (id: number, yearId?: number | 'all') =>
    request<{ success: boolean; data: unknown }>(
      `${ENDPOINTS.studentHistory(id)}${yearId !== undefined ? `?year_id=${yearId}` : ''}`,
    ).then((r) => r.data),
  focused: (yearId?: number | 'all') =>
    request<{ success: boolean; data: Student[] }>(
      `${ENDPOINTS.studentsFocused}${yearId !== undefined ? `?year_id=${yearId}` : ''}`,
    ).then((r) => r.data),
};
