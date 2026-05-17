import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function App() {
  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle>主题烟测</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button>主按钮（黑）</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </CardContent>
      </Card>
    </div>
  );
}
