import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface ParsedItem {
  item: string;
  score: number;
}

export interface ParsedStudent {
  name: string;
  bonus_items: ParsedItem[];
  penalty_items: ParsedItem[];
}

export interface ParsedResult {
  date?: string;
  students: ParsedStudent[];
}

export const ocrApi = {
  parse: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return request<{ success: boolean; data: ParsedResult }>(ENDPOINTS.parse, {
      method: 'POST',
      body: fd,
    }).then((r) => r.data);
  },
};
