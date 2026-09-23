const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * Renders content strings for `set:html`. Escapes first, so the only markup
 * that can appear in the output is the accent span produced from `**text**`.
 */
export function renderInline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');
}
