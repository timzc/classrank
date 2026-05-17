import { Outlet } from 'react-router-dom';
import { TopNav } from './top-nav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
