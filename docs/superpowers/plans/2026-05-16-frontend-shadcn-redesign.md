# 前端 shadcn + Apple 风格重设计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `templates/index.html`（2372 行单文件 HTML/JS + ECharts）替换为 `frontend/` 下的 Vite + React + TS + Tailwind + shadcn/ui 单页应用，主题白底黑强调、UI 参考 Apple 风格，保留全部 4 个 tab 功能并保持 Django 后端 / API / models / 迁移零修改。

**Architecture:** Vite 构建到 `static/app/`，Django 用自写 `{% vite_asset %}` 模板标签按 `manifest.json` 注入入口脚本/样式；开发时 Vite dev server 5173 提供 HMR，模板标签在 `DEBUG=True` 时引用 dev 资源；旧 HTML 改名 `legacy.html` 作回滚兜底。前端用 React Router v6 管 4 个顶层路由，TanStack Query v5 管服务器状态，shadcn/ui + Tailwind + Recharts 渲染所有界面，原生 fetch 包装 `request<T>()` 自动注入 `X-CSRFToken`。

**Tech Stack:** Vite 5 · React 18 · TypeScript 5 · Tailwind CSS 3 · shadcn/ui · React Router 6 · TanStack Query 5 · react-hook-form · zod · Recharts · sonner · date-fns · lucide-react · Vitest（单元测试）

**参考文档:** `docs/superpowers/specs/2026-05-16-frontend-shadcn-redesign-design.md`

---

## 文件结构概览（执行前先建立心智模型）

```
classrank/
├── frontend/                          # 全新
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── components.json                # shadcn 配置
│   ├── index.html                     # Vite 自身入口（仅构建用）
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                    # QueryClientProvider + Router + Toaster
│   │   ├── styles/globals.css
│   │   ├── lib/
│   │   │   ├── utils.ts               # cn()
│   │   │   ├── csrf.ts
│   │   │   ├── query-keys.ts
│   │   │   └── api/
│   │   │       ├── client.ts          # request<T>() + ApiError
│   │   │       ├── endpoints.ts
│   │   │       ├── students.ts
│   │   │       ├── records.ts
│   │   │       ├── config.ts
│   │   │       ├── academic-years.ts
│   │   │       ├── stats.ts
│   │   │       ├── data.ts
│   │   │       └── ocr.ts
│   │   ├── hooks/
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn 复制进来的基础组件
│   │   │   ├── layout/
│   │   │   │   ├── app-shell.tsx
│   │   │   │   ├── top-nav.tsx
│   │   │   │   └── academic-year-switcher.tsx
│   │   │   ├── common/
│   │   │   │   ├── empty-state.tsx
│   │   │   │   └── loading-button.tsx
│   │   │   ├── dashboard/
│   │   │   ├── upload/
│   │   │   ├── students/
│   │   │   └── settings/
│   │   ├── routes/
│   │   │   ├── dashboard.tsx
│   │   │   ├── upload.tsx
│   │   │   ├── students.tsx
│   │   │   └── settings/
│   │   │       ├── layout.tsx
│   │   │       ├── api.tsx
│   │   │       ├── academic-years.tsx
│   │   │       └── data.tsx
│   │   └── test/
│   │       └── setup.ts               # vitest setup
│   └── tests/
│       ├── api-client.test.ts
│       └── csrf.test.ts
├── core/templatetags/
│   ├── __init__.py
│   └── vite.py                        # {% vite_asset %} 标签
├── templates/
│   ├── index.html                     # 改为加载壳
│   └── legacy.html                    # 旧版备份
├── classrank/urls.py                  # 增加 /legacy/ 路由
├── .gitignore                         # 加 frontend/node_modules、static/app
├── start.sh                           # 加 npm ci + build 步骤
├── Dockerfile                         # 多阶段
└── docker-entrypoint.sh               # 保持不变（确认即可）
```

---

## Task 1: 初始化 frontend/ Vite 工程

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/.gitignore`

- [ ] **Step 1: 创建 frontend 目录并初始化 package.json**

```bash
mkdir -p frontend/src
cd frontend
cat > package.json <<'EOF'
{
  "name": "classrank-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@tanstack/react-query": "^5.59.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.453.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-router-dom": "^6.27.0",
    "recharts": "^2.13.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^22.7.5",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
EOF
```

- [ ] **Step 2: 创建 tsconfig.json + tsconfig.node.json**

`frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "tailwind.config.ts", "postcss.config.js"]
}
```

- [ ] **Step 3: 创建 vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/static/app/' : '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: '../static/app',
    emptyOutDir: true,
    manifest: 'manifest.json',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}));
```

- [ ] **Step 4: 创建 frontend/index.html, src/main.tsx, src/App.tsx 骨架**

`frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>学生考评积分管理系统</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`frontend/src/App.tsx`:

```tsx
export default function App() {
  return <div style={{ padding: 24 }}>Vite + React 已启动</div>;
}
```

- [ ] **Step 5: 创建 frontend/.gitignore**

```
node_modules
dist
.vite
*.log
```

- [ ] **Step 6: 安装依赖并验证 dev server**

```bash
cd frontend && npm install
npm run dev
```
另开终端：`curl -sI http://localhost:5173/ | head -1`
Expected：`HTTP/1.1 200 OK`
浏览器访问 `http://localhost:5173/` 应看到 "Vite + React 已启动"。Ctrl+C 停止 dev server。

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat(frontend): 初始化 Vite + React + TS 工程骨架"
```

---

## Task 2: 配置 Tailwind + 主题变量 + shadcn 基础组件

**Files:**
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/styles/globals.css`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/components.json`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/label.tsx`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 创建 postcss.config.js 与 tailwind.config.ts**

`frontend/postcss.config.js`:

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`frontend/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"PingFang SC"',
          '"Helvetica Neue"',
          'Inter',
          'sans-serif',
        ],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
```

- [ ] **Step 2: 创建 globals.css（主题变量）**

`frontend/src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Apple 风格白底黑强调 */
    --background: 0 0% 100%;
    --foreground: 220 6% 12%;        /* #1D1D1F */
    --surface: 220 6% 96%;           /* #F5F5F7 */
    --card: 0 0% 100%;
    --card-foreground: 220 6% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 220 6% 12%;
    --primary: 0 0% 0%;              /* 纯黑强调 */
    --primary-foreground: 0 0% 100%;
    --secondary: 220 6% 96%;
    --secondary-foreground: 220 6% 12%;
    --muted: 220 6% 96%;
    --muted-foreground: 220 4% 44%;  /* #6E6E73 */
    --accent: 220 6% 92%;
    --accent-foreground: 220 6% 12%;
    --destructive: 4 100% 60%;       /* #FF3B30 */
    --destructive-foreground: 0 0% 100%;
    --success: 142 71% 49%;          /* #34C759 */
    --success-foreground: 0 0% 100%;
    --border: 220 6% 90%;
    --input: 220 6% 90%;
    --ring: 0 0% 0%;
    --radius: 0.625rem;              /* 10px */
  }
  * {
    @apply border-border;
  }
  html, body, #root {
    height: 100%;
  }
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }
}
```

- [ ] **Step 3: 创建 src/lib/utils.ts**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: 创建 components.json（shadcn 配置）**

`frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 5: 手写 4 个基础 shadcn 组件（button/card/input/label）**

> 这一步直接写入文件，不依赖 `npx shadcn add`（避免网络/版本飘移）。内容是 shadcn/ui 默认模板。

`frontend/src/components/ui/button.tsx`:

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-black/5',
        secondary: 'bg-surface text-foreground hover:bg-black/5',
        ghost: 'hover:bg-black/5',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
```

`frontend/src/components/ui/card.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-xl border bg-card text-card-foreground', className)} {...props} />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-base font-semibold tracking-tight', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
```

`frontend/src/components/ui/input.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

`frontend/src/components/ui/label.tsx`:

```tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
));
Label.displayName = 'Label';
```

- [ ] **Step 6: 让 main.tsx 引入 globals.css，App.tsx 用基础组件展示**

修改 `frontend/src/main.tsx`，在 `import App from './App';` 之后加：

```tsx
import './styles/globals.css';
```

替换 `frontend/src/App.tsx`：

```tsx
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
```

- [ ] **Step 7: 运行 dev server，验证主题正确**

```bash
cd frontend && npm run dev
```
浏览器访问 `http://localhost:5173/`：
- 背景纯白
- 卡片 12px 圆角 1px hairline 边框
- 主按钮纯黑底 + 白字
- 字体应优先 SF Pro / PingFang SC（macOS 上验证）

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat(frontend): 配置 Tailwind + Apple 主题变量与基础 shadcn 组件"
```

---

## Task 3: Django Vite 模板标签 + index.html 加载壳 + legacy 回滚

**Files:**
- Create: `core/templatetags/__init__.py`
- Create: `core/templatetags/vite.py`
- Create: `templates/legacy.html`（复制自现有 `templates/index.html`）
- Modify: `templates/index.html`
- Modify: `classrank/urls.py`
- Modify: `.gitignore`

- [ ] **Step 1: 备份旧 index.html 为 legacy.html**

```bash
cp templates/index.html templates/legacy.html
```

- [ ] **Step 2: 创建 templatetags 包**

```bash
mkdir -p core/templatetags
touch core/templatetags/__init__.py
```

- [ ] **Step 3: 写 vite.py 模板标签**

`core/templatetags/vite.py`:

```python
import json
from pathlib import Path

from django import template
from django.conf import settings
from django.utils.safestring import mark_safe

register = template.Library()

VITE_DEV_SERVER = 'http://localhost:5173'
MANIFEST_PATH = Path(settings.BASE_DIR) / 'static' / 'app' / 'manifest.json'


def _dev_tags(entry: str) -> str:
    return (
        f'<script type="module" src="{VITE_DEV_SERVER}/@vite/client"></script>'
        f'<script type="module" src="{VITE_DEV_SERVER}/{entry}"></script>'
    )


def _prod_tags(entry: str) -> str:
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    except FileNotFoundError as exc:
        raise RuntimeError(
            f'Vite manifest not found at {MANIFEST_PATH}. '
            'Did you run `npm run build` in frontend/?'
        ) from exc

    record = manifest.get(entry)
    if not record:
        raise RuntimeError(f'Entry "{entry}" missing in Vite manifest')

    tags = [f'<script type="module" src="{settings.STATIC_URL}app/{record["file"]}"></script>']
    for css_path in record.get('css', []):
        tags.append(f'<link rel="stylesheet" href="{settings.STATIC_URL}app/{css_path}">')
    return ''.join(tags)


@register.simple_tag
def vite_asset(entry: str) -> str:
    """在 DEBUG=True 时输出 Vite dev server 的资源标签，否则从 manifest 解析。"""
    if settings.DEBUG:
        return mark_safe(_dev_tags(entry))
    return mark_safe(_prod_tags(entry))
```

- [ ] **Step 4: 重写 templates/index.html 为加载壳**

```html
{% load vite %}
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>学生考评积分管理系统</title>
    {# 确保下发 csrftoken cookie，前端 fetch 会读取 #}
    {% csrf_token %}
    {% vite_asset "src/main.tsx" %}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

- [ ] **Step 5: 在 classrank/urls.py 增加 /legacy/ 路由**

修改 `classrank/urls.py`：

```python
"""URL configuration for classrank project."""

from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('legacy/', TemplateView.as_view(template_name='legacy.html'), name='legacy'),
    path('', TemplateView.as_view(template_name='index.html'), name='index'),
]
```

- [ ] **Step 6: 更新 .gitignore**

在 `.gitignore` 末尾追加：

```
# Vite frontend build artifacts
frontend/node_modules/
static/app/
```

- [ ] **Step 7: 验证 DEBUG 模式注入 dev server 脚本**

终端 1：
```bash
cd frontend && npm run dev
```
终端 2：
```bash
source venv/bin/activate
python manage.py runserver 8000
```
终端 3：
```bash
curl -s http://127.0.0.1:8000/ | grep -E 'localhost:5173|csrfmiddlewaretoken'
```
Expected：能看到 `http://localhost:5173/@vite/client` 与 `http://localhost:5173/src/main.tsx`，以及 `csrfmiddlewaretoken` 隐藏字段。
浏览器访问 `http://127.0.0.1:8000/` 应看到 Task 2 的"主题烟测"卡片（React 通过 Vite 注入加载）。
Ctrl+C 停止两个进程。

- [ ] **Step 8: 验证 legacy 路由**

```bash
source venv/bin/activate
python manage.py runserver 8000
```
浏览器访问 `http://127.0.0.1:8000/legacy/`，应看到旧版 4-tab 界面正常工作。Ctrl+C 停止。

- [ ] **Step 9: Commit**

```bash
git add core/templatetags/ templates/index.html templates/legacy.html classrank/urls.py .gitignore
git commit -m "feat(backend): Vite 资源加载模板标签 + index 加载壳 + legacy 回滚路由"
```

---

## Task 4: API 客户端（含 vitest 单元测试）

**Files:**
- Create: `frontend/src/lib/csrf.ts`
- Create: `frontend/src/lib/api/client.ts`
- Create: `frontend/src/lib/api/endpoints.ts`
- Create: `frontend/src/lib/api/students.ts`
- Create: `frontend/src/lib/api/records.ts`
- Create: `frontend/src/lib/api/config.ts`
- Create: `frontend/src/lib/api/academic-years.ts`
- Create: `frontend/src/lib/api/stats.ts`
- Create: `frontend/src/lib/api/data.ts`
- Create: `frontend/src/lib/api/ocr.ts`
- Create: `frontend/src/lib/query-keys.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/tests/csrf.test.ts`
- Create: `frontend/tests/api-client.test.ts`

- [ ] **Step 1: 写失败测试 frontend/tests/csrf.test.ts**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { getCsrfToken } from '@/lib/csrf';

describe('getCsrfToken', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('returns empty string when cookie missing', () => {
    expect(getCsrfToken()).toBe('');
  });

  it('reads csrftoken from cookie', () => {
    document.cookie = 'csrftoken=abc123; path=/';
    expect(getCsrfToken()).toBe('abc123');
  });

  it('ignores other cookies sharing prefix', () => {
    document.cookie = 'xcsrftoken=wrong; path=/';
    document.cookie = 'csrftoken=correct; path=/';
    expect(getCsrfToken()).toBe('correct');
  });
});
```

- [ ] **Step 2: 写 setup.ts 并运行测试看失败**

`frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

```bash
cd frontend && npm test -- tests/csrf.test.ts
```
Expected: FAIL（`@/lib/csrf` 不存在）

- [ ] **Step 3: 实现 lib/csrf.ts**

```ts
export function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}
```

```bash
npm test -- tests/csrf.test.ts
```
Expected: PASS（3 项全通过）

- [ ] **Step 4: 写 client.ts 失败测试 frontend/tests/api-client.test.ts**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from '@/lib/api/client';

const originalFetch = globalThis.fetch;

describe('request', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=tok; path=/';
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('parses JSON success response', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await request<{ ok: boolean }>('/api/test/');
    expect(result).toEqual({ ok: true });
  });

  it('throws ApiError on non-2xx', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: false, error: 'bad' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(request('/api/test/')).rejects.toBeInstanceOf(ApiError);
  });

  it('adds X-CSRFToken on POST', async () => {
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = spy;
    await request('/api/test/', { method: 'POST', body: JSON.stringify({}) });
    const headers = new Headers((spy.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('X-CSRFToken')).toBe('tok');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not add CSRF on GET', async () => {
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = spy;
    await request('/api/test/');
    const headers = new Headers((spy.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('X-CSRFToken')).toBeNull();
  });

  it('does not stringify FormData and skips Content-Type', async () => {
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = spy;
    const fd = new FormData();
    fd.append('image', new Blob(['x']), 'a.png');
    await request('/api/parse/', { method: 'POST', body: fd });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(fd);
    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
  });
});
```

```bash
npm test -- tests/api-client.test.ts
```
Expected: FAIL（`@/lib/api/client` 不存在）

- [ ] **Step 5: 实现 lib/api/client.ts**

```ts
import { getCsrfToken } from '@/lib/csrf';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  const isFormData = init.body instanceof FormData;
  if (!isFormData && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (method !== 'GET' && method !== 'HEAD') {
    const token = getCsrfToken();
    if (token) headers.set('X-CSRFToken', token);
  }

  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : null) ?? res.statusText ?? 'Request failed';
    throw new ApiError(res.status, body, message);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
```

```bash
npm test -- tests/api-client.test.ts
```
Expected: PASS（5 项全通过）

- [ ] **Step 6: 端点常量 lib/api/endpoints.ts**

```ts
export const ENDPOINTS = {
  // OCR
  parse: '/api/parse/',
  // 记录
  records: '/api/records/',
  recordsSave: '/api/records/save/',
  recordsDailyDetails: '/api/records/daily-details/',
  recordDetail: (id: number) => `/api/records/${id}/`,
  recordUpdate: (id: number) => `/api/records/${id}/update/`,
  recordDelete: (id: number) => `/api/records/${id}/delete/`,
  recordsDeleteByDate: '/api/records/delete-by-date/',
  // 学生
  students: '/api/students/',
  studentAdd: '/api/students/add/',
  studentUpdate: (id: number) => `/api/students/${id}/`,
  studentDelete: (id: number) => `/api/students/${id}/delete/`,
  studentHistory: (id: number) => `/api/students/${id}/history/`,
  studentsFocused: '/api/students/focused/',
  // 配置
  config: (key: string) => `/api/config/${key}/`,
  configSet: (key: string) => `/api/config/${key}/set/`,
  // 统计
  stats: '/api/stats/',
  // 数据
  dataExport: '/api/data/export/',
  dataImport: '/api/data/import/',
  dataClear: '/api/data/clear/',
  // 学年
  academicYears: '/api/academic-years/',
  academicYearAdd: '/api/academic-years/add/',
  academicYearUpdate: (id: number) => `/api/academic-years/${id}/update/`,
  academicYearDelete: (id: number) => `/api/academic-years/${id}/delete/`,
  academicYearActivate: (id: number) => `/api/academic-years/${id}/activate/`,
} as const;
```

- [ ] **Step 7: 各资源 api 模块**

`frontend/src/lib/api/students.ts`:

```ts
import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface Student {
  id: number;
  name: string;
  is_focused: boolean;
  total_score: number;
}

export const studentsApi = {
  list: (yearId?: number | 'all') =>
    request<{ success: boolean; data: Student[] }>(
      `${ENDPOINTS.students}${yearId !== undefined ? `?year_id=${yearId}` : ''}`,
    ).then((r) => r.data),
  add: (name: string) =>
    request<{ success: boolean; data: Student }>(ENDPOINTS.studentAdd, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  update: (id: number, payload: Partial<Pick<Student, 'name' | 'is_focused'>>) =>
    request<{ success: boolean; data: Student }>(ENDPOINTS.studentUpdate(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.studentDelete(id), { method: 'DELETE' }),
  history: (id: number, yearId?: number | 'all') =>
    request<{ success: boolean; data: unknown }>(
      `${ENDPOINTS.studentHistory(id)}${yearId !== undefined ? `?year_id=${yearId}` : ''}`,
    ).then((r) => r.data),
  focused: (yearId?: number | 'all') =>
    request<{ success: boolean; data: Student[] }>(
      `${ENDPOINTS.studentsFocused}${yearId !== undefined ? `?year_id=${yearId}` : ''}`,
    ).then((r) => r.data),
};
```

`frontend/src/lib/api/records.ts`:

```ts
import { request } from './client';
import { ENDPOINTS } from './endpoints';

export type ScoreType = 'bonus' | 'penalty';

export interface RecordItem {
  id: number;
  student_id: number;
  student_name: string;
  date: string;
  type: ScoreType;
  item: string;
  score: number;
}

export interface SaveRecordsPayload {
  date: string;
  academic_year_id?: number | 'all';
  students: Array<{
    name: string;
    bonus_items?: Array<{ item: string; score: number }>;
    penalty_items?: Array<{ item: string; score: number }>;
  }>;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const recordsApi = {
  list: (params: { start?: string; end?: string; year_id?: number | 'all' } = {}) =>
    request<{ success: boolean; data: RecordItem[] }>(
      `${ENDPOINTS.records}${qs(params)}`,
    ).then((r) => r.data),
  save: (payload: SaveRecordsPayload) =>
    request<{ success: boolean }>(ENDPOINTS.recordsSave, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  dailyDetails: (date: string, yearId?: number | 'all') =>
    request<{ success: boolean; data: RecordItem[] }>(
      `${ENDPOINTS.recordsDailyDetails}${qs({ date, year_id: yearId })}`,
    ).then((r) => r.data),
  get: (id: number) =>
    request<{ success: boolean; data: RecordItem }>(ENDPOINTS.recordDetail(id)).then((r) => r.data),
  update: (id: number, payload: Partial<Omit<RecordItem, 'id' | 'student_name'>>) =>
    request<{ success: boolean }>(ENDPOINTS.recordUpdate(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.recordDelete(id), { method: 'DELETE' }),
  removeByDate: (date: string, yearId?: number | 'all') =>
    request<{ success: boolean }>(ENDPOINTS.recordsDeleteByDate, {
      method: 'DELETE',
      body: JSON.stringify({ date, academic_year_id: yearId }),
    }),
};
```

`frontend/src/lib/api/config.ts`:

```ts
import { request } from './client';
import { ENDPOINTS } from './endpoints';

export const configApi = {
  get: (key: string) =>
    request<{ success: boolean; data: { key: string; value: string } }>(ENDPOINTS.config(key)).then((r) => r.data),
  set: (key: string, value: string, description?: string) =>
    request<{ success: boolean }>(ENDPOINTS.configSet(key), {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    }),
};
```

`frontend/src/lib/api/academic-years.ts`:

```ts
import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface AcademicYear {
  id: number;
  name: string;
  order: number;
  is_active: boolean;
}

export const academicYearsApi = {
  list: () =>
    request<{ success: boolean; data: AcademicYear[] }>(ENDPOINTS.academicYears).then((r) => r.data),
  add: (name: string, order = 0) =>
    request<{ success: boolean; data: AcademicYear }>(ENDPOINTS.academicYearAdd, {
      method: 'POST',
      body: JSON.stringify({ name, order }),
    }),
  update: (id: number, payload: Partial<Pick<AcademicYear, 'name' | 'order'>>) =>
    request<{ success: boolean }>(ENDPOINTS.academicYearUpdate(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.academicYearDelete(id), { method: 'DELETE' }),
  activate: (id: number) =>
    request<{ success: boolean }>(ENDPOINTS.academicYearActivate(id), { method: 'PUT' }),
};
```

`frontend/src/lib/api/stats.ts`:

```ts
import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface StatsPayload {
  totals: { bonus: number; penalty: number; net: number };
  participating_students: number;
  focused_students: number;
  daily: Array<{ date: string; bonus: number; penalty: number; net: number; cumulative?: number }>;
  ranking: Array<{ id: number; name: string; score: number }>;
}

export const statsApi = {
  get: (params: { start?: string; end?: string; year_id?: number | 'all' } = {}) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
    const q = sp.toString();
    return request<{ success: boolean; data: StatsPayload }>(
      `${ENDPOINTS.stats}${q ? `?${q}` : ''}`,
    ).then((r) => r.data);
  },
};
```

`frontend/src/lib/api/data.ts`:

```ts
import { ENDPOINTS } from './endpoints';
import { request } from './client';

export const dataApi = {
  exportUrl: ENDPOINTS.dataExport,
  import: (payload: unknown) =>
    request<{ success: boolean }>(ENDPOINTS.dataImport, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  clear: () =>
    request<{ success: boolean }>(ENDPOINTS.dataClear, { method: 'POST' }),
};
```

`frontend/src/lib/api/ocr.ts`:

```ts
import { request } from './client';
import { ENDPOINTS } from './endpoints';

export interface ParsedItem {
  item: string;
  score: number;
}

export interface ParsedStudent {
  name: string;
  bonus_items: ParsedItem[];
  penalty_items: ParsedItem[];
}

export interface ParsedResult {
  date?: string;
  students: ParsedStudent[];
}

export const ocrApi = {
  parse: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return request<{ success: boolean; data: ParsedResult }>(ENDPOINTS.parse, {
      method: 'POST',
      body: fd,
    }).then((r) => r.data);
  },
};
```

> ⚠️ **执行说明**：上面的 `Student.total_score`、`stats.daily.cumulative` 等字段命名按 spec 设计，**实施时按 `core/views.py` 实际返回结构对齐**（执行 Task 4 时请先 `grep` 对应 view 检查字段名，必要时只调整类型字段名，逻辑不变）。

- [ ] **Step 8: 写 query-keys.ts**

```ts
export const queryKeys = {
  stats: (params: object) => ['stats', params] as const,
  students: (yearId?: number | 'all') => ['students', yearId] as const,
  studentsFocused: (yearId?: number | 'all') => ['students', 'focused', yearId] as const,
  studentHistory: (id: number, yearId?: number | 'all') => ['students', id, 'history', yearId] as const,
  records: (params: object) => ['records', params] as const,
  dailyDetails: (date: string, yearId?: number | 'all') => ['records', 'daily', date, yearId] as const,
  academicYears: () => ['academic-years'] as const,
  config: (key: string) => ['config', key] as const,
} as const;
```

- [ ] **Step 9: 全量跑测试确认所有通过**

```bash
cd frontend && npm test
```
Expected: 所有 8 项通过

- [ ] **Step 10: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat(frontend): API 客户端、端点常量、TanStack Query keys 与单元测试"
```

---

## Task 5: App shell（Router + QueryClient + 顶部导航 + 学年切换）

**Files:**
- Create: `frontend/src/components/ui/sonner.tsx`
- Create: `frontend/src/components/layout/app-shell.tsx`
- Create: `frontend/src/components/layout/top-nav.tsx`
- Create: `frontend/src/components/layout/academic-year-switcher.tsx`
- Create: `frontend/src/components/ui/dropdown-menu.tsx`
- Create: `frontend/src/routes/dashboard.tsx`
- Create: `frontend/src/routes/upload.tsx`
- Create: `frontend/src/routes/students.tsx`
- Create: `frontend/src/routes/settings/layout.tsx`
- Create: `frontend/src/routes/settings/api.tsx`
- Create: `frontend/src/routes/settings/academic-years.tsx`
- Create: `frontend/src/routes/settings/data.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 加 sonner Toaster 包装**

`frontend/src/components/ui/sonner.tsx`:

```tsx
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'bg-white border border-border shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-xl',
          title: 'text-foreground font-medium',
          description: 'text-muted-foreground',
        },
      }}
    />
  );
}
```

- [ ] **Step 2: 加 dropdown-menu shadcn 组件（用于学年切换）**

`frontend/src/components/ui/dropdown-menu.tsx`:

```tsx
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground',
        'shadow-[0_8px_30px_rgba(0,0,0,0.06)] data-[state=open]:animate-in data-[state=closed]:animate-out',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors',
      'focus:bg-black/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none',
      'focus:bg-black/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
```

- [ ] **Step 3: 学年切换器 + 全局学年 Context**

`frontend/src/components/layout/academic-year-switcher.tsx`:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { academicYearsApi } from '@/lib/api/academic-years';
import { queryKeys } from '@/lib/query-keys';

type YearId = number | 'all';

interface YearContextValue {
  yearId: YearId;
  setYearId: (id: YearId) => void;
}

const YearContext = createContext<YearContextValue | null>(null);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [yearId, setYearIdState] = useState<YearId>(() => {
    const stored = localStorage.getItem('classrank.yearId');
    if (!stored) return 'all';
    return stored === 'all' ? 'all' : Number(stored);
  });
  const setYearId = (id: YearId) => {
    setYearIdState(id);
    localStorage.setItem('classrank.yearId', String(id));
  };
  const value = useMemo(() => ({ yearId, setYearId }), [yearId]);
  return <YearContext.Provider value={value}>{children}</YearContext.Provider>;
}

export function useCurrentYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error('useCurrentYear must be used inside AcademicYearProvider');
  return ctx;
}

export function AcademicYearSwitcher() {
  const { yearId, setYearId } = useCurrentYear();
  const qc = useQueryClient();
  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears(),
    queryFn: academicYearsApi.list,
  });
  const current = yearId === 'all' ? '全部学年' : years.find((y) => y.id === yearId)?.name ?? '全部学年';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2.5">
          {current}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuLabel>切换学年</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { setYearId('all'); qc.invalidateQueries(); }}>
          全部学年
        </DropdownMenuItem>
        {years.map((y) => (
          <DropdownMenuItem
            key={y.id}
            onClick={() => { setYearId(y.id); qc.invalidateQueries(); }}
          >
            {y.name}{y.is_active ? ' · 当前' : ''}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: 顶部导航 TopNav（毛玻璃 + segmented control）**

`frontend/src/components/layout/top-nav.tsx`:

```tsx
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AcademicYearSwitcher } from './academic-year-switcher';

const TABS = [
  { to: '/', label: '积分统计', end: true },
  { to: '/upload', label: '上传解析' },
  { to: '/students', label: '学生管理' },
  { to: '/settings', label: '系统设置' },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-xl bg-white/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-black" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">考评积分</span>
        </div>
        <nav
          className="flex items-center gap-1 rounded-full bg-black/5 p-1"
          role="tablist"
          aria-label="主导航"
        >
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <AcademicYearSwitcher />
      </div>
    </header>
  );
}
```

- [ ] **Step 5: AppShell**

`frontend/src/components/layout/app-shell.tsx`:

```tsx
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
```

- [ ] **Step 6: 4 个路由页面占位**

`frontend/src/routes/dashboard.tsx`:

```tsx
export default function DashboardPage() {
  return <div className="text-sm text-muted-foreground">积分统计 — 待实现</div>;
}
```

`frontend/src/routes/upload.tsx`:

```tsx
export default function UploadPage() {
  return <div className="text-sm text-muted-foreground">上传解析 — 待实现</div>;
}
```

`frontend/src/routes/students.tsx`:

```tsx
export default function StudentsPage() {
  return <div className="text-sm text-muted-foreground">学生管理 — 待实现</div>;
}
```

`frontend/src/routes/settings/layout.tsx`:

```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SUB = [
  { to: '/settings/api', label: 'API 配置' },
  { to: '/settings/academic-years', label: '学年管理' },
  { to: '/settings/data', label: '数据管理' },
];

export default function SettingsLayout() {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-0.5">
        {SUB.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            className={({ isActive }) =>
              cn(
                'block rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive ? 'bg-black/5 text-foreground font-medium' : 'text-muted-foreground hover:bg-black/5 hover:text-foreground',
              )
            }
          >
            {s.label}
          </NavLink>
        ))}
      </aside>
      <section><Outlet /></section>
    </div>
  );
}
```

`frontend/src/routes/settings/api.tsx`:

```tsx
export default function SettingsApiPage() {
  return <div className="text-sm text-muted-foreground">API 配置 — 待实现</div>;
}
```

`frontend/src/routes/settings/academic-years.tsx`:

```tsx
export default function SettingsAcademicYearsPage() {
  return <div className="text-sm text-muted-foreground">学年管理 — 待实现</div>;
}
```

`frontend/src/routes/settings/data.tsx`:

```tsx
export default function SettingsDataPage() {
  return <div className="text-sm text-muted-foreground">数据管理 — 待实现</div>;
}
```

- [ ] **Step 7: 完整 App.tsx（Provider + Router）**

替换 `frontend/src/App.tsx`：

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { AcademicYearProvider } from '@/components/layout/academic-year-switcher';
import { Toaster } from '@/components/ui/sonner';
import DashboardPage from '@/routes/dashboard';
import UploadPage from '@/routes/upload';
import StudentsPage from '@/routes/students';
import SettingsLayout from '@/routes/settings/layout';
import SettingsApiPage from '@/routes/settings/api';
import SettingsAcademicYearsPage from '@/routes/settings/academic-years';
import SettingsDataPage from '@/routes/settings/data';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AcademicYearProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="api" replace />} />
                <Route path="api" element={<SettingsApiPage />} />
                <Route path="academic-years" element={<SettingsAcademicYearsPage />} />
                <Route path="data" element={<SettingsDataPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AcademicYearProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 8: Django catch-all 兜底（确保 React Router 直接访问 /upload 等不报 404）**

修改 `classrank/urls.py`，把 index 路由改为 catch-all：

```python
"""URL configuration for classrank project."""

from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('legacy/', TemplateView.as_view(template_name='legacy.html'), name='legacy'),
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html'), name='spa'),
]
```

- [ ] **Step 9: 验证导航与刷新行为**

终端 1：`cd frontend && npm run dev`
终端 2：`source venv/bin/activate && python manage.py runserver 8000`
浏览器：
- 访问 `http://127.0.0.1:8000/` → 看到顶栏 + "积分统计 — 待实现"
- 点 4 个 tab → URL 变化 + 内容切换 + active tab 白底有微阴影
- 在 `/students` 直接刷新 → 仍正常显示（Django catch-all 生效）
- `/settings` 自动跳转到 `/settings/api`
- 右上角学年下拉可打开（即使列表为空也能开）

- [ ] **Step 10: Commit**

```bash
cd ..
git add frontend/ classrank/urls.py
git commit -m "feat(frontend): App shell + 顶部 segmented 导航 + 学年切换 + 4 路由占位"
```

---

## Task 6: Dashboard 页面（统计 + 图表 + 排行 + 每日详情）

> 实施前先用 `curl http://127.0.0.1:8000/api/stats/` 抓取真实返回结构；按真实字段名微调 `stats.ts` 中的 TypeScript 接口。后端无需任何修改。

**Files:**
- Create: `frontend/src/components/ui/tabs.tsx`
- Create: `frontend/src/components/ui/toggle-group.tsx`
- Create: `frontend/src/components/ui/skeleton.tsx`
- Create: `frontend/src/components/ui/table.tsx`
- Create: `frontend/src/components/ui/popover.tsx`
- Create: `frontend/src/components/ui/calendar.tsx`
- Create: `frontend/src/components/common/empty-state.tsx`
- Create: `frontend/src/components/dashboard/stat-card.tsx`
- Create: `frontend/src/components/dashboard/date-range-picker.tsx`
- Create: `frontend/src/components/dashboard/trend-chart.tsx`
- Create: `frontend/src/components/dashboard/ranking-table.tsx`
- Create: `frontend/src/components/dashboard/daily-details.tsx`
- Modify: `frontend/src/routes/dashboard.tsx`

- [ ] **Step 1: 补齐 shadcn 基础组件 tabs/toggle-group/skeleton/table/popover/calendar**

`frontend/src/components/ui/tabs.tsx`:

```tsx
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn('inline-flex h-8 items-center justify-center rounded-full bg-black/5 p-1', className)} {...props} />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all',
      'data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.06)] text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('mt-4 focus-visible:outline-none', className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
```

`frontend/src/components/ui/toggle-group.tsx`:

```tsx
import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';

export const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn('inline-flex items-center gap-1 rounded-full bg-black/5 p-1', className)}
    {...props}
  />
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all text-muted-foreground',
      'data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
      className,
    )}
    {...props}
  />
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;
```

`frontend/src/components/ui/skeleton.tsx`:

```tsx
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-black/5', className)} {...props} />;
}
```

`frontend/src/components/ui/table.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />,
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />,
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('border-b transition-colors hover:bg-black/[0.03] data-[state=selected]:bg-black/5', className)} {...props} />
  ),
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn('h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground', className)} {...props} />
  ),
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('p-3 align-middle', className)} {...props} />
  ),
);
TableCell.displayName = 'TableCell';
```

`frontend/src/components/ui/popover.tsx`:

```tsx
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-xl border bg-popover p-4 text-popover-foreground shadow-[0_8px_30px_rgba(0,0,0,0.06)] outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
```

`frontend/src/components/ui/calendar.tsx`:

```tsx
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '@/lib/utils';

export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn('p-2', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        caption_label: 'text-sm font-medium',
        nav_button: 'h-7 w-7 bg-transparent hover:bg-black/5 rounded-md',
        head_cell: 'text-muted-foreground w-9 text-xs font-normal',
        cell: 'h-9 w-9 text-center text-sm relative [&:has([aria-selected])]:bg-black/5',
        day: 'h-9 w-9 rounded-md hover:bg-black/5 aria-selected:bg-primary aria-selected:text-primary-foreground',
        day_today: 'font-semibold',
        ...classNames,
      }}
      {...props}
    />
  );
}
```

- [ ] **Step 2: EmptyState 通用组件**

`frontend/src/components/common/empty-state.tsx`:

```tsx
import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="text-muted-foreground">{icon ?? <Inbox className="h-8 w-8" />}</div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 3: StatCard**

`frontend/src/components/dashboard/stat-card.tsx`:

```tsx
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
```

- [ ] **Step 4: DateRangePicker**

`frontend/src/components/dashboard/date-range-picker.tsx`:

```tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function DateRangePicker({ value, onChange }: {
  value: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value?.from
    ? value.to
      ? `${format(value.from, 'yyyy-MM-dd')} ~ ${format(value.to, 'yyyy-MM-dd')}`
      : format(value.from, 'yyyy-MM-dd')
    : '选择日期范围';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 5: TrendChart（Recharts）**

`frontend/src/components/dashboard/trend-chart.tsx`:

```tsx
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface TrendPoint {
  date: string;
  net: number;
  cumulative?: number;
}

export function TrendChart({ data, mode }: { data: TrendPoint[]; mode: 'daily' | 'cumulative' }) {
  if (mode === 'daily') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <Bar dataKey="net" fill="#000" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }} />
        <Line type="monotone" dataKey="cumulative" stroke="#000" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 6: RankingTable**

`frontend/src/components/dashboard/ranking-table.tsx`:

```tsx
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
```

- [ ] **Step 7: DailyDetails（折叠展开 + 删除整日）**

`frontend/src/components/dashboard/daily-details.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { recordsApi, type RecordItem } from '@/lib/api/records';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';

export function DailyDetails({ dates }: { dates: string[] }) {
  return (
    <div className="divide-y">
      {dates.map((d) => <DailyRow key={d} date={d} />)}
      {dates.length === 0 && (
        <div className="py-6 text-center text-xs text-muted-foreground">暂无记录</div>
      )}
    </div>
  );
}

function DailyRow({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const { yearId } = useCurrentYear();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.dailyDetails(date, yearId),
    queryFn: () => recordsApi.dailyDetails(date, yearId),
    enabled: open,
  });
  const remove = useMutation({
    mutationFn: () => recordsApi.removeByDate(date, yearId),
    onSuccess: () => {
      toast.success('已删除该日全部记录');
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3 px-1 text-left hover:bg-black/[0.03] rounded-md"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <ChevronRight className={cn('h-4 w-4 transition-transform text-muted-foreground', open && 'rotate-90')} />
          {date}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); if (confirm(`确定删除 ${date} 全部记录？`)) remove.mutate(); }}
          aria-label="删除整日"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </button>
      {open && (
        <div className="pl-7 pb-3 space-y-1">
          {isLoading && <div className="text-xs text-muted-foreground">加载中...</div>}
          {items.map((it: RecordItem) => (
            <div key={it.id} className="flex items-center justify-between text-xs">
              <span>{it.student_name} · {it.item}</span>
              <span className={cn('tabular-nums', it.type === 'bonus' ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]')}>
                {it.type === 'bonus' ? '+' : '-'}{it.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Dashboard page 组装**

替换 `frontend/src/routes/dashboard.tsx`：

```tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, startOfWeek, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { StatCard } from '@/components/dashboard/stat-card';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { RankingTable } from '@/components/dashboard/ranking-table';
import { DailyDetails } from '@/components/dashboard/daily-details';
import { statsApi } from '@/lib/api/stats';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';

type Preset = 'today' | 'week' | 'month' | 'all';

function presetRange(p: Preset): DateRange | undefined {
  const today = new Date();
  if (p === 'today') return { from: today, to: today };
  if (p === 'week') return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
  if (p === 'month') return { from: startOfMonth(today), to: today };
  return undefined;
}

export default function DashboardPage() {
  const { yearId } = useCurrentYear();
  const [preset, setPreset] = useState<Preset>('week');
  const [range, setRange] = useState<DateRange | undefined>(() => presetRange('week'));

  const params = useMemo(() => ({
    start: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
    end: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    year_id: yearId,
  }), [range, yearId]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.stats(params),
    queryFn: () => statsApi.get(params),
  });

  const dates = useMemo(() => {
    if (!range?.from) return [] as string[];
    const out: string[] = [];
    const end = range.to ?? range.from;
    const start = range.from;
    for (let d = end; d >= start; d = subDays(d, 1)) {
      out.push(format(d, 'yyyy-MM-dd'));
    }
    return out;
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={preset}
          onValueChange={(v) => {
            if (!v) return;
            setPreset(v as Preset);
            setRange(presetRange(v as Preset));
          }}
        >
          <ToggleGroupItem value="today">今日</ToggleGroupItem>
          <ToggleGroupItem value="week">本周</ToggleGroupItem>
          <ToggleGroupItem value="month">本月</ToggleGroupItem>
          <ToggleGroupItem value="all">全部</ToggleGroupItem>
        </ToggleGroup>
        <DateRangePicker value={range} onChange={(r) => { setRange(r); setPreset('all'); }} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[78px]" />)
        ) : (
          <>
            <StatCard label="净分" value={data.totals.net} tone={data.totals.net >= 0 ? 'positive' : 'negative'} />
            <StatCard label="加分" value={data.totals.bonus} tone="positive" />
            <StatCard label="扣分" value={data.totals.penalty} tone="negative" />
            <StatCard label="参与人数" value={data.participating_students} />
            <StatCard label="重点关注" value={data.focused_students} />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">每日净分</TabsTrigger>
              <TabsTrigger value="cumulative">累计</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              {data ? <TrendChart data={data.daily} mode="daily" /> : <Skeleton className="h-[320px]" />}
            </TabsContent>
            <TabsContent value="cumulative">
              {data ? <TrendChart data={data.daily} mode="cumulative" /> : <Skeleton className="h-[320px]" />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>学生排行</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {data ? <RankingTable rows={data.ranking} /> : <Skeleton className="h-40" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>每日详情</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <DailyDetails dates={dates} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: 浏览器验证**

启动 Vite + Django，浏览器访问 `/`：
- 看到 toggle group / date picker / 5 张 stat card / 趋势卡 / 排行 + 每日详情
- 切换 preset → 数据刷新；切换学年 → 数据刷新
- 每日详情点击展开能拉到当日详细记录
- Console 无错误

- [ ] **Step 10: Commit**

```bash
cd .. && git add frontend/ && git commit -m "feat(frontend): 实现积分统计页（stat/趋势图/排行/每日详情）"
```

---

## Task 7: 上传解析页（拖拽上传 + OCR + 行内编辑 + 保存）

**Files:**
- Create: `frontend/src/components/ui/select.tsx`
- Create: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/textarea.tsx`
- Create: `frontend/src/components/upload/dropzone.tsx`
- Create: `frontend/src/components/upload/result-table.tsx`
- Create: `frontend/src/components/upload/manual-json-dialog.tsx`
- Modify: `frontend/src/routes/upload.tsx`

- [ ] **Step 1: shadcn select / dialog / textarea**

`frontend/src/components/ui/select.tsx`:

```tsx
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-ring',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 opacity-50" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 max-h-[20rem] min-w-[8rem] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-[0_8px_30px_rgba(0,0,0,0.06)]',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none',
      'focus:bg-black/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
```

`frontend/src/components/ui/dialog.tsx`:

```tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out', className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-background p-6 shadow-[0_8px_40px_rgba(0,0,0,0.12)]',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-black/5">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
);
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-base font-semibold tracking-tight', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);
```

`frontend/src/components/ui/textarea.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
```

- [ ] **Step 2: Dropzone**

`frontend/src/components/upload/dropzone.tsx`:

```tsx
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dropzone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onPaste={(e) => {
        const f = e.clipboardData.files?.[0];
        if (f) onFile(f);
      }}
      tabIndex={0}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-12 text-center transition-colors',
        dragOver ? 'border-foreground bg-black/[0.03]' : 'border-border hover:bg-black/[0.02]',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <div className="text-sm font-medium">点击 / 拖拽 / 粘贴上传考评图片</div>
      <div className="text-xs text-muted-foreground">支持 PNG · JPG · 最大 10MB</div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: ResultTable（行内编辑）**

`frontend/src/components/upload/result-table.tsx`:

```tsx
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
                onChange={(e) => update(r.id, { score: Number(e.target.value) || 0 })}
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
      <datalist id="known-students">
        {knownStudents.map((n) => <option key={n} value={n} />)}
      </datalist>
    </Table>
  );
}
```

- [ ] **Step 4: ManualJsonDialog**

`frontend/src/components/upload/manual-json-dialog.tsx`:

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function ManualJsonDialog({ onLoad }: { onLoad: (parsed: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">粘贴 JSON</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>粘贴 OCR JSON</DialogTitle>
          <DialogDescription>用于跳过图片解析直接载入结构化数据。</DialogDescription>
        </DialogHeader>
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "date": "2026-05-16", "students": [...] }' />
        <DialogFooter>
          <Button
            onClick={() => {
              try {
                const parsed = JSON.parse(text);
                onLoad(parsed);
                setOpen(false);
                setText('');
              } catch {
                toast.error('JSON 格式不合法');
              }
            }}
          >
            载入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Upload page 整体**

替换 `frontend/src/routes/upload.tsx`：

```tsx
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dropzone } from '@/components/upload/dropzone';
import { ResultTable, type ResultRow } from '@/components/upload/result-table';
import { ManualJsonDialog } from '@/components/upload/manual-json-dialog';
import { ocrApi, type ParsedResult } from '@/lib/api/ocr';
import { studentsApi } from '@/lib/api/students';
import { recordsApi } from '@/lib/api/records';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';

function flatten(parsed: ParsedResult): ResultRow[] {
  const out: ResultRow[] = [];
  let i = 0;
  for (const s of parsed.students ?? []) {
    for (const b of s.bonus_items ?? []) out.push({ id: `r${i++}`, studentName: s.name, type: 'bonus', item: b.item, score: b.score });
    for (const p of s.penalty_items ?? []) out.push({ id: `r${i++}`, studentName: s.name, type: 'penalty', item: p.item, score: p.score });
  }
  return out;
}

function toSavePayload(date: string, rows: ResultRow[], yearId: number | 'all') {
  const map = new Map<string, { name: string; bonus_items: { item: string; score: number }[]; penalty_items: { item: string; score: number }[] }>();
  for (const r of rows) {
    if (!r.studentName.trim() || !r.item.trim() || !r.score) continue;
    const e = map.get(r.studentName) ?? { name: r.studentName, bonus_items: [], penalty_items: [] };
    (r.type === 'bonus' ? e.bonus_items : e.penalty_items).push({ item: r.item, score: r.score });
    map.set(r.studentName, e);
  }
  return { date, academic_year_id: yearId, students: Array.from(map.values()) };
}

export default function UploadPage() {
  const { yearId } = useCurrentYear();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<ResultRow[]>([]);

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.students(yearId),
    queryFn: () => studentsApi.list(yearId),
  });
  const knownNames = useMemo(() => students.map((s) => s.name), [students]);

  const parse = useMutation({
    mutationFn: (f: File) => ocrApi.parse(f),
    onSuccess: (data) => {
      if (data.date) setDate(data.date);
      setRows(flatten(data));
      toast.success('解析完成');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => recordsApi.save(toSavePayload(date, rows, yearId)),
    onSuccess: () => {
      toast.success('已保存');
      setRows([]);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader><CardTitle>上传</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Dropzone onFile={(f) => parse.mutate(f)} disabled={parse.isPending} />
          {parse.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 正在调用视觉模型解析，可能需要 30-180 秒...
            </div>
          )}
          <ManualJsonDialog onLoad={(p) => setRows(flatten(p as ParsedResult))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>解析结果</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" className="w-[150px]" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => setRows((r) => [...r, { id: `r${Date.now()}`, studentName: '', type: 'bonus', item: '', score: 1 }])}>
              <Plus className="h-3.5 w-3.5" /> 新增行
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || rows.length === 0}>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 保存
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">上传图片 / 粘贴 JSON / 新增行后开始编辑</div>
          ) : (
            <ResultTable rows={rows} onChange={setRows} knownStudents={knownNames} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: 验证**

启动后访问 `/upload`：
- 拖拽一张图（如无 API Key，应看到 toast 错误，但 UI 不卡）
- "粘贴 JSON"对话框输入合法 JSON 能填表
- 新增行 / 编辑 / 删除行正常
- 保存后 toast 成功 + 表格清空 + 切到 Dashboard 看到数据已落库

- [ ] **Step 7: Commit**

```bash
cd .. && git add frontend/ && git commit -m "feat(frontend): 实现上传解析页（Dropzone / 行内编辑 / 手动 JSON / 保存）"
```

---

## Task 8: 学生管理页（搜索 + 重点开关 + 详情抽屉 + 增删改）

**Files:**
- Create: `frontend/src/components/ui/switch.tsx`
- Create: `frontend/src/components/ui/sheet.tsx`
- Create: `frontend/src/components/ui/alert-dialog.tsx`
- Create: `frontend/src/components/students/student-form-dialog.tsx`
- Create: `frontend/src/components/students/student-detail-sheet.tsx`
- Modify: `frontend/src/routes/students.tsx`

- [ ] **Step 1: shadcn switch / sheet / alert-dialog**

`frontend/src/components/ui/switch.tsx`:

```tsx
import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-black/15',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;
```

`frontend/src/components/ui/sheet.tsx`:

```tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/40 backdrop-blur-sm', className)}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-full flex-col gap-4 border-l bg-background p-6 shadow-[0_8px_40px_rgba(0,0,0,0.12)]',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-black/5">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1', className)} {...props} />
);
export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-base font-semibold tracking-tight', className)} {...props} />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;
```

`frontend/src/components/ui/alert-dialog.tsx`:

```tsx
import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-black/40 backdrop-blur-sm', className)} {...props} />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

export const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-background p-6 shadow-[0_8px_40px_rgba(0,0,0,0.12)]',
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

export const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1', className)} {...props} />
);
export const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);
export const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn('text-base font-semibold tracking-tight', className)} {...props} />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
export const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;
export const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants({ variant: 'destructive' }), className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;
export const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)} {...props} />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;
```

- [ ] **Step 2: StudentFormDialog（新增/编辑共用）**

`frontend/src/components/students/student-form-dialog.tsx`:

```tsx
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
```

- [ ] **Step 3: StudentDetailSheet（含历史折线）**

`frontend/src/components/students/student-detail-sheet.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { studentsApi, type Student } from '@/lib/api/students';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentYear } from '@/components/layout/academic-year-switcher';

interface HistoryResponse {
  daily?: Array<{ date: string; net: number }>;
  records?: Array<{ id: number; date: string; type: 'bonus' | 'penalty'; item: string; score: number }>;
}

export function StudentDetailSheet({
  open, onOpenChange, student,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Student | null;
}) {
  const { yearId } = useCurrentYear();
  const { data } = useQuery({
    queryKey: queryKeys.studentHistory(student?.id ?? 0, yearId),
    queryFn: () => studentsApi.history(student!.id, yearId) as Promise<HistoryResponse>,
    enabled: !!student && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{student?.name}</SheetTitle>
          <div className="text-xs text-muted-foreground">总分 {student?.total_score ?? 0}</div>
        </SheetHeader>
        <div className="space-y-4 overflow-auto">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data?.daily ?? []}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6E6E73' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }} />
              <Line type="monotone" dataKey="net" stroke="#000" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="divide-y border-t">
            {(data?.records ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 text-xs">
                <span className="text-muted-foreground">{r.date} · {r.item}</span>
                <span className={r.type === 'bonus' ? 'text-[hsl(var(--success))] tabular-nums' : 'text-[hsl(var(--destructive))] tabular-nums'}>
                  {r.type === 'bonus' ? '+' : '-'}{r.score}
                </span>
              </div>
            ))}
            {(data?.records?.length ?? 0) === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">暂无记录</div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

> **执行说明**：`HistoryResponse` 字段名要按 `core/views.py:get_student_history` 真实返回结构调整。

- [ ] **Step 4: Students 页面**

替换 `frontend/src/routes/students.tsx`：

```tsx
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
            <AlertDialogAction onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 5: 验证**

`/students`：
- 列表展示，搜索筛选
- 重点关注 Switch 即时切换
- 添加/编辑学生 Dialog 工作
- 详情 Sheet 展开看到历史折线 + 记录列表
- 删除走确认弹窗

- [ ] **Step 6: Commit**

```bash
cd .. && git add frontend/ && git commit -m "feat(frontend): 实现学生管理页（增删改 / 重点切换 / 详情抽屉）"
```

---

## Task 9: 设置 — API 配置子页

**Files:**
- Create: `frontend/src/components/common/loading-button.tsx`
- Modify: `frontend/src/routes/settings/api.tsx`

- [ ] **Step 1: LoadingButton 通用组件**

`frontend/src/components/common/loading-button.tsx`:

```tsx
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

export function LoadingButton({ loading, children, disabled, ...props }: ButtonProps & { loading?: boolean }) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </Button>
  );
}
```

- [ ] **Step 2: API 配置子页**

替换 `frontend/src/routes/settings/api.tsx`：

```tsx
import { useEffect } from 'react';
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

const schema = z.object({
  api_key: z.string().min(10, 'API Key 至少 10 个字符'),
  model: z.string().min(1, '请填写模型名'),
});
type FormValues = z.infer<typeof schema>;

export default function SettingsApiPage() {
  const [keyQ, modelQ] = useQueries({
    queries: [
      { queryKey: queryKeys.config('siliconflow_api_key'), queryFn: () => configApi.get('siliconflow_api_key') },
      { queryKey: queryKeys.config('siliconflow_model'), queryFn: () => configApi.get('siliconflow_model') },
    ],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { api_key: '', model: 'Qwen/Qwen2.5-VL-32B-Instruct' },
  });
  useEffect(() => {
    if (keyQ.data) form.setValue('api_key', keyQ.data.value);
    if (modelQ.data) form.setValue('model', modelQ.data.value);
  }, [keyQ.data, modelQ.data, form]);

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      await configApi.set('siliconflow_api_key', v.api_key);
      await configApi.set('siliconflow_model', v.model);
    },
    onSuccess: () => toast.success('已保存配置'),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>SiliconFlow API 配置</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4 max-w-md">
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
```

- [ ] **Step 3: 验证 + Commit**

访问 `/settings/api`：表单加载现有值，修改后保存 toast 成功。

```bash
cd .. && git add frontend/ && git commit -m "feat(frontend): 实现设置-API 配置子页（react-hook-form + zod）"
```

---

## Task 10: 设置 — 学年管理子页

**Files:**
- Modify: `frontend/src/routes/settings/academic-years.tsx`

- [ ] **Step 1: 学年管理子页（列表 / 新增 / 激活 / 删除）**

替换 `frontend/src/routes/settings/academic-years.tsx`：

```tsx
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
```

- [ ] **Step 2: 验证 + Commit**

`/settings/academic-years`：能添加、设为当前、删除。顶栏学年下拉同步更新（同一 query key）。

```bash
cd .. && git add frontend/ && git commit -m "feat(frontend): 实现设置-学年管理子页"
```

---

## Task 11: 设置 — 数据管理子页（导入 / 导出 / 清空）

**Files:**
- Modify: `frontend/src/routes/settings/data.tsx`

- [ ] **Step 1: 数据管理子页**

替换 `frontend/src/routes/settings/data.tsx`：

```tsx
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importMut.isPending}>
            {importMut.isPending ? '导入中...' : '选择 JSON 文件'}
          </Button>
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
            <AlertDialogAction disabled={confirmText !== 'DELETE' || clear.isPending} onClick={() => clear.mutate()}>
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: 验证 + Commit**

`/settings/data`：导出能下载、导入能 upsert、清空必须输 DELETE 才能点确认。

```bash
cd .. && git add frontend/ && git commit -m "feat(frontend): 实现设置-数据管理子页（导入/导出/清空）"
```

---

## Task 12: 构建与部署集成（start.sh + Dockerfile）

**Files:**
- Modify: `start.sh`
- Modify: `Dockerfile`

- [ ] **Step 1: 修改 start.sh，添加前端依赖与构建**

替换 `start.sh`（在 `python manage.py runserver` 之前增加，仅当存在 `frontend/` 时）：

```bash
#!/bin/bash

# 学生考评积分管理系统启动脚本

echo "🚀 启动学生考评积分管理系统..."

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python3，请先安装 Python3"
    exit 1
fi

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "📦 创建 Python 虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate

echo "📥 安装 Python 依赖..."
pip install -r requirements.txt

# 配置文件
if [ ! -f ".env" ]; then
    echo "📝 创建配置文件..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，填写你的 SiliconFlow API Key"
fi

# 前端构建（DEBUG=False 时需要）
if [ -d "frontend" ]; then
    if ! command -v npm &> /dev/null; then
        echo "❌ 未找到 npm，请先安装 Node.js (≥18)"
        exit 1
    fi
    echo "📥 安装前端依赖..."
    (cd frontend && npm ci)
    echo "🏗️  构建前端产物..."
    (cd frontend && npm run build)
fi

# 数据库
echo "🗄️  初始化数据库..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# 收集静态文件
echo "📁 收集静态文件..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo ""
echo "✅ 启动完成！"
echo ""
echo "📍 访问地址: http://127.0.0.1:8000"
echo "⚙️  请在系统设置中配置 SiliconFlow API Key"
echo ""

python manage.py runserver
```

- [ ] **Step 2: 多阶段 Dockerfile**

替换 `Dockerfile`：

```dockerfile
# ---------- frontend build ----------
FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build && ls dist || true
# 注意：vite.config.ts 设置 outDir 为 ../static/app，所以会输出到 /build 同级
# Dockerfile 中没有同级目录，因此我们用 --base=/static/app/ 重新指定 outDir
# 这里改成显式输出到 /out/static/app
RUN mkdir -p /out/static/app && \
    npx vite build --outDir /out/static/app --emptyOutDir --manifest manifest.json

# ---------- python runtime ----------
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com gunicorn -r requirements.txt

COPY . .
COPY --from=frontend /out/static/app /app/static/app

RUN python manage.py collectstatic --noinput

EXPOSE 8000
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
```

- [ ] **Step 3: 本地验证生产构建**

```bash
cd frontend && npm run build && cd ..
ls static/app/manifest.json   # 应存在
DEBUG=False python manage.py collectstatic --noinput
DEBUG=False python manage.py runserver 8000
curl -s http://127.0.0.1:8000/ | grep -E 'src=".+main.+\.js"|rel="stylesheet"'
```
Expected：能看到注入的 hash 化 JS 与 CSS 标签。浏览器访问 `http://127.0.0.1:8000/` 应展示完整应用。

- [ ] **Step 4: Commit**

```bash
git add start.sh Dockerfile
git commit -m "build: start.sh 集成前端构建 + Dockerfile 多阶段产出 Vite 产物"
```

---

## Task 13: 端到端冒烟验收

> 本任务不写代码。逐项手动核对，发现问题回到对应 Task 修复。

- [ ] **Step 1: 启动开发栈**

```bash
source venv/bin/activate && python manage.py runserver 8000
# 新终端
cd frontend && npm run dev
```

- [ ] **Step 2: 逐项核对（在浏览器执行）**

- 顶栏：毛玻璃 + segmented control + 学年下拉
- `/`：5 张 stat + 趋势图（切换每日/累计）+ 排行 + 每日详情可展开
- `/upload`：拖拽上传 → toast 解析中 → 编辑 → 保存 → toast 成功 → Dashboard 同步
- `/students`：搜索 / Switch 重点 / Sheet 详情含历史折线 / 添加 / 编辑 / 删除二次确认
- `/settings/api`：读取已有 key 显示在表单 / 保存 toast 成功
- `/settings/academic-years`：新增 / 激活 / 删除，顶栏下拉同步
- `/settings/data`：导出下载 / 导入 upsert / 清空需输 DELETE
- `/legacy/`：仍能打开旧版 UI
- 直接刷新 `/students` 不报 404（Django catch-all 生效）

- [ ] **Step 3: 生产模式快速验证**

```bash
cd frontend && npm run build && cd ..
DEBUG=False python manage.py collectstatic --noinput
DEBUG=False python manage.py runserver 8000
```
浏览器访问 `http://127.0.0.1:8000/`，确认 manifest 注入生效、所有页面正常。

- [ ] **Step 4: 后端零修改自检**

```bash
git diff main --stat -- core/ classrank/settings.py
```
Expected：除 `classrank/urls.py`（新增 legacy/catch-all）外无其它后端业务文件修改。`core/views.py`、`core/models.py`、`core/services/`、`core/urls.py`、`migrations/` 无任何变更。

- [ ] **Step 5: 收尾 commit**

如有最终修复，统一提交：

```bash
git status
# 按需 git add / commit -m "fix(frontend): ..."
```

---

## 自检（writing-plans 内置）

**1. Spec 覆盖**
| Spec 章节 | 实现 Task |
|---|---|
| §3 技术栈 | Task 1 |
| §4 目录结构 | Task 1-11（各自创建） |
| §5 视觉系统 | Task 2 + Task 5 |
| §6.1 dashboard | Task 6 |
| §6.2 upload | Task 7 |
| §6.3 students | Task 8 |
| §6.4 settings | Task 9-11 |
| §6.5 全局元素（toast/loading/empty） | Task 5（Toaster）+ Task 6（Skeleton/EmptyState）+ Task 9（LoadingButton） |
| §7 API 客户端 | Task 4 |
| §8 Vite/Django 集成 | Task 3（template tag）+ Task 12（构建脚本/Docker） |
| §9 迁移与回滚 | Task 3（legacy.html + 路由） |
| §10 风险点 1（CSRF） | Task 3 Step 4（{% csrf_token %}）+ Task 4 Step 4（fetch 头注入） |
| §10 风险点 2（manifest） | Task 3 Step 3 |
| §10 风险点 3（Docker 镜像） | Task 12 多阶段 |
| §10 风险点 4（OCR 长耗时） | Task 7 Step 5（Loader2 提示 30-180s） |
| §10 风险点 5（csrftoken 首次） | Task 3 Step 4 显式输出 `{% csrf_token %}` |
| §11 受影响文件 | 全计划覆盖 |
| §12 验收标准 | Task 13 |

**2. 占位符扫描**：无 TBD/TODO/"按需补充"。Task 4 Step 7 与 Task 8 Step 3 明确标注了执行时需要 `grep core/views.py` 对齐字段名的步骤——这是执行指引，非占位符。

**3. 类型一致性**：`Student.total_score`、`AcademicYear.is_active`、`ScoreType = 'bonus' | 'penalty'` 在 client/page/dialog/table 间命名统一。`yearId: number | 'all'` 在 context、API 模块、query keys 中一致。

**4. 实现选择**：UI 部分不用 TDD（行为靠手动验证）；唯一含逻辑的部分 —— `csrf.ts` 与 `request<T>` —— 严格 TDD，先写 vitest 失败测试再实现（Task 4 Step 1-5）。
