export const ENDPOINTS = {
  // OCR
  parse: '/api/parse/',
  // 记录
  records: '/api/records/',
  recordsSave: '/api/records/save/',
  recordsDailyDetails: '/api/records/daily-details/',
  recordDetail: (id: number) => `/api/records/${id}/`,
  recordUpdate: (id: number) => `/api/records/${id}/update/`,
  recordDelete: (id: number) => `/api/records/${id}/delete/`,
  recordsDeleteByDate: '/api/records/delete-by-date/',
  // 学生
  students: '/api/students/',
  studentAdd: '/api/students/add/',
  studentUpdate: (id: number) => `/api/students/${id}/`,
  studentDelete: (id: number) => `/api/students/${id}/delete/`,
  studentHistory: (id: number) => `/api/students/${id}/history/`,
  studentsFocused: '/api/students/focused/',
  // 配置
  config: (key: string) => `/api/config/${key}/`,
  configSet: (key: string) => `/api/config/${key}/set/`,
  // 统计
  stats: '/api/stats/',
  statsRange: '/api/stats/range/',
  // 数据
  dataExport: '/api/data/export/',
  dataImport: '/api/data/import/',
  dataClear: '/api/data/clear/',
  // 学年
  academicYears: '/api/academic-years/',
  academicYearAdd: '/api/academic-years/add/',
  academicYearUpdate: (id: number) => `/api/academic-years/${id}/update/`,
  academicYearDelete: (id: number) => `/api/academic-years/${id}/delete/`,
  academicYearActivate: (id: number) => `/api/academic-years/${id}/activate/`,
} as const;
