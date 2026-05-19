import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AcademicYearSwitcher } from './academic-year-switcher';

const TABS = [
  { to: '/', label: '积分统计', end: true },
  { to: '/upload', label: '上传解析' },
  { to: '/students', label: '学生管理' },
  { to: '/settings', label: '系统设置' },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-xl bg-white/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--surface))] text-base leading-none" aria-hidden>
            📊
          </div>
          <span className="text-sm font-semibold tracking-tight">考评积分</span>
        </div>
        <nav
          className="flex items-center gap-1 rounded-full bg-black/5 p-1"
          aria-label="主导航"
        >
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <AcademicYearSwitcher />
      </div>
    </header>
  );
}
