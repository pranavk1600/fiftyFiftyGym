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
  gymsBefore.rows.forEach((g, idx) => {
    console.log(`  [${idx + 1}] ID: ${g.id} | Name: "${g.name}" | Owner: ${g.owner_name} (${g.email})`);
  });

  const usersBefore = await db.query('SELECT id, email, role, gym_id FROM users ORDER BY created_at ASC');
  console.log(`\nTotal Users: ${usersBefore.rows.length}`);
  usersBefore.rows.forEach((u, idx) => {
    console.log(`  [${idx + 1}] ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | GymId: ${u.gym_id || 'null'}`);
  });

  const plansBefore = await db.query('SELECT COUNT(*) FROM membership_plans');
  const membersBefore = await db.query('SELECT COUNT(*) FROM members');
  const attendanceBefore = await db.query('SELECT COUNT(*) FROM attendance');
  const paymentsBefore = await db.query('SELECT COUNT(*) FROM payments');
  const notifsBefore = await db.query('SELECT COUNT(*) FROM notifications');
  const tokensBefore = await db.query('SELECT COUNT(*) FROM password_reset_tokens');

  console.log(`\nOther Tables:`);
  console.log(`- membership_plans: ${plansBefore.rows[0].count}`);
  console.log(`- members: ${membersBefore.rows[0].count}`);
  console.log(`- attendance: ${attendanceBefore.rows[0].count}`);
  console.log(`- payments: ${paymentsBefore.rows[0].count}`);
  console.log(`- notifications: ${notifsBefore.rows[0].count}`);
  console.log(`- password_reset_tokens: ${tokensBefore.rows[0].count} (Will be preserved for Super Admin)\n`);

  // Step 3: Atomic Transactional Deletion
  console.log('--- 2. EXECUTING SAFE TRANSACTIONAL CLEANUP ---');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Delete dependent transactional records
    const notifDel = await client.query('DELETE FROM notifications');
    console.log(`  Deleted ${notifDel.rowCount} notifications`);

    const payDel = await client.query('DELETE FROM payments');
    console.log(`  Deleted ${payDel.rowCount} payments`);

    const attDel = await client.query('DELETE FROM attendance');
    console.log(`  Deleted ${attDel.rowCount} attendance logs`);

    const subDel = await client.query('DELETE FROM member_subscriptions');
    console.log(`  Deleted ${subDel.rowCount} member subscriptions`);

    const memDel = await client.query('DELETE FROM members');
    console.log(`  Deleted ${memDel.rowCount} members`);

    const planDel = await client.query('DELETE FROM membership_plans');
    console.log(`  Deleted ${planDel.rowCount} membership plans`);

    // 2. Delete ONLY gym owner and member accounts linked to gyms.
    // Explicitly protect Super Admin accounts!
    const userDel = await client.query(`
      DELETE FROM users 
      WHERE (role = 'GYM_OWNER' OR role = 'MEMBER' OR gym_id IS NOT NULL)
        AND role NOT IN ('SUPER_ADMIN', 'PLATFORM_ADMIN')
        AND LOWER(email) NOT IN ('leopardxtechnology@gmail.com', 'admin@fiftyfifty.com')
      RETURNING id, email, role;
    `);
    console.log(`  Deleted ${userDel.rowCount} gym owner / member accounts:`);
    userDel.rows.forEach(u => console.log(`    - ${u.email} (${u.role})`));

    // 3. Delete all gyms
    const gymDel = await client.query('DELETE FROM gyms RETURNING id, name');
    console.log(`  Deleted ${gymDel.rowCount} gym records:`);
    gymDel.rows.forEach(g => console.log(`    - ${g.name} (${g.id})`));

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

  const usersAfter = await db.query('SELECT id, email, role, status FROM users ORDER BY created_at ASC');
  console.log(`\nRemaining Users in DB (${usersAfter.rows.length}):`);
  usersAfter.rows.forEach(u => {
    console.log(`  - ${u.email} | Role: ${u.role} | Status: ${u.status}`);
  });

  const superAdminExists = usersAfter.rows.some(u => 
    (u.role === 'SUPER_ADMIN' || u.role === 'PLATFORM_ADMIN') && u.email === 'leopardxtechnology@gmail.com'
  );
  console.log(`\nSuper Admin preserved and active: ${superAdminExists ? 'YES ✓' : 'NO ✗'}`);

  console.log('\n========================================================');
  console.log('Database successfully cleaned. Zero gyms ready for fresh creation.');
  console.log('========================================================\n');
  process.exit(0);
}

cleanGymData().catch(err => {
  console.error('Fatal error in cleanup script:', err);
  process.exit(1);
});
