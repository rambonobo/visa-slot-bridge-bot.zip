export function normalizeName(s='') {
  return String(s).trim().toLowerCase();
}

export async function findGroupJidByName(sock, targetName) {
  const wanted = normalizeName(targetName);
  if (!wanted) return null;
  try { await sock.presenceSubscribe('status@broadcast'); } catch {}
  let exact = null, partial = null;
  const chats = sock?.store?.chats?.all?.() ?? [];
  for (const c of chats) {
    if (!c?.id?.endsWith('@g.us')) continue;
    const title = (c?.name || c?.subject || '').trim();
    const n = normalizeName(title);
    if (!n) continue;
    if (n === wanted) { exact = c.id; break; }
    if (n.includes(wanted) || wanted.includes(n)) partial = partial || c.id;
  }
  return exact || partial;
}
