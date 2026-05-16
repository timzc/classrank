# 前端 UI 重设计 —— shadcn + Tailwind + React（Apple 风格）

- 日期：2026-05-16
- 范围：仅前端（`templates/index.html` 替换为 Vite + React 应用）
- 不变：Django 后端、所有 `/api/` 路由、models、migrations、OCR service、数据库

## 1. 目标

将现有 2372 行单文件 HTML/CSS/JS + ECharts 前端，替换为基于 **React 18 + TypeScript + Vite + Tailwind v3 + shadcn/ui + Recharts** 的现代前端，主题为白底黑强调，UI/UX 参考 Apple 设计语言（毛玻璃顶栏、segmented control、hairline 分层、克制阴影、SF Pro 字体栈）。

保留全部现有功能：积分统计、上传解析、学生管理、系统设置（API 配置 / 学年管理 / 数据管理）。

## 2. 非目标（YAGNI）

- 国际化（仅中文）
- 暗色模式（保留 CSS variable 钩子但不出 toggle）
- 用户认证 / 多租户
- PWA / 离线缓存
- 后端任何修改（路由、views、models、OCR service、settings.py 中业务相关项）

## 3. 技术栈

| 关注点 | 选型 | 备注 |
|---|---|---|
| 框架 | React 18 + TypeScript | |
| 构建 | Vite | dev server + 生产构建 |
| 样式 | Tailwind CSS v3 | |
| 组件库 | shadcn/ui | 按需 copy 进仓库，不作为依赖 |
| 路由 | React Router v6 | 4 个顶层路由 |
| 数据层 | TanStack Query v5 | 服务器状态缓存 + mutation invalidation |
| 表单 | react-hook-form + zod | |
| 图表 | Recharts（shadcn Chart 包装） | 替换 ECharts |
| 通知 | sonner | shadcn 默认 toast |
| 日期 | date-fns | |
| 图标 | lucide-react | |
| HTTP | 原生 fetch 封装 | 自动注入 X-CSRFToken |

## 4. 目录结构

```
classrank/
├── frontend/                       # 新增
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                 # Router + QueryClientProvider + Toaster
│   │   ├── routes/
│   │   │   ├── dashboard.tsx       # /
│   │   │   ├── upload.tsx          # /upload
│   │   │   ├── students.tsx        # /students
│   │   │   └── settings/
│   │   │       ├── index.tsx       # /settings 子路由 layout
│   │   │       ├── api.tsx         # /settings/api
│   │   │       ├── academic-years.tsx
│   │   │       └── data.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── app-shell.tsx   # 顶栏 + outlet
│   │   │   │   ├── top-nav.tsx     # 毛玻璃导航
│   │   │   │   └── academic-year-switcher.tsx
│   │   │   ├── dashboard/
│   │   │   ├── upload/
│   │   │   ├── students/
│   │   │   ├── settings/
│   │   │   └── ui/                 # shadcn 组件（button, card, dialog, ...）
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── client.ts       # request<T>() + ApiError
│   │   │   │   ├── endpoints.ts    # 与 core/urls.py 对齐
│   │   │   │   ├── students.ts
│   │   │   │   ├── records.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── academic-years.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── data.ts
│   │   │   │   └── ocr.ts
│   │   │   ├── csrf.ts             # 从 cookie 取 csrftoken
│   │   │   ├── query-keys.ts       # TanStack Query keys 统一
│   │   │   └── utils.ts            # cn() 等
│   │   ├── hooks/
│   │   └── styles/
│   │       └── globals.css         # tailwind + 主题变量
│   ├── index.html                  # Vite 入口（仅生产构建时使用）
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── components.json             # shadcn 配置
│   └── package.json
├── core/
│   └── templatetags/
│       ├── __init__.py
│       └── vite.py                 # {% vite_asset %} 模板标签
├── templates/
│   ├── index.html                  # 改造为 Vite manifest 加载壳
│   └── legacy.html                 # 旧版备份（迁移期保留）
├── static/
│   └── app/                        # Vite 构建产物（gitignore）
└── ...（其他 Django 文件不变）
```

## 5. 视觉系统

### 5.1 主题色（CSS variable，注入到 shadcn）

| Token | 值 | 用途 |
|---|---|---|
| `--background` | `#FFFFFF` | 主背景 |
| `--surface` | `#F5F5F7` | 分组/卡片底色（Apple 灰） |
| `--foreground` | `#1D1D1F` | 主文本（非纯黑） |
| `--muted-foreground` | `#6E6E73` | 次文本 |
| `--border` | `rgba(0,0,0,0.08)` | 1px hairline |
| `--primary` | `#000000` | 按钮 / active 强调 |
| `--primary-foreground` | `#FFFFFF` | 强调上的文本 |
| `--success` | `#34C759` | 加分等正向状态 |
| `--destructive` | `#FF3B30` | 扣分 / 删除 |

### 5.2 字体

```
-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC",
"Helvetica Neue", Inter, sans-serif
```
标题：`tracking-tight font-semibold`。

### 5.3 尺寸 / 圆角 / 阴影 / 动效

- 间距节奏：4 / 8 / 12 / 16 / 24 / 32
- 圆角：`--radius: 10px`；卡片 12，按钮 8，pill 999
- 阴影：默认无阴影靠 hairline 分层；浮层 `shadow-[0_8px_30px_rgba(0,0,0,0.06)]`
- 动效：默认 150ms ease-out；hover `bg-black/5`；按钮按下 `active:scale-[0.98]`

### 5.4 顶部导航

- 高 56px，sticky，`backdrop-blur-xl bg-white/70 border-b`
- 左：黑色方块 logo + "考评积分"
- 中：4 个 tab 的 segmented control（容器 `bg-black/5`、激活态白底 + 极浅阴影 + 黑字）
- 右：当前学年下拉切换

## 6. 页面与组件映射

### 6.1 `/` 积分统计

- 顶部：日期范围预设 `ToggleGroup`（今日/周/月/学期）+ `DateRangePicker`（shadcn Calendar + Popover）
- 5 张 stat `Card`：总分、加分、扣分、参与人数、重点关注人数
- 趋势图：`<ChartContainer>` 包装 Recharts `BarChart` / `LineChart`，主色 `#000`，用 `Tabs` 切换视图
- 学生排行榜 `Table` + 今日详情 `Collapsible`（点击行打开编辑 `Dialog`）

### 6.2 `/upload` 上传解析

- 上传区：自写 `Dropzone` 包 `<input type=file>`，支持拖拽 / 粘贴
- 解析中：inline `Skeleton` + `Progress`（OCR 较慢，需明确提示）
- 结果：`Table` 行内编辑，类型 `Select`、学生 `Combobox`（已有学生自动补全），可新增/删除行，[保存] 调 `POST /api/records/save/`
- 备用入口：手动 JSON 文本（`Dialog` + `Textarea`，调用同一保存路径）

### 6.3 `/students` 学生管理

- `Input` 前端搜索 + `Button` 新建
- `Table`：姓名 / 总分 / 重点关注（`Switch` 即时 PATCH）/ 操作
- 详情按钮打开右侧 `Sheet`：基本信息 + 历史折线（Recharts）+ 历史记录列表
- 删除使用 `AlertDialog` 二次确认

### 6.4 `/settings` 系统设置

子路由 layout（左侧 sub-nav + 右侧 outlet）：

- `/settings/api`：API Key + 模型选择（react-hook-form + zod），调 `/api/config/<key>/set/`
- `/settings/academic-years`：列表 / 新增 / 激活 / 删除
- `/settings/data`：导出 JSON（下载）、导入 JSON（文件选择 + 确认）、清空数据（双重 `AlertDialog`）

### 6.5 全局元素

- `sonner` Toaster：替代当前的 alert / inline 消息
- 加载：按钮内置 `Loader2` + disabled；列表区 `Skeleton`
- 空状态：统一 `EmptyState` 组件（灰色图标 + 一句话 + 主按钮）

## 7. API 客户端

### 7.1 `lib/api/client.ts`

```ts
export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('X-CSRFToken', getCsrfToken());
  }
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, body, body?.error ?? res.statusText);
  return body as T;
}
```

### 7.2 端点常量（与 `core/urls.py` 对齐）

`api/endpoints.ts` 中维护，确保新增/重命名后端时只改一处。所有路径以 `/api/` 起始。

### 7.3 数据获取

- TanStack Query：query key 形如 `['students']`、`['records', { from, to }]`
- mutation 成功后 `queryClient.invalidateQueries({ queryKey: [...] })`
- 全局 `QueryClient` 在 `App.tsx` 注入，默认 `staleTime: 30_000`

## 8. Vite + Django 集成

### 8.1 `vite.config.ts`

```ts
export default defineConfig({
  plugins: [react()],
  base: '/static/app/',
  build: {
    outDir: '../static/app',
    emptyOutDir: true,
    manifest: 'manifest.json',
    rollupOptions: { input: 'index.html' },
  },
  server: { port: 5173, proxy: { '/api': 'http://localhost:8000' } },
});
```

### 8.2 `core/templatetags/vite.py`

提供 `{% vite_asset %}` 标签：
- `DEBUG=True`：输出 `<script type=module src="http://localhost:5173/@vite/client"></script>` + 入口 `src/main.tsx` 链接
- `DEBUG=False`：读 `static/app/manifest.json`，输出对应 hash 化的 JS + CSS 标签

### 8.3 `templates/index.html`

仅作薄壳：

```html
{% load static vite %}
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>学生考评积分管理系统</title>
    {% vite_asset "src/main.tsx" %}
  </head>
  <body><div id="root"></div></body>
</html>
```

### 8.4 开发流程

```bash
python manage.py runserver       # :8000
cd frontend && npm run dev       # :5173 (HMR)
# 浏览器访问 http://localhost:8000/
```

### 8.5 部署

- `start.sh`：在 `collectstatic` 之前增加 `cd frontend && npm ci && npm run build`
- Dockerfile 多阶段：node 阶段产出 `static/app/`，python 阶段 COPY
- `docker-entrypoint.sh`：仅运行 `collectstatic` + `migrate`（构建产物已烘焙进镜像）

### 8.6 配置 / gitignore

- `.gitignore` 新增：`frontend/node_modules/`、`static/app/`
- `requirements.txt`：不变
- `frontend/package.json`：新增

## 9. 迁移与回滚

- 现有 `templates/index.html` 复制为 `templates/legacy.html`，`classrank/urls.py` 新增 `/legacy/` 路由指向它。新版稳定后删除。
- 后端零修改：API、views、models、migrations、OCR service、settings.py 业务项不动。
- 如新版严重故障，将 `urls.py` 中根路由暂时改回 `legacy.html` 即可回退。

## 10. 风险点

1. **CSRF**：fetch 必须携带 `X-CSRFToken`（cookie 中 `csrftoken`），所有 mutation 已在 `request<T>` 中处理。
2. **manifest 解析**：生产环境必须经 `manifest.json` 拿带 hash 的资源 URL，否则缓存失效。
3. **Docker 镜像变大**：新增 node 构建阶段，最终镜像只保留 `static/app/` 产物即可。
4. **OCR 长耗时**：保持 `SILICONFLOW_TIMEOUT=180`；前端在解析期间展示明确进度反馈避免误操作。
5. **csrftoken 首次为空**：用户首次访问尚未拿到 cookie；通过 Django 默认的 `ensure_csrf_cookie` 装饰器或在 base template 渲染时由 Django 注入，可在 `templates/index.html` 中通过 `{% csrf_token %}` 隐藏标签确保 cookie 下发。

## 11. 受影响文件清单

新增：
- `frontend/**`（全部）
- `core/templatetags/__init__.py`
- `core/templatetags/vite.py`
- `templates/legacy.html`（拷贝自原 index.html）

修改：
- `templates/index.html`（改为 Vite 加载壳）
- `classrank/urls.py`（新增 `/legacy/` 路由）
- `.gitignore`（新增 frontend/node_modules、static/app）
- `start.sh`（npm ci + build）
- `Dockerfile`（多阶段）
- `docker-entrypoint.sh`（确认仍正确）

不动：
- `core/views.py`、`core/models.py`、`core/services/**`、`core/urls.py`
- 所有 `migrations/`
- `requirements.txt`
- `classrank/settings.py`（业务相关项，可能仅需确认 CSRF/CORS 仍兼容）

## 12. 验收标准

- 4 个页面所有现有功能可用，与旧版表现一致
- 顶部导航毛玻璃 + segmented control 与设计一致
- 主题白底黑强调，所有按钮 / 表单 / 表格风格统一
- `npm run build` 后 Django 生产模式可直接访问 `/` 看到新版
- `/legacy/` 仍可访问旧版
- 后端无任何 API / model / migration 变更
