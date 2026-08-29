export function sanitizeChronicleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=/gi, ' ')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
}
