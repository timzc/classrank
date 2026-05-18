import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { academicYearsApi, type AcademicYear } from '@/lib/api/academic-years';
import { queryKeys } from '@/lib/query-keys';

export default function SettingsAcademicYearsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<AcademicYear | null>(null);

  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears(),
    queryFn: academicYearsApi.list,
  });
  const add = useMutation({
    mutationFn: () => academicYearsApi.add(name.trim(), years.length),
    onSuccess: () => { setName(''); toast.success('已添加学年'); qc.invalidateQueries({ queryKey: ['academic-years'] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const activate = useMutation({
    mutationFn: (id: number) => academicYearsApi.activate(id),
    onSuccess: () => { toast.success('已切换当前学年'); qc.invalidateQueries({ queryKey: ['academic-years'] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => academicYearsApi.remove(id),
    onSuccess: () => { toast.success('已删除'); qc.invalidateQueries({ queryKey: ['academic-years'] }); setPendingDelete(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>新增学年</CardTitle></CardHeader>
        <CardContent className="flex gap-2 max-w-md">
          <Input placeholder="如 2025-2026 上学期" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}><Plus className="h-3.5 w-3.5" /> 添加</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>学年列表</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead className="w-24">状态</TableHead>
                <TableHead className="w-48 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => (
                <TableRow key={y.id}>
                  <TableCell className="font-medium">{y.name}</TableCell>
                  <TableCell>
                    {y.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">
                        <Check className="h-3 w-3" /> 当前
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" disabled={y.is_active || activate.isPending} onClick={() => activate.mutate(y.id)}>
                      设为当前
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setPendingDelete(y)} aria-label="删除">
                      <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {years.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-xs text-muted-foreground">暂无学年</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除学年</AlertDialogTitle>
            <AlertDialogDescription>
              删除 {pendingDelete?.name}。该学年下的记录会保留但解除关联（后端 ScoreRecord.academic_year on_delete=SET_NULL）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
