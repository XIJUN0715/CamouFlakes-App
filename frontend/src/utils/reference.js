// src/utils/reference.js
export function generateCamouFlakesRef() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CAMOUFLAKES-${stamp}-${rand}`;
}

// Single source of truth for how the fixed incident timestamp is displayed,
// so ResultScreen, the Preview screen, the Flow screen, and the PDF all
// render the exact same format from the exact same ISO string.
export function formatIncidentTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`;
}