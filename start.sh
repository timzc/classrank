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
