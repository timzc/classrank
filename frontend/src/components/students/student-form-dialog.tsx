import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { studentsApi, type Student } from '@/lib/api/students';

export function StudentFormDialog({
  open, onOpenChange, student,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student?: Student;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(student?.name ?? '');
  useEffect(() => { setName(student?.name ?? ''); }, [student]);

  const submit = useMutation({
    mutationFn: () => student ? studentsApi.update(student.id, { name }) : studentsApi.add(name),
    onSuccess: () => {
      toast.success(student ? '已更新' : '已添加');
      qc.invalidateQueries({ queryKey: ['students'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{student ? '编辑学生' : '添加学生'}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="name">姓名</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => submit.mutate()} disabled={!name.trim() || submit.isPending}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
