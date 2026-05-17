import { request } from './client';
import { ENDPOINTS } from './endpoints';

export const configApi = {
  get: (key: string) =>
    request<{ success: boolean; data: { key: string; value: string } }>(ENDPOINTS.config(key)).then((r) => r.data),
  set: (key: string, value: string, description?: string) =>
    request<{ success: boolean }>(ENDPOINTS.configSet(key), {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    }),
};
