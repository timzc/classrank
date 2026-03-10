# 学生考评积分管理系统 - PRD设计文档

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 项目名称 | 学生考评积分管理系统 |
| 版本 | V1.0 |
| 创建日期 | 2026-03-08 |
| 文档状态 | 初稿 |

---

## 2. 项目概述

### 2.1 项目背景
学校老师每日发布学生考评信息（包含加分/减分项），家长需要手动记录和统计孩子的积分情况。为提高效率，需要一个本地web应用自动解析考评图片并管理积分数据。

### 2.2 项目目标
- 自动化：通过OCR技术自动解析考评图片，减少手工录入
- 可视化：直观展示学生积分情况，重点关注指定学生
- 本地化：数据存储在本地，保护隐私，无需联网同步

### 2.3 目标用户
- 学生家长：关注孩子日常表现和积分情况

---

## 3. 功能需求

### 3.1 功能架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      学生考评积分管理系统                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  图片上传    │  │  关注管理    │  │  积分展示    │      │
│  │  OCR解析     │  │  学生名单    │  │  数据统计    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Django 后端服务                     │  │
│  ├─────────────────┬──────────────────┬─────────────────┤  │
│  │  SiliconFlow API│   数据处理层     │   REST API      │  │
│  └─────────────────┴──────────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    SQLite 数据库                       │  │
│  │  学生表 │ 考评记录表 │ 加减分明细表 │ 配置表         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心功能模块

#### 3.2.1 模块一：考评图片解析

**功能描述**
用户上传老师发布的考评图片，系统调用SiliconFlow大模型API进行OCR解析，提取学生姓名、加分项、减分项等信息。

**业务流程**

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 上传图片  │ -> │ 调用API  │ -> │ 解析结果  │ -> │ 保存数据  │
│ 选择日期  │    │ OCR识别  │    │ 确认/修正 │    │ 入库存储  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

**输入项**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 考评图片 | Image | 是 | 支持jpg/png格式，单张或多张 |
| 考评日期 | Date | 是 | 默认当天日期，可手动选择 |

**输出项**
| 字段 | 类型 | 说明 |
|------|------|------|
| 解析状态 | Status | 成功/失败 |
| 学生列表 | List | 包含姓名、加分项、减分项、净得分 |
| 错误信息 | String | 解析失败时的提示 |

**处理规则**
1. 图片上传后，先进行格式和大小校验（最大10MB）
2. 调用SiliconFlow API进行OCR识别
3. 使用预设Prompt模板引导模型输出结构化JSON
4. 解析结果展示给用户确认，支持手动修正
5. 确认后存入数据库，关联日期

**OCR Prompt模板**

```
你是一个教育评分助手。请分析这张学生考评图片，提取以下信息并以JSON格式返回：

1. 识别图片中的所有学生姓名
2. 每个学生的加分项及分数
3. 每个学生的减分项及分数
4. 计算每个学生的净得分

返回格式：
{
  "students": [
    {
      "name": "学生姓名",
      "bonus": [
        {"item": "加分项目", "score": 分数值},
        ...
      ],
      "penalty": [
        {"item": "减分项目", "score": 分数值},
        ...
      ],
      "net_score": 净得分
    },
    ...
  ],
  "class_info": "班级信息（如有）",
  "date": "考评日期（如有）"
}

请只返回JSON，不要有其他说明文字。
```

---

#### 3.2.2 模块二：关注学生管理

**功能描述**
用户可以维护一份需要重点关注的学生名单，这些学生在积分展示时会有特殊的视觉标识。

**功能点**
| 功能 | 操作 | 说明 |
|------|------|------|
| 添加关注学生 | 输入姓名 | 支持模糊搜索已有学生 |
| 移除关注学生 | 点击移除 | 从关注列表中删除 |
| 查看关注列表 | 列表展示 | 显示所有关注的学生 |

**数据结构**
```
关注学生表:
- id: 主键
- student_name: 学生姓名
- created_at: 添加时间
```

---

#### 3.2.3 模块三：积分数据展示

**功能描述**
以柱状图形式展示所有学生的积分情况，支持当日分数和历史累积总分两种视图，关注学生用特殊颜色标识。

**展示规则**

| 维度 | 规则 |
|------|------|
| 排序方式 | 分数从高到低排列 |
| 当日分数 | 显示选定日期每个学生的净得分 |
| 累积总分 | 显示每个学生的历史累积净得分 |
| 关注学生 | 使用特殊颜色（如橙色）标识 |
| 普通学生 | 使用默认颜色（如蓝色）标识 |

**页面布局**

```
┌─────────────────────────────────────────────────────────────┐
│  学生考评积分管理系统                            [日期选择器] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    [当日分数] [累积总分]              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 张三 ★                        │   │
│  │     ▓▓▓▓▓▓▓▓▓▓▓▓▓ 李四 ★                          │   │
│  │     ▓▓▓▓▓▓▓▓▓▓▓ 王五                              │   │
│  │     ▓▓▓▓▓▓▓▓ 赵六                                 │   │
│  │     ▓▓▓▓▓ 钱七                                    │   │
│  │                                                      │   │
│  │  图例: ▓ 普通学生  ▓ 关注学生(★)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ [上传考评图片]   │  │ [管理关注学生]   │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 数据模型设计

### 4.1 ER图

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   Student     │       │  ScoreRecord  │       │ ScoreDetail   │
├───────────────┤       ├───────────────┤       ├───────────────┤
│ id (PK)       │──┐    │ id (PK)       │──┐    │ id (PK)       │
│ name          │  │    │ student_id(FK)│  │    │ record_id(FK) │
│ is_focused    │  └──->│ date          │  └──->│ type          │
│ created_at    │       │ net_score     │       │ item          │
│ updated_at    │       │ created_at    │       │ score         │
└───────────────┘       │ updated_at    │       │ created_at    │
                        └───────────────┘       └───────────────┘

┌───────────────┐
│   Config      │
├───────────────┤
│ id (PK)       │
│ key           │
│ value         │
│ description   │
│ updated_at    │
└───────────────┘
```

### 4.2 数据表详细设计

#### 4.2.1 学生表 (Student)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| name | VARCHAR(50) | NOT NULL, UNIQUE | 学生姓名 |
| is_focused | BOOLEAN | DEFAULT FALSE | 是否为关注学生 |
| created_at | DATETIME | AUTO | 创建时间 |
| updated_at | DATETIME | AUTO | 更新时间 |

#### 4.2.2 积分记录表 (ScoreRecord)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| student_id | INTEGER | FK | 关联学生ID |
| date | DATE | NOT NULL | 考评日期 |
| net_score | INTEGER | DEFAULT 0 | 净得分(加分-减分) |
| created_at | DATETIME | AUTO | 创建时间 |
| updated_at | DATETIME | AUTO | 更新时间 |

**索引**: (student_id, date) 唯一索引

#### 4.2.3 积分明细表 (ScoreDetail)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| record_id | INTEGER | FK | 关联积分记录ID |
| type | VARCHAR(10) | NOT NULL | 类型: bonus/penalty |
| item | VARCHAR(200) | NOT NULL | 加减分项目描述 |
| score | INTEGER | NOT NULL | 分数(正整数) |
| created_at | DATETIME | AUTO | 创建时间 |

#### 4.2.4 系统配置表 (Config)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| key | VARCHAR(50) | NOT NULL, UNIQUE | 配置键 |
| value | TEXT | NOT NULL | 配置值 |
| description | VARCHAR(200) | | 配置说明 |
| updated_at | DATETIME | AUTO | 更新时间 |

**预设配置项**:
| key | 默认值 | 说明 |
|-----|--------|------|
| siliconflow_api_key | "" | SiliconFlow API密钥 |
| siliconflow_model | "Qwen/Qwen2-VL-72B-Instruct" | 使用的模型名称 |

---

## 5. API接口设计

### 5.1 接口列表

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 上传解析图片 | POST | /api/parse/ | 上传图片并OCR解析 |
| 确认解析结果 | POST | /api/records/ | 确认并保存解析结果 |
| 获取积分数据 | GET | /api/records/ | 获取积分数据列表 |
| 获取关注学生 | GET | /api/students/focused/ | 获取关注学生列表 |
| 添加关注学生 | POST | /api/students/focused/ | 添加关注学生 |
| 移除关注学生 | DELETE | /api/students/focused/{id}/ | 移除关注学生 |
| 获取配置 | GET | /api/config/{key}/ | 获取指定配置 |
| 更新配置 | PUT | /api/config/{key}/ | 更新指定配置 |

### 5.2 接口详细设计

#### 5.2.1 上传解析图片

**请求**
```
POST /api/parse/
Content-Type: multipart/form-data

Parameters:
- image: 图片文件
- date: 考评日期 (可选，默认当天)
```

**响应**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "name": "张三",
        "bonus": [
          {"item": "积极发言", "score": 2}
        ],
        "penalty": [
          {"item": "迟到", "score": 1}
        ],
        "net_score": 1
      }
    ],
    "class_info": "三年级二班",
    "date": "2026-03-08"
  }
}
```

#### 5.2.2 确认解析结果

**请求**
```json
POST /api/records/
Content-Type: application/json

{
  "date": "2026-03-08",
  "students": [
    {
      "name": "张三",
      "bonus": [{"item": "积极发言", "score": 2}],
      "penalty": [{"item": "迟到", "score": 1}],
      "net_score": 1
    }
  ]
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "saved_count": 1,
    "date": "2026-03-08"
  }
}
```

#### 5.2.3 获取积分数据

**请求**
```
GET /api/records/?type=daily&date=2026-03-08
或
GET /api/records/?type=total
```

**参数**
- type: daily (当日分数) / total (累积总分)
- date: 日期 (type=daily时必填)

**响应**
```json
{
  "success": true,
  "data": {
    "type": "daily",
    "date": "2026-03-08",
    "records": [
      {
        "id": 1,
        "name": "张三",
        "score": 5,
        "is_focused": true
      },
      {
        "id": 2,
        "name": "李四",
        "score": 3,
        "is_focused": false
      }
    ]
  }
}
```

---

## 6. 技术方案

### 6.1 技术选型

| 层级 | 技术栈 | 选型理由 |
|------|--------|----------|
| 后端框架 | Django 5.x | 成熟稳定，内置Admin，适合快速开发 |
| 数据库 | SQLite | 轻量级，无需额外安装，适合本地应用 |
| 前端 | HTML + CSS + JavaScript + ECharts | 简单直接，适合小规模应用 |
| OCR服务 | SiliconFlow API | 支持多模态模型，性价比高 |
| 图表库 | ECharts 5.x | 功能强大，中文文档完善 |

### 6.2 项目结构

```
classrank/
├── manage.py
├── db.sqlite3
├── config/                     # 配置文件
│   └── settings.py
├── classrank/                  # 主应用
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── core/                       # 核心业务应用
│   ├── __init__.py
│   ├── models.py              # 数据模型
│   ├── views.py               # 视图
│   ├── urls.py                # 路由
│   ├── serializers.py         # 序列化器
│   ├── services/              # 业务逻辑
│   │   ├── __init__.py
│   │   └── ocr_service.py     # OCR服务封装
│   └── management/            # 管理命令
│       └── commands/
├── templates/                  # 前端模板
│   └── index.html
├── static/                     # 静态资源
│   ├── css/
│   ├── js/
│   └── images/
└── requirements.txt
```

### 6.3 配置管理

API Key配置方式：
1. 环境变量 (推荐): `SILICONFLOW_API_KEY`
2. 配置文件: `config/.env`
3. 页面设置: 通过管理界面配置

```python
# settings.py 中的配置读取逻辑
import os
from dotenv import load_dotenv

load_dotenv()

SILICONFLOW_API_KEY = os.getenv('SILICONFLOW_API_KEY', '')
SILICONFLOW_MODEL = os.getenv('SILICONFLOW_MODEL', 'Qwen/Qwen2-VL-72B-Instruct')
```

---

## 7. 用户交互流程

### 7.1 首次使用流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  打开应用    │ --> │  配置API Key │ --> │  开始使用   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 7.2 日常使用流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  上传图片    │ --> │  确认解析    │ --> │  查看统计    │ --> │  管理关注    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 8. 非功能需求

| 类别 | 要求 | 说明 |
|------|------|------|
| 性能 | 图片解析 < 30s | 单张图片OCR处理时间 |
| 可用性 | 本地部署 | 无需外网即可查看历史数据 |
| 安全性 | 本地存储 | 数据不上传云端 |
| 兼容性 | 主流浏览器 | Chrome, Edge, Safari |
| 可维护性 | 配置化 | API Key等配置可动态修改 |

---

## 9. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| OCR识别不准确 | 数据错误 | 提供手动修正功能 |
| API服务不稳定 | 无法解析 | 提示重试，保留历史数据 |
| 图片格式不规范 | 解析失败 | 提示用户检查图片 |

---

## 10. 里程碑规划

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| Phase 1 | 项目框架搭建 | Django项目结构、数据模型 |
| Phase 2 | 核心功能开发 | OCR解析、数据存储 |
| Phase 3 | 前端页面开发 | 上传页面、图表展示 |
| Phase 4 | 测试优化 | Bug修复、性能优化 |

---

## 11. 附录

### 11.1 SiliconFlow API 调用示例

```python
import base64
import requests

def parse_image_with_ocr(image_path, api_key):
    """调用SiliconFlow API进行OCR解析"""

    # 读取图片并转base64
    with open(image_path, 'rb') as f:
        image_base64 = base64.b64encode(f.read()).decode()

    # 构建请求
    url = "https://api.siliconflow.cn/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "Qwen/Qwen2-VL-72B-Instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    },
                    {
                        "type": "text",
                        "text": """你是一个教育评分助手。请分析这张学生考评图片，提取学生姓名、加分项、减分项信息。

返回JSON格式：
{
  "students": [
    {
      "name": "学生姓名",
      "bonus": [{"item": "加分项目", "score": 分数}],
      "penalty": [{"item": "减分项目", "score": 分数}],
      "net_score": 净得分
    }
  ]
}

只返回JSON，不要其他文字。"""
                    }
                ]
            }
        ],
        "max_tokens": 4096
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()
```

### 11.2 参考文档

- SiliconFlow API文档: https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions
- Django官方文档: https://docs.djangoproject.com/
- ECharts官方文档: https://echarts.apache.org/zh/index.html