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
