export interface PersonInput {
  name: string;
  role: string;
  /** "City, Country" — the part after the first comma becomes the country. */
  location: string;
  url: string;
  sameAs: string[];
}

/**
 * schema.org Person as JSON for a `<script type="application/ld+json">`.
 * `<` is escaped so no content can close the script tag.
 */
export function personJsonLd(p: PersonInput): string {
  const [locality, ...rest] = p.location.split(',').map((s) => s.trim());
  const country = rest.join(', ');
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    jobTitle: p.role,
    url: p.url,
    sameAs: p.sameAs,
    address: {
      '@type': 'PostalAddress',
      addressLocality: locality,
      ...(country ? { addressCountry: country } : {}),
    },
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
