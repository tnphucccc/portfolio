import { describe, expect, it } from 'vitest';
import { isExternal, withBase } from '../src/lib/url';

describe('withBase', () => {
  it('joins a hash onto a base without trailing slash', () => {
    expect(withBase('#about', '/portfolio')).toBe('/portfolio/#about');
  });

  it('joins onto a base with trailing slash', () => {
    expect(withBase('#about', '/portfolio/')).toBe('/portfolio/#about');
  });

  it('strips a leading slash from the path', () => {
    expect(withBase('/projects/mangahub/', '/portfolio')).toBe('/portfolio/projects/mangahub/');
  });

  it('returns the base root for an empty path', () => {
    expect(withBase('', '/portfolio')).toBe('/portfolio/');
  });

  it('works with the root base', () => {
    expect(withBase('#about', '/')).toBe('/#about');
  });
});

describe('isExternal', () => {
  it('is true for http(s) links', () => {
    expect(isExternal('https://github.com/tnphucccc')).toBe(true);
    expect(isExternal('http://example.com')).toBe(true);
  });

  it('is false for mailto, tel, and in-site links', () => {
    expect(isExternal('mailto:a@b.c')).toBe(false);
    expect(isExternal('tel:+84901976650')).toBe(false);
    expect(isExternal('#about')).toBe(false);
  });
});
