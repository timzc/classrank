import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { AcademicYearProvider } from '@/components/layout/academic-year-switcher';
import { Toaster } from '@/components/ui/sonner';
import DashboardPage from '@/routes/dashboard';
import UploadPage from '@/routes/upload';
import StudentsPage from '@/routes/students';
import SettingsLayout from '@/routes/settings/layout';
import SettingsApiPage from '@/routes/settings/api';
import SettingsAcademicYearsPage from '@/routes/settings/academic-years';
import SettingsDataPage from '@/routes/settings/data';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AcademicYearProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="api" replace />} />
                <Route path="api" element={<SettingsApiPage />} />
                <Route path="academic-years" element={<SettingsAcademicYearsPage />} />
                <Route path="data" element={<SettingsDataPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AcademicYearProvider>
    </QueryClientProvider>
  );
}
