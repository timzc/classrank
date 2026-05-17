import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'positive' | 'negative' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums',
          tone === 'positive' && 'text-[hsl(var(--success))]',
          tone === 'negative' && 'text-[hsl(var(--destructive))]',
        )}>{value}</div>
      </CardContent>
    </Card>
  );
}
