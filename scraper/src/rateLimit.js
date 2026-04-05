const lastHit = new Map();

export async function rateLimit(key, minIntervalMs) {
  const now = Date.now();
  const last = lastHit.get(key) || 0;
  const waitMs = Math.max(0, minIntervalMs - (now - last));
  if (waitMs > 0) {
    await new Promise((r) => setTimeout(r, waitMs));
  }
  lastHit.set(key, Date.now());
}
