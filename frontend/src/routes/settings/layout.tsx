import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SUB = [
  { to: '/settings/api', label: 'API 配置' },
  { to: '/settings/academic-years', label: '学年管理' },
  { to: '/settings/data', label: '数据管理' },
];

export default function SettingsLayout() {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-0.5">
        {SUB.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            className={({ isActive }) =>
              cn(
                'block rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive ? 'bg-black/5 text-foreground font-medium' : 'text-muted-foreground hover:bg-black/5 hover:text-foreground',
              )
            }
          >
            {s.label}
          </NavLink>
        ))}
      </aside>
      <section><Outlet /></section>
    </div>
  );
}
