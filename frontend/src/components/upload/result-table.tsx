import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';

export interface ResultRow {
  id: string;
  studentName: string;
  type: 'bonus' | 'penalty';
  item: string;
  score: number;
}

export function ResultTable({
  rows,
  onChange,
  knownStudents,
}: {
  rows: ResultRow[];
  onChange: (next: ResultRow[]) => void;
  knownStudents: string[];
}) {
  const update = (id: string, patch: Partial<ResultRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>学生</TableHead>
          <TableHead className="w-24">类型</TableHead>
          <TableHead>项目</TableHead>
          <TableHead className="w-20">分数</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <Input
                list="known-students"
                value={r.studentName}
                onChange={(e) => update(r.id, { studentName: e.target.value })}
              />
            </TableCell>
            <TableCell>
              <Select value={r.type} onValueChange={(v) => update(r.id, { type: v as ResultRow['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">加分</SelectItem>
                  <SelectItem value="penalty">扣分</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Input value={r.item} onChange={(e) => update(r.id, { item: e.target.value })} />
            </TableCell>
            <TableCell>
              <Input
                type="number"
                min={1}
                value={r.score}
                onChange={(e) => update(r.id, { score: Math.max(1, Number(e.target.value) || 1) })}
              />
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="删除">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <datalist id="known-students">
      {knownStudents.map((n) => <option key={n} value={n} />)}
    </datalist>
    </>
  );
}
