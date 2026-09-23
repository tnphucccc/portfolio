import { getCollection, getEntry } from 'astro:content';

const byOrder = (a: { data: { order: number } }, b: { data: { order: number } }) =>
  a.data.order - b.data.order;

// Astro's file() loader only logs YAML errors; an empty collection here means
// the file failed to load, so fail loudly instead of rendering an empty section.
function nonEmpty<T>(entries: T[], name: string): T[] {
  if (entries.length === 0) {
    throw new Error(`Collection "${name}" is empty; check src/content/${name}.yaml`);
  }
  return entries;
}

export async function getProfile() {
  const entry = await getEntry('profile', 'me');
  if (!entry) throw new Error('src/content/profile.yaml must contain an entry with id "me"');
  return entry.data;
}

export async function getSkills() {
  return nonEmpty(await getCollection('skills'), 'skills').sort(byOrder);
}

/** Newest first. */
export async function getExperience() {
  return nonEmpty(await getCollection('experience'), 'experience').sort((a, b) =>
    b.data.start.localeCompare(a.data.start),
  );
}

export async function getEducation() {
  return nonEmpty(await getCollection('education'), 'education').sort(byOrder);
}

export async function getProjects() {
  return nonEmpty(await getCollection('projects'), 'projects').sort(byOrder);
}
