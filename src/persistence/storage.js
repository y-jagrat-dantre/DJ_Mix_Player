const PREFIX = 'djmixr:'

export function readPreference(key, fallback) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writePreference(key, value) {
  try { localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value)) } catch { /* Storage can be unavailable in private browsing. */ }
}
