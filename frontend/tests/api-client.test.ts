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
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    globalThis.fetch = spy;
    await request('/api/test/', { method: 'POST', body: JSON.stringify({}) });
    const headers = new Headers((spy.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('X-CSRFToken')).toBe('tok');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not add CSRF on GET', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    globalThis.fetch = spy;
    await request('/api/test/');
    const headers = new Headers((spy.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('X-CSRFToken')).toBeNull();
  });

  it('does not stringify FormData and skips Content-Type', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    globalThis.fetch = spy;
    const fd = new FormData();
    fd.append('image', new Blob(['x']), 'a.png');
    await request('/api/parse/', { method: 'POST', body: fd });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(fd);
    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
  });
});
