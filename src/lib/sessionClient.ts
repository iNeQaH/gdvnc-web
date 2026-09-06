'use client';

function hasSessionHint() {
  try {
    if (localStorage.getItem('gdvnc_user')) return true;
  } catch {
    /* ignore */
  }
  try {
    return document.cookie.split(';').some((part) => part.trim().startsWith('gdvnc_ui=1'));
  } catch {
    return false;
  }
}

export async function refreshSessionUser() {
  if (!hasSessionHint()) return null;
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (res.status === 401) {
      if (localStorage.getItem('gdvnc_user')) {
        localStorage.removeItem('gdvnc_user');
        localStorage.removeItem('gdvnc_remember');
        window.dispatchEvent(new Event('gdvnc_user_update'));
      }
      return null;
    }
    const data = await res.json();
    if (!data?.success || !data.user) return null;
    let prev: Record<string, unknown> = {};
    try {
      prev = JSON.parse(localStorage.getItem('gdvnc_user') || '{}') || {};
    } catch {
      prev = {};
    }
    const next = { ...prev, ...data.user };
    const prevJson = localStorage.getItem('gdvnc_user') || '';
    const nextJson = JSON.stringify(next);
    localStorage.setItem('gdvnc_user', nextJson);
    if (prevJson !== nextJson) {
      window.dispatchEvent(new Event('gdvnc_user_update'));
    }
    return next;
  } catch {
    return null;
  }
}

export async function logoutClient() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
  } catch {
    /* cookie clear is best-effort */
  }
  try {
    localStorage.removeItem('gdvnc_user');
    localStorage.removeItem('gdvnc_remember');
    sessionStorage.removeItem('gdvnc_badges');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('gdvnc_user_update'));
}
