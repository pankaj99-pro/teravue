import { getCache, setCache } from "./cache.js";

function parseRobots(text) {
  const lines = text.split(/\r?\n/);
  const rules = [];
  let applies = false;
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const [key, valRaw] = line.split(":").map((s) => s.trim());
    if (!key || valRaw == null) continue;
    const val = valRaw.trim();
    if (key.toLowerCase() === "user-agent") {
      applies = val === "*" ? true : false;
      continue;
    }
    if (!applies) continue;
    if (key.toLowerCase() === "disallow") rules.push({ type: "disallow", path: val });
    if (key.toLowerCase() === "allow") rules.push({ type: "allow", path: val });
  }
  return rules;
}

export async function isAllowedByRobots(url) {
  try {
    const u = new URL(url);
    const robotsUrl = `${u.origin}/robots.txt`;
    const cacheKey = `robots:${u.origin}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    const resp = await fetch(robotsUrl, { headers: { "User-Agent": "TeravueBot/1.0" } });
    if (!resp.ok) {
      setCache(cacheKey, true, 6 * 60 * 60 * 1000);
      return true;
    }
    const text = await resp.text();
    const rules = parseRobots(text);
    const path = u.pathname;
    let allowed = true;
    for (const rule of rules) {
      if (!rule.path) continue;
      if (path.startsWith(rule.path)) {
        allowed = rule.type === "allow";
      }
    }
    setCache(cacheKey, allowed, 6 * 60 * 60 * 1000);
    return allowed;
  } catch {
    return false;
  }
}
