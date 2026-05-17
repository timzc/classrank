export const queryKeys = {
  stats: (params: object) => ['stats', params] as const,
  students: (yearId?: number | 'all') => ['students', yearId] as const,
  studentsFocused: (yearId?: number | 'all') => ['students', 'focused', yearId] as const,
  studentHistory: (id: number, yearId?: number | 'all') => ['students', id, 'history', yearId] as const,
  records: (params: object) => ['records', params] as const,
  dailyDetails: (date: string, yearId?: number | 'all') => ['records', 'daily', date, yearId] as const,
  academicYears: () => ['academic-years'] as const,
  config: (key: string) => ['config', key] as const,
} as const;
