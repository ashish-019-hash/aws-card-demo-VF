import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const clone = value => structuredClone(value);
export const empty = () => ({ version: 1, users: [], sessions: {}, accounts: [], customers: [], cards: [], xrefs: [], transactions: [], categories: [], types: [], categoryBalances: [], disclosureGroups: [], idempotency: {}, reports: [] });

/** A single-process JSON store. Atomic rename prevents torn writes, not multi-process writers. */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
function prune(data, now = Date.now(), limit = 100) {
  let removed = 0;
  for (const [key, value] of Object.entries(data.sessions)) { if (removed >= limit) break; if (value.expiresAt <= now) { delete data.sessions[key]; removed++; } }
  for (const [key, value] of Object.entries(data.idempotency)) { if (removed >= limit) break; if (value.createdAt && Date.parse(value.createdAt) <= now - RETENTION_MS) { delete data.idempotency[key]; removed++; } }
  if (removed < limit) data.reports = data.reports.filter(report => removed >= limit || !report.createdAt || Date.parse(report.createdAt) > now - RETENTION_MS || (removed++, false));
}

export class Store {
  constructor(file) { this.file = file; this.data = null; }
  load() {
    if (!this.data) this.data = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : empty();
    return this.data;
  }
  save(data = this.data) {
    const tmp = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
  transaction(fn) {
    const candidate = clone(this.load());
    prune(candidate);
    const result = fn(candidate); // Do not publish candidate until callback succeeds.
    this.save(candidate);
    this.data = candidate;
    return clone(result);
  }
}

export function makeSessionStore(store) {
  const purge = (sid, callback) => {
    try { store.transaction(data => { delete data.sessions[sid]; }); callback(null); } catch (error) { callback(error); }
  };
  return {
    get(sid, callback) {
      try {
        const record = store.load().sessions[sid];
        if (!record) return callback(null, null);
        if (record.expiresAt <= Date.now()) return purge(sid, error => callback(error, null));
        return callback(null, clone(record.session));
      } catch (error) { return callback(error); }
    },
    set(sid, session, callback) {
      try {
        const expires = session.cookie?.expires ? Date.parse(session.cookie.expires) : NaN;
        const expiresAt = Number.isFinite(expires) ? expires : Date.now() + (Number(session.cookie?.maxAge) || 8 * 60 * 60 * 1000);
        store.transaction(data => { data.sessions[sid] = { session: clone(session), expiresAt }; });
        callback?.(null);
      } catch (error) { callback?.(error); }
    },
    destroy(sid, callback) { purge(sid, callback ?? (() => {})); },
    // rolling:false plus a no-op touch avoids rewriting the entire JSON document on reads.
    touch(_sid, _session, callback) { callback?.(null); }
  };
}
