
import pino from 'pino';

const level = process.env.SILENT === 'true' ? 'error' : 'info';
export const log = pino({ level });

export function mustGet(name, allowEmpty=false) {
  const v = process.env[name];
  if ((v === undefined || v === null || v === '') && !allowEmpty) {
    throw new Error(`Missing ${name} in environment.`);
  }
  return v;
}

export function normalizeChatId(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = String(raw).trim();
  if (s.startsWith('-100')) return Number(s);
  if (/^\d+$/.test(s)) return Number(`-100${s}`);
  return Number(s);
}

export function pickTruthy(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([_,v]) => !!v));
}
