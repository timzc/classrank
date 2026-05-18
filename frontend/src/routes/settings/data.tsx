import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/common/loading-button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { dataApi } from '@/lib/api/data';

export default function SettingsDataPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const payload = JSON.parse(text);
      return dataApi.import(payload);
    },
    onSuccess: () => { toast.success('导入完成'); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: () => dataApi.clear(),
    onSuccess: () => {
      toast.success('已清空全部数据');
      qc.invalidateQueries();
      setClearConfirmOpen(false);
      setConfirmText('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>导出</CardTitle></CardHeader>
        <CardContent>
          <Button asChild><a href={dataApi.exportUrl} download>下载 JSON 备份</a></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>导入</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importMut.mutate(f);
              e.target.value = '';
            }}
          />
          <LoadingButton variant="outline" loading={importMut.isPending} onClick={() => fileRef.current?.click()}>
            选择 JSON 文件
          </LoadingButton>
          <div className="text-xs text-muted-foreground">导入会按学生姓名 upsert，原有同学不会被覆盖。</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>清空数据</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setClearConfirmOpen(true)}>清空全部学生与记录</Button>
        </CardContent>
      </Card>

      <AlertDialog open={clearConfirmOpen} onOpenChange={(v) => { setClearConfirmOpen(v); if (!v) setConfirmText(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>这会删除全部数据</AlertDialogTitle>
            <AlertDialogDescription>
              不可恢复。请输入 <span className="font-semibold text-foreground">DELETE</span> 确认。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction disabled={confirmText !== 'DELETE' || clear.isPending} onClick={(e) => { e.preventDefault(); clear.mutate(); }}>
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
