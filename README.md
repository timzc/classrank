# 学生考评积分管理系统

一个用于管理学生日常考评积分的本地Web应用。

## 功能特性

- 📷 **OCR图片解析**: 上传考评图片，自动识别学生加减分项
- 📊 **积分统计**: 柱状图展示学生积分排名
- ⭐ **关注学生**: 特殊标记关注的学生，图表中高亮显示
- ✏️ **手动编辑**: 支持手动修改OCR解析结果
- 💾 **本地存储**: 数据存储在本地SQLite数据库

## 快速开始

### 1. 环境要求

- Python 3.8+
- pip

### 2. 安装运行

**macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### 3. 配置 API Key

1. 访问 http://127.0.0.1:8000
2. 点击「系统设置」标签
3. 填写你的 SiliconFlow API Key
4. (可选) 修改 OCR 模型名称
5. 点击「保存设置」

**获取 API Key**: [https://cloud.siliconflow.cn](https://cloud.siliconflow.cn)

## 支持的OCR模型

可以在系统设置中自定义模型名称，常用模型：

| 模型名称 | 说明 |
|---------|------|
| `Qwen/Qwen2.5-VL-32B-Instruct` | 推荐使用 |
| `Qwen/Qwen2-VL-72B-Instruct` | 更强大 |
| `Qwen/Qwen2-VL-7B-Instruct` | 轻量级 |
| `deepseek-ai/deepseek-vl2` | DeepSeek视觉模型 |

## 使用说明

### 上传解析

1. 点击「上传解析」标签
2. 选择考评日期
3. 拖拽或点击上传考评图片
4. 点击「开始解析」
5. 确认或编辑解析结果
6. 点击「确认保存」

### 积分统计

- 切换「当日分数」/「累积总分」查看不同维度
- 选择日期查看特定日期的积分
- 橙色柱状表示关注学生

### 学生管理

- 添加/编辑/删除学生
- 设置学生关注状态

## 项目结构

```
classrank/
├── classrank/          # Django项目配置
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── core/               # 核心应用
│   ├── models.py       # 数据模型
│   ├── views.py        # API视图
│   ├── urls.py         # 路由配置
│   └── services/
│       └── ocr_service.py  # OCR服务
├── templates/
│   └── index.html      # 前端页面
├── manage.py
├── requirements.txt
├── .env.example
└── start.sh            # 启动脚本
```

## 技术栈

- **后端**: Django 4.2 + SQLite
- **前端**: HTML/CSS/JavaScript + ECharts
- **OCR**: SiliconFlow API (Qwen VL系列模型)