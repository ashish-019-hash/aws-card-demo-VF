import { createApp } from './app.js';
import { createPool } from './db.js';

const port = Number(process.env.PORT || 3000);
const pool = createPool();
await pool.query('SELECT 1');
const server = createApp({ pool }).listen(port, () => console.log(`CardDemo API listening on ${port}`));

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await pool.end();
}
process.once('SIGINT', () => { shutdown().catch(error => { console.error(error); process.exitCode = 1; }); });
process.once('SIGTERM', () => { shutdown().catch(error => { console.error(error); process.exitCode = 1; }); });
