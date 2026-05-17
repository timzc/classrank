import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { academicYearsApi } from '@/lib/api/academic-years';
import { queryKeys } from '@/lib/query-keys';

type YearId = number | 'all';

interface YearContextValue {
  yearId: YearId;
  setYearId: (id: YearId) => void;
}

const YearContext = createContext<YearContextValue | null>(null);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [yearId, setYearIdState] = useState<YearId>(() => {
    const stored = localStorage.getItem('classrank.yearId');
    if (!stored) return 'all';
    return stored === 'all' ? 'all' : Number(stored);
  });
  const setYearId = (id: YearId) => {
    setYearIdState(id);
    localStorage.setItem('classrank.yearId', String(id));
  };
  const value = useMemo(() => ({ yearId, setYearId }), [yearId]);
  return <YearContext.Provider value={value}>{children}</YearContext.Provider>;
}

export function useCurrentYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error('useCurrentYear must be used inside AcademicYearProvider');
  return ctx;
}

export function AcademicYearSwitcher() {
  const { yearId, setYearId } = useCurrentYear();
  const qc = useQueryClient();
  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears(),
    queryFn: academicYearsApi.list,
  });
  const current = yearId === 'all' ? '全部学年' : years.find((y) => y.id === yearId)?.name ?? '全部学年';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2.5">
          {current}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuLabel>切换学年</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { setYearId('all'); qc.invalidateQueries(); }}>
          全部学年
        </DropdownMenuItem>
        {years.map((y) => (
          <DropdownMenuItem
            key={y.id}
            onClick={() => { setYearId(y.id); qc.invalidateQueries(); }}
          >
            {y.name}{y.is_active ? ' · 当前' : ''}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
