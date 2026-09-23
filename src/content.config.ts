import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Only these schemes are allowed: anything else would render as a broken
// relative link under the /portfolio base.
const href = z
  .string()
  .regex(/^(https:\/\/|mailto:|tel:)/, 'href must start with https://, mailto:, or tel:');

const bullets = z.array(z.string().min(1)).min(1);

const profile = defineCollection({
  loader: file('src/content/profile.yaml'),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    tagline: z.string(),
    location: z.string(),
    about: z.string(),
    meta: z.object({
      description: z.string(),
      ogDescription: z.string(),
    }),
    contacts: z.array(
      z.object({
        kind: z.enum(['email', 'phone', 'linkedin', 'github']),
        label: z.string(),
        href,
      }),
    ),
    footerLinks: z.array(z.object({ label: z.string(), href })),
  }),
});

const skills = defineCollection({
  loader: file('src/content/skills.yaml'),
  schema: z.object({
    label: z.string(),
    order: z.number().int(),
    items: z.array(z.string().min(1)).min(1),
  }),
});

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    period: z.string(),
    // Sort key only (newest first); `period` is what is displayed.
    start: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'start must be YYYY-MM'),
    bullets,
  }),
});

const education = defineCollection({
  loader: file('src/content/education.yaml'),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    period: z.string(),
    order: z.number().int(),
    bullets,
  }),
});

const projects = defineCollection({
  loader: file('src/content/projects.yaml'),
  schema: z.object({
    // Project ids become case-study URLs (/projects/<id>/): lowercase kebab-case only.
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'project id must be lowercase kebab-case'),
    name: z.string(),
    summary: z.string(),
    tags: z.array(z.string().min(1)),
    repo: z.string().regex(/^https:\/\//, 'repo must be an https:// URL'),
    badge: z.string().optional(),
    order: z.number().int(),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ base: './src/content/case-studies', pattern: '**/[^_.]*.md' }),
  schema: z.object({
    project: reference('projects'),
    title: z.string().optional(),
  }),
});

export const collections = { profile, skills, experience, education, projects, caseStudies };
