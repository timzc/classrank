# 学生考评积分管理系统

本地 Web 应用，用于管理学生日常考评积分。OCR 自动解析考评图片，按学年/重点学生维度可视化追踪。

## 功能特性

- 📷 **OCR 图片解析** — 上传图片，SiliconFlow Qwen VL 自动识别加减分项
- 📊 **学生分数图表** — 按时间窗口（今日/本周/本月/全部/自定义）展示每个学生的总分；重点学生橙色高亮 + 呼吸动画
- 📈 **趋势追踪** — 重点学生逐日累计积分多线折线图，看清增减节奏
- 🏆 **统计卡** — 所选窗口内的最高分（含同学名）/ 最低分 / 平均分 / 参与人数 / 重点关注
- ⭐ **重点关注** — 标记重点学生，全局染色
- 🗓 **学年隔离** — 多学年独立统计，顶栏下拉切换
- ✏️ **手动编辑** — OCR 结果行内可改，也支持直接粘贴 JSON 跳过 OCR
- 💾 **导入/导出/清空** — JSON 备份与还原
- 🧱 **本地优先** — SQLite 单文件数据库

## 快速开始

### 方式 A：Docker Compose（推荐）

```bash
docker compose up -d --build
```

访问 **http://localhost:8000**。数据持久化在 `db_data` 卷里。

### 方式 B：本地 `start.sh`

依赖：Python 3.8+、Node.js 18+、npm

```bash
chmod +x start.sh
./start.sh
```

`start.sh` 会创建 venv、装 Python/前端依赖、`npm run build`（缓存 `node_modules`，下次会跳过 `npm ci`）、跑 migrate + collectstatic、起 `runserver` 在 :8000。

开发模式只跑后端，让 Vite dev server 单独热更新前端：

```bash
SKIP_FRONTEND_BUILD=1 ./start.sh    # 后端 :8000
(cd frontend && npm run dev)         # 前端 :5173，自动代理 /api → :8000
```

### 方式 C：手动

```bash
python -m venv venv
source venv/bin/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd frontend && npm ci && npm run build && cd ..
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py runserver
```

### 配置 API Key

1. 访问 http://localhost:8000
2. 顶栏「系统设置 → API 配置」
3. 填写 SiliconFlow API Key 并保存

**获取 API Key**：<https://cloud.siliconflow.cn>

## 支持的 OCR 模型

在「系统设置 → API 配置」处自定义模型名：

| 模型名称 | 说明 |
|---------|------|
| `Qwen/Qwen2.5-VL-32B-Instruct` | 推荐 |
| `Qwen/Qwen2-VL-72B-Instruct` | 更强大 |
| `Qwen/Qwen2-VL-7B-Instruct` | 轻量级 |
| `deepseek-ai/deepseek-vl2` | DeepSeek 视觉模型 |

## 使用说明

顶栏四个 tab：

### 📊 积分统计（`/`）
- 时间筛选：今日 / 本周 / 本月 / 全部 / 自定义范围
- 5 张统计卡（最高/最低/平均分 + 参与人数 + 重点关注）
- 学生分数卡，内部两个子 tab：
  - **排名** — 重点学生独立横条（永久可见）+ 全部学生主图，按总分降序
  - **趋势** — 重点学生逐日累计折线，每生一色
- 学生排行表 + 每日详情可展开

### 📷 上传解析（`/upload`）
1. 选学年 + 考评日期
2. 拖拽 / 点击 / 粘贴上传图片
3. 等 OCR（30–180 s）→ 行内编辑 → 保存
4. 也可直接粘贴 JSON，跳过 OCR

### 👥 学生管理（`/students`）
- 搜索 / 关注开关 / 添加 / 编辑 / 删除（二次确认）
- 点行打开抽屉：含历史折线 + 全部记录

### ⚙️ 系统设置（`/settings/*`）
- **API 配置** — SiliconFlow Key 与模型
- **学年管理** — 新增 / 设为当前学年（顶栏下拉随之刷新）/ 删除
- **数据管理** — 导出 JSON / 导入 upsert / 清空全部数据（需输入 `DELETE` 确认）

### 旧版回滚 `/legacy/`
保留旧的纯 HTML/JS/ECharts 单页，应急可访问。

## 项目结构

```
classrank/
├── classrank/                # Django 项目配置
│   ├── settings.py           # WhiteNoise + CORS
│   └── urls.py               # legacy + SPA catch-all
├── core/                     # 后端 API + 模型
│   ├── models.py             # Student / ScoreRecord / AcademicYear / Config
│   ├── views.py              # JSON API 视图
│   ├── urls.py               # /api/* 路由
│   ├── services/ocr_service.py
│   └── templatetags/vite.py  # Vite 资源加载 tag
├── frontend/                 # Vite + React + TS 前端
│   ├── src/
│   │   ├── components/       # ui (shadcn) / dashboard / students / upload / layout / common
│   │   ├── routes/           # dashboard / upload / students / settings/*
│   │   ├── lib/api/          # 各 endpoint 的客户端 + CSRF
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
├── templates/
│   ├── index.html            # SPA 加载壳
│   └── legacy.html           # 旧版应急
├── static/app/               # Vite 产物（manifest.json + assets/）
├── Dockerfile                # 多阶段（node build → python runtime）
├── docker-compose.yml
├── docker-entrypoint.sh      # 容器内 migrate + gunicorn
├── start.sh                  # 本地一键启动
└── requirements.txt
```

## 技术栈

- **后端**：Django 4.2 · SQLite · WhiteNoise · gunicorn
- **前端**：React 18 · Vite 5 · TypeScript 5 · Tailwind 3 · shadcn/ui
  - 数据层：TanStack Query v5 · React Hook Form · zod
  - 图表：Recharts
  - 路由：React Router v6
  - 通知：sonner
- **OCR**：SiliconFlow API（Qwen VL 系列）
- **部署**：Docker 多阶段构建 / docker-compose

## 关键 API

`/api/` 下主要 endpoint（完整见 `core/urls.py`）：

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/stats/range/` | 时间范围聚合：5 张卡片数据 + 全员排行 + 重点学生趋势 |
| GET | `/api/students/` | 学生列表，支持 `?academic_year_id=` 过滤 |
| GET | `/api/students/<id>/history/` | 单生历史折线数据 |
| POST | `/api/parse/` | OCR 图片解析 |
| POST | `/api/records/save/` | 批量保存 OCR 结果 |
| GET / POST | `/api/data/{export,import,clear}/` | 数据管理 |
| GET / PUT | `/api/config/<key>/` | 系统配置（API key、模型名） |
| GET / POST / PUT / DELETE | `/api/academic-years/...` | 学年 CRUD + 激活 |
