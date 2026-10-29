import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import db, { checkDatabaseHealth } from '../src/config/db.js';

async function cleanGymData() {
  console.log('========================================================');
  console.log('FiftyFifty Gym — Safe Data Cleanup (Fresh Gym State)');
  console.log('========================================================\n');

  // Step 1: Health check & target verification
  const health = await checkDatabaseHealth();
  if (!health.connected) {
    console.error('[Error] Database is not connected:', health.errorMessage);
    process.exit(1);
  }
  console.log(`[Target Database]: ${health.database} at ${health.target} (${health.latencyMs}ms)\n`);

  // Step 2: Pre-cleanup audit
  console.log('--- 1. AUDIT BEFORE CLEANUP ---');
  const gymsBefore = await db.query('SELECT id, name, owner_name, email FROM gyms ORDER BY created_at ASC');
  console.log(`Total Gyms: ${gymsBefore.rows.length}`);

  const superAdminsBefore = await db.query('SELECT id, email, role FROM super_admins ORDER BY created_at ASC');
  console.log(`Total Super Admins: ${superAdminsBefore.rows.length}`);

  const gymOwnersBefore = await db.query('SELECT id, email, role, gym_id FROM gym_owners ORDER BY created_at ASC');
  console.log(`Total Gym Owners: ${gymOwnersBefore.rows.length}`);

  // Step 3: Atomic Transactional Deletion
  console.log('--- 2. EXECUTING SAFE TRANSACTIONAL CLEANUP ---');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Delete dependent transactional records
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM attendance');
    await client.query('DELETE FROM member_subscriptions');
    await client.query('DELETE FROM members');
    await client.query('DELETE FROM membership_plans');

    // 2. Delete gym owners (protecting super_admins completely)
    const ownerDel = await client.query('DELETE FROM gym_owners RETURNING id, email');
    console.log(`  Deleted ${ownerDel.rowCount} gym owner accounts`);

    // 3. Delete all gyms
    const gymDel = await client.query('DELETE FROM gyms RETURNING id, name');
    console.log(`  Deleted ${gymDel.rowCount} gym records`);

    await client.query('COMMIT');
    console.log('\n[Transaction Committed Successfully]');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n[Transaction Rolled Back Due to Error]:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }

  // Step 4: Post-cleanup verification
  console.log('\n--- 3. POST-CLEANUP VERIFICATION ---');
  const gymsAfter = await db.query('SELECT COUNT(*) FROM gyms');
  console.log(`Total Gyms in DB: ${gymsAfter.rows[0].count}`);

  const superAdminsAfter = await db.query('SELECT id, email, role, status FROM super_admins');
  console.log(`\nPreserved Super Admins (${superAdminsAfter.rows.length}):`);
  superAdminsAfter.rows.forEach(u => {
    console.log(`  - ${u.email} | Role: ${u.role} | Status: ${u.status}`);
  });

  console.log('\n========================================================');
  console.log('Database successfully cleaned. Zero gyms ready for fresh creation.');
  console.log('========================================================\n');
  process.exit(0);
}

cleanGymData().catch(err => {
  console.error('Fatal error in cleanup script:', err);
  process.exit(1);
});
