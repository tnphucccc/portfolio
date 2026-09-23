import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

// Astro's file() loader only logs YAML parse errors and id-less items, and the
// build still succeeds. This test is what makes such content fail `pnpm build`.
const dir = fileURLToPath(new URL('../src/content/', import.meta.url));
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.yaml'))
  .sort();

describe('content YAML', () => {
  it('has the five collection files', () => {
    expect(files).toEqual([
      'education.yaml',
      'experience.yaml',
      'profile.yaml',
      'projects.yaml',
      'skills.yaml',
    ]);
  });

  it.each(files)('%s is a non-empty array of items with unique string ids', (file) => {
    const data = load(readFileSync(`${dir}${file}`, 'utf8'));
    expect(Array.isArray(data)).toBe(true);
    const ids = (data as Array<{ id?: unknown }>).map((item) => item.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(typeof id).toBe('string');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
