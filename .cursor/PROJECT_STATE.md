# GDVN Web Project State

## Changelog
- **2026-09-12**: Extracted Records tab from `admin/page.tsx` into `src/app/admin/components/RecordsTab.tsx`. Moved record moderation states, queue filters, and related utilities into the new component for better maintainability and single responsibility.

- **2026-09-12**: Extracted Works tab from `admin/page.tsx` into `src/app/admin/components/WorksTab.tsx`. Moved Works & Level Submissions moderation states, functions, and UI into the new self-contained component.
