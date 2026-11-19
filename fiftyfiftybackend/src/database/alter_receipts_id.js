import db from '../config/db.js';

async function updateTable() {
  try {
    await db.query(`ALTER TABLE membership_receipts ALTER COLUMN id SET DEFAULT ('rcp_' || substr(md5(random()::text), 1, 16))`);
    console.log('[Migration] Successfully set default id generator on membership_receipts.');
  } catch (err) {
    console.error('[Migration Error]:', err.message);
  } finally {
    process.exit(0);
  }
}

updateTable();
