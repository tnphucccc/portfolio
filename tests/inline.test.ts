import { describe, expect, it } from 'vitest';
import { escapeHtml, renderInline } from '../src/lib/inline';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
  });
});

describe('renderInline', () => {
  it('passes plain text through unchanged', () => {
    expect(renderInline('Open to full-time software engineering roles.')).toBe(
      'Open to full-time software engineering roles.',
    );
  });

  it('wraps **text** in an accent span', () => {
    expect(renderInline('from **ML** and more')).toBe(
      'from <span class="hl">ML</span> and more',
    );
  });

  it('handles several highlights in one string', () => {
    expect(renderInline('on **GraphQL** and **MongoDB**, improving **30%**')).toBe(
      'on <span class="hl">GraphQL</span> and <span class="hl">MongoDB</span>, improving <span class="hl">30%</span>',
    );
  });

  it('escapes markup so content cannot inject HTML', () => {
    expect(renderInline('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('escapes inside highlights', () => {
    expect(renderInline('**DSA & OOP**')).toBe('<span class="hl">DSA &amp; OOP</span>');
  });

  it('leaves an unmatched ** literal', () => {
    expect(renderInline('a ** b')).toBe('a ** b');
    expect(renderInline('**open')).toBe('**open');
  });
});
