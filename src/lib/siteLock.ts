export async function isSiteLocked(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8080'}/api/site-lock`, { next: { revalidate: 60 } });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.locked;
  } catch {
    return false;
  }
}
