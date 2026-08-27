import { renderSiteOgImage, SITE_OG_SIZE } from '@/lib/siteOg';

export const alt = 'GDVNC Challenge List';
export const size = SITE_OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderSiteOgImage('GDVNC Challenge List', 'Danh sach cac challenge');
}
