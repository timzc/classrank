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
