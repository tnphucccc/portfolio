/** Prefixes an in-site path or hash with the configured `base` (e.g. /portfolio). */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}${path.replace(/^\//, '')}`;
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}
