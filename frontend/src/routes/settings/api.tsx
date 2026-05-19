import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/common/loading-button';
import { configApi } from '@/lib/api/config';
import { queryKeys } from '@/lib/query-keys';

const DEFAULT_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const DEFAULT_MODEL = 'Qwen/Qwen2.5-VL-32B-Instruct';

const schema = z.object({
  api_url: z.string().url('请输入合法的 URL'),
  api_key: z.string().min(10, 'API Key 至少 10 个字符'),
  model: z.string().min(1, '请填写模型名'),
});
type FormValues = z.infer<typeof schema>;

export default function SettingsApiPage() {
  const [urlQ, keyQ, modelQ] = useQueries({
    queries: [
      { queryKey: queryKeys.config('ocr_api_url'), queryFn: () => configApi.get('ocr_api_url') },
      { queryKey: queryKeys.config('ocr_api_key'), queryFn: () => configApi.get('ocr_api_key') },
      { queryKey: queryKeys.config('ocr_model'), queryFn: () => configApi.get('ocr_model') },
    ],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { api_url: DEFAULT_API_URL, api_key: '', model: DEFAULT_MODEL },
  });
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    if (!urlQ.data || !keyQ.data || !modelQ.data) return;
    form.reset({
      api_url: urlQ.data.value || DEFAULT_API_URL,
      api_key: keyQ.data.value,
      model: modelQ.data.value || DEFAULT_MODEL,
    });
    initialized.current = true;
  }, [urlQ.data, keyQ.data, modelQ.data, form]);

  useEffect(() => {
    const err = urlQ.error || keyQ.error || modelQ.error;
    if (err instanceof Error) toast.error(err.message);
  }, [urlQ.error, keyQ.error, modelQ.error]);

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      await configApi.set('ocr_api_url', v.api_url);
      await configApi.set('ocr_api_key', v.api_key);
      await configApi.set('ocr_model', v.model);
    },
    onSuccess: () => toast.success('已保存配置'),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>OCR API 配置</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="api_url">API URL</Label>
            <Input id="api_url" {...form.register('api_url')} placeholder={DEFAULT_API_URL} />
            <div className="text-xs text-muted-foreground">
              兼容 OpenAI Chat Completions 协议的视觉模型端点，留默认即使用 SiliconFlow。
            </div>
            {form.formState.errors.api_url && (
              <div className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.api_url.message}</div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="api_key">API Key</Label>
            <Input id="api_key" type="password" {...form.register('api_key')} placeholder="sk-..." />
            {form.formState.errors.api_key && (
              <div className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.api_key.message}</div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">模型</Label>
            <Input id="model" {...form.register('model')} />
            {form.formState.errors.model && (
              <div className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.model.message}</div>
            )}
          </div>
          <LoadingButton type="submit" loading={save.isPending}>保存</LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
