import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface AcademicYear {
  id: number;
  name: string;
  order: number;
  is_active: boolean;
}

export const academicYearsApi = {
  list: () =>
    request<{ success: boolean; data: AcademicYear[] }>(ENDPOINTS.academicYears).then((r) => r.data),
  add: (name: string, order = 0) =>
    request<{ success: boolean; data: AcademicYear }>(ENDPOINTS.academicYearAdd, {
      method: 'POST',
      body: JSON.stringify({ name, order }),
    }),
  update: (id: number, payload: Partial<Pick<AcademicYear, 'name' | 'order'>>) =>
    request<{ success: boolean }>(ENDPOINTS.academicYearUpdate(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.academicYearDelete(id), { method: 'DELETE' }),
  activate: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.academicYearActivate(id), { method: 'PUT' }),
};
