import session from 'express-session';

const clone = value => structuredClone(value);
const expiration = sess => {
  const expires = sess.cookie?.expires && Date.parse(sess.cookie.expires);
  return new Date(Number.isFinite(expires) ? expires : Date.now() + (Number(sess.cookie?.maxAge) || 8 * 60 * 60 * 1000));
};

export class PgSessionStore extends session.Store {
  constructor(pool) { super(); this.pool = pool; }

  get(sid, callback) {
    this.pool.query('SELECT sess FROM sessions WHERE sid=$1 AND expires_at > now()', [sid])
      .then(result => callback(null, result.rows[0] ? clone(result.rows[0].sess) : null), callback);
  }
  set(sid, sess, callback = () => {}) {
    this.pool.query('INSERT INTO sessions(sid,sess,expires_at) VALUES($1,$2,$3) ON CONFLICT(sid) DO UPDATE SET sess=EXCLUDED.sess,expires_at=EXCLUDED.expires_at', [sid, JSON.stringify(sess), expiration(sess)])
      .then(() => callback(null), callback);
  }
  destroy(sid, callback = () => {}) {
    this.pool.query('DELETE FROM sessions WHERE sid=$1', [sid]).then(() => callback(null), callback);
  }
  // rolling:false means reads must not extend server-side expiry or rewrite rows.
  touch(_sid, _sess, callback = () => {}) { callback(null); }
}
