import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StudentFormDialog } from '@/components/students/student-form-dialog';
import { StudentDetailSheet } from '@/components/students/student-detail-sheet';
import { studentsApi, type Student } from '@/lib/api/students';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';

export default function StudentsPage() {
  const { yearId } = useCurrentYear();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | undefined>();
  const [detail, setDetail] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.students(yearId),
    queryFn: () => studentsApi.list(yearId),
  });

  const toggleFocus = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      studentsApi.update(id, { is_focused: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => studentsApi.remove(id),
    onSuccess: () => {
      toast.success('已删除');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['records'] });
      setPendingDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(keyword.toLowerCase())),
    [students, keyword],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input className="max-w-[240px]" placeholder="搜索姓名" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <div className="flex-1" />
        <Button size="sm" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> 添加学生
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead className="text-right">总分</TableHead>
                <TableHead className="w-32">重点关注</TableHead>
                <TableHead className="w-40 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.total_score}</TableCell>
                  <TableCell>
                    <Switch checked={s.is_focused} onCheckedChange={(v) => toggleFocus.mutate({ id: s.id, value: v })} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(s)}>详情</Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setFormOpen(true); }} aria-label="编辑">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setPendingDelete(s)} aria-label="删除">
                      <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-xs text-muted-foreground">暂无学生</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} student={editing} />
      <StudentDetailSheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)} student={detail} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除学生</AlertDialogTitle>
            <AlertDialogDescription>
              将同时删除 {pendingDelete?.name} 的所有积分记录，操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (pendingDelete) remove.mutate(pendingDelete.id); }}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
