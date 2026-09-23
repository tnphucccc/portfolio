import { describe, expect, it } from 'vitest';
import { personJsonLd } from '../src/lib/seo';

const person = {
  name: 'Phuc Tran Nguyen',
  role: 'Software Engineer',
  location: 'Ho Chi Minh City, Vietnam',
  url: 'https://tnphucccc.github.io/portfolio/',
  sameAs: ['https://github.com/tnphucccc', 'https://www.linkedin.com/in/phuc-tran-hcmiu/'],
};

describe('personJsonLd', () => {
  it('describes the person with schema.org Person fields', () => {
    expect(JSON.parse(personJsonLd(person))).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Phuc Tran Nguyen',
      jobTitle: 'Software Engineer',
      url: 'https://tnphucccc.github.io/portfolio/',
      sameAs: ['https://github.com/tnphucccc', 'https://www.linkedin.com/in/phuc-tran-hcmiu/'],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Ho Chi Minh City',
        addressCountry: 'Vietnam',
      },
    });
  });

  it('omits the country when the location has no comma', () => {
    const data = JSON.parse(personJsonLd({ ...person, location: 'Remote' }));
    expect(data.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'Remote' });
  });

  it('cannot close its <script> tag, whatever the content says', () => {
    const out = personJsonLd({ ...person, name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});
