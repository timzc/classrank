import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function RankingTable({ rows }: { rows: Array<{ id: number; name: string; score: number }> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>姓名</TableHead>
          <TableHead className="text-right">总分</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.id}>
            <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className={cn('text-right tabular-nums', r.score >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]')}>
              {r.score >= 0 ? '+' : ''}{r.score}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
