import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from '../src/config/db.js';
import { getInMemoryGyms } from '../src/services/devGymStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isConfirm = process.argv.includes('--confirm');
const isDryRun = !isConfirm || process.argv.includes('--dry-run');

async function main() {
  console.log('====================================================');
  console.log('FiftyFifty Gym — Safe Gym Owner Account Reset Utility');
  console.log('====================================================');

  // 1. Target Database & Safety Assessment
  const rawDbUrl = process.env.DATABASE_URL || '';
  let dbHost = 'unknown';
  let dbName = 'unknown';
  try {
    const parsed = new URL(rawDbUrl.replace(/^postgresql:\/\//, 'http://'));
    dbHost = parsed.host;
    dbName = parsed.pathname.replace(/^\//, '');
  } catch (_e) {}

  console.log(`Target Host:     ${dbHost}`);
  console.log(`Target Database: ${dbName}`);
  console.log(`Environment:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`Execution Mode:  ${isDryRun ? 'DRY RUN (Read-Only Preview)' : 'CONFIRM (Destructive Reset with Backup)'}`);
  console.log('----------------------------------------------------');

  if (process.env.NODE_ENV === 'production') {
    console.error('SAFETY BLOCK: Execution aborted. Cannot reset accounts in production environment.');
    process.exit(1);
  }

  let dbConnected = false;
  let existingOwners = [];
  let existingTokens = [];
  let existingGyms = [];
  let preservedCounts = {
    superAdmins: 0,
    members: 0,
    plans: 0,
    payments: 0,
    receipts: 0
  };

  try {
    const probe = await db.query('SELECT 1');
    if (probe) dbConnected = true;
  } catch (err) {
    console.warn(`[Notice] PostgreSQL connection unavailable (${err.message}).`);
    console.warn('Will check both database and local dev store.');
  }

  if (dbConnected) {
    try {
      const ownersRes = await db.query(`
        SELECT id, email, full_name, role, gym_id, status, invitation_status, created_at 
        FROM gym_owners 
        ORDER BY created_at DESC;
      `);
      existingOwners = ownersRes.rows;

      if (existingOwners.length > 0) {
        const ownerIds = existingOwners.map((o) => o.id);
        const tokensRes = await db.query(
          'SELECT id, user_id, expires_at, used_at, created_at FROM password_reset_tokens WHERE user_id = ANY($1)',
          [ownerIds]
        );
        existingTokens = tokensRes.rows;
      }

      const gymsRes = await db.query('SELECT id, name, slug, email, status, invitation_status FROM gyms ORDER BY created_at DESC');
      existingGyms = gymsRes.rows;

      const saRes = await db.query('SELECT COUNT(*) FROM super_admins');
      preservedCounts.superAdmins = parseInt(saRes.rows[0]?.count || 0, 10);

      const memRes = await db.query('SELECT COUNT(*) FROM members');
      preservedCounts.members = parseInt(memRes.rows[0]?.count || 0, 10);

      const planRes = await db.query('SELECT COUNT(*) FROM membership_plans');
      preservedCounts.plans = parseInt(planRes.rows[0]?.count || 0, 10);

      const payRes = await db.query('SELECT COUNT(*) FROM payments');
      preservedCounts.payments = parseInt(payRes.rows[0]?.count || 0, 10);

      const rcpRes = await db.query('SELECT COUNT(*) FROM membership_receipts');
      preservedCounts.receipts = parseInt(rcpRes.rows[0]?.count || 0, 10);
    } catch (queryErr) {
      console.warn('[DB Query Warning]:', queryErr.message);
    }
  }

  // Include in-memory dev accounts if present
  const devGyms = getInMemoryGyms();
  const devOwners = devGyms
    .filter((g) => g.owner_email || g.owner)
    .map((g) => ({
      id: `dev_${g.id}`,
      email: g.owner_email || g.email,
      full_name: g.owner_name || g.owner,
      role: 'GYM_OWNER',
      gym_id: g.id,
      status: g.owner_status || 'active',
      invitation_status: g.invitation_status || 'pending',
      created_at: g.created_at,
      source: 'devStore'
    }));

  console.log('\n[1] Gym Owner Accounts Identified for Reset:');
  const allIdentifiedOwners = [...existingOwners, ...devOwners.filter((d) => !existingOwners.some((e) => e.email === d.email))];

  if (allIdentifiedOwners.length === 0) {
    console.log('  No Gym Owner accounts found in database or dev store.');
  } else {
    allIdentifiedOwners.forEach((owner, idx) => {
      console.log(`  ${idx + 1}. ID: ${owner.id} | Email: ${owner.email} | Name: ${owner.full_name} | Gym: ${owner.gym_id} | Status: ${owner.status} | Invitation: ${owner.invitation_status}`);
    });
  }

  console.log('\n[2] Associated Invitation / Reset Tokens Identified:');
  console.log(`  Total obsolete tokens linked to owners: ${existingTokens.length}`);

  console.log('\n[3] Historical & Core Data Preserved (Will NOT be touched):');
  console.log(`  - Super Admin Accounts:    ${preservedCounts.superAdmins} preserved`);
  console.log(`  - Gym Records:             ${existingGyms.length || devGyms.length} preserved (invitation status will reset to pending)`);
  console.log(`  - Members:                 ${preservedCounts.members} preserved`);
  console.log(`  - Membership Plans:        ${preservedCounts.plans} preserved`);
  console.log(`  - Payment Transactions:    ${preservedCounts.payments} preserved`);
  console.log(`  - Membership Receipts:     ${preservedCounts.receipts} preserved`);

  if (isDryRun) {
    console.log('\n----------------------------------------------------');
    console.log('RESULT: DRY RUN COMPLETE.');
    console.log('No accounts or tokens were deleted.');
    console.log('To execute this reset, confirm and run with:');
    console.log('  node scripts/safe-reset-gym-owners.js --confirm');
    console.log('----------------------------------------------------');
    return;
  }

  // CONFIRM MODE: Execute Safe Reset
  console.log('\n>>> EXECUTING SAFE RESET >>>');

  // Create Backup
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-gym-owners-${timestamp}.json`);

  const backupData = {
    timestamp: new Date().toISOString(),
    databaseHost: dbHost,
    databaseName: dbName,
    gymOwners: existingOwners,
    invitationTokens: existingTokens,
    devStoreOwners: devOwners
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`[Backup Created]: ${backupFile}`);

  if (dbConnected && existingOwners.length > 0) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const ownerIds = existingOwners.map((o) => o.id);

      // Delete associated invitation / reset tokens
      const deletedTokensRes = await client.query(
        'DELETE FROM password_reset_tokens WHERE user_id = ANY($1) RETURNING id',
        [ownerIds]
      );
      console.log(`[DB Reset] Deleted ${deletedTokensRes.rowCount || 0} obsolete invitation tokens.`);

      // Delete gym owner accounts
      const deletedOwnersRes = await client.query(
        'DELETE FROM gym_owners WHERE id = ANY($1) RETURNING id, email',
        [ownerIds]
      );
      console.log(`[DB Reset] Deleted ${deletedOwnersRes.rowCount || 0} Gym Owner accounts.`);

      // Reset gym invitation status to 'pending'
      await client.query(`
        UPDATE gyms 
        SET invitation_status = 'pending', invitation_sent_at = NULL, updated_at = CURRENT_TIMESTAMP
      `);
      console.log('[DB Reset] Reset all Gyms invitation status to "pending".');

      await client.query('COMMIT');
      console.log('[DB Reset] Transaction committed successfully.');
    } catch (txErr) {
      await client.query('ROLLBACK');
      console.error('[DB Reset Error] Transaction failed and rolled back:', txErr.message);
      throw txErr;
    } finally {
      client.release();
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`SUCCESS: Reset complete. ${allIdentifiedOwners.length} Gym Owner account(s) safely reset.`);
  console.log(`Backup saved to: ${backupFile}`);
  console.log('You can now create and test new Gym Owner invitations from scratch.');
  console.log('----------------------------------------------------');
}

main().catch((err) => {
  console.error('[Fatal Error]:', err.message);
  process.exit(1);
});
