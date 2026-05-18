# ---------- frontend build ----------
FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
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
