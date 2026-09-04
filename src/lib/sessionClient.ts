'use client';

export async function refreshSessionUser() {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    const data = await res.json();
    if (!data?.success || !data.user) return null;
    let prev: Record<string, unknown> = {};
    try {
      prev = JSON.parse(localStorage.getItem('gdvnc_user') || '{}') || {};
    } catch {
      prev = {};
    }
    const next = { ...prev, ...data.user };
    localStorage.setItem('gdvnc_user', JSON.stringify(next));
    window.dispatchEvent(new Event('gdvnc_user_update'));
    return next;
  } catch {
    return null;
  }
}
