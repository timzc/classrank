import { ENDPOINTS } from './endpoints';
import { request } from './client';

export const dataApi = {
  exportUrl: ENDPOINTS.dataExport,
  import: (payload: unknown) =>
    request<{ success: boolean }>(ENDPOINTS.dataImport, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  clear: () =>
    request<{ success: boolean }>(ENDPOINTS.dataClear, { method: 'POST' }),
};
