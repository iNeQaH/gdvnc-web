const connections = new Map<string, number>();

export function acquireSseConnection(ip: string, max = 5): boolean {
  const key = ip || 'unknown';
  const current = connections.get(key) || 0;
  if (current >= max) return false;
  connections.set(key, current + 1);
  return true;
}

export function releaseSseConnection(ip: string) {
  const key = ip || 'unknown';
  const current = connections.get(key) || 0;
  if (current <= 1) connections.delete(key);
  else connections.set(key, current - 1);
}
