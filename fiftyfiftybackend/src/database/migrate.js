import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

// Ensure environment variables are loaded from the backend root
dotenv.config({ path: envPath });

import db, { checkDatabaseHealth } from '../config/db.js';

export const runMigrations = async () => {
  console.log('[Migration] Checking database connectivity...');
  const health = await checkDatabaseHealth();

  if (!health.connected) {
    console.error('[Migration Error] Database is not reachable:');
    console.error(`- Status: ${health.status}`);
    console.error(`- Target: ${health.target}`);
    if (health.errorMessage) console.error(`- Error: ${health.errorMessage}`);
    if (health.hint) console.error(`- Hint: ${health.hint}`);
    return { success: false, health };
  }

  console.log(`[Migration] Connected to database "${health.database}" at ${health.target} (${health.latencyMs}ms)`);
  console.log('[Migration] Applying schema definitions...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    // 1. Apply base schema statements
    await db.query(schemaSql);
    console.log('[Migration] Schema tables and indices ensured successfully.');

    // 2. Safe non-destructive backup table for users before modifications
    await db.query(`
      CREATE TABLE IF NOT EXISTS legacy_users_backup (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255),
        password_hash VARCHAR(255),
        full_name VARCHAR(255),
        role VARCHAR(50),
        gym_id VARCHAR(50),
        status VARCHAR(50),
        must_change_password BOOLEAN,
        invitation_status VARCHAR(50),
        invitation_sent_at TIMESTAMP WITH TIME ZONE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE,
        backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO legacy_users_backup (
        id, email, password_hash, full_name, role, gym_id, status,
        must_change_password, invitation_status, invitation_sent_at,
        last_login_at, created_at, updated_at
      )
      SELECT 
        id, email, password_hash, full_name, role, gym_id, status,
        must_change_password, invitation_status, invitation_sent_at,
        last_login_at, created_at, updated_at
      FROM users
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Migrate Super Admin account (leopardxtechnology@gmail.com) into super_admins table
    const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'leopardxtechnology@gmail.com').toLowerCase().trim();
    const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || 'SuperAdmin#2026!FiftyFifty';

    // Check if superadmin is in legacy users table to preserve password hash
    const userSuperAdmin = await db.query(
      'SELECT id, email, password_hash, full_name, role, status, last_login_at, created_at, updated_at FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [superadminEmail]
    );

    const existingSuperAdminInTable = await db.query(
      'SELECT id, email, password_hash FROM super_admins WHERE LOWER(email) = $1 LIMIT 1',
      [superadminEmail]
    );

    if (existingSuperAdminInTable.rows.length === 0) {
      if (userSuperAdmin.rows.length > 0) {
        const u = userSuperAdmin.rows[0];
        await db.query(`
          INSERT INTO super_admins (id, email, password_hash, full_name, role, status, last_login_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', $5, $6, $7, $8)
          ON CONFLICT (email) DO NOTHING;
        `, [
          u.id,
          superadminEmail,
          u.password_hash,
          u.full_name || 'Super Admin',
          u.status || 'active',
          u.last_login_at || null,
          u.created_at || new Date(),
          u.updated_at || new Date()
        ]);
        console.log(`[Migration] Migrated existing Super Admin account from users to super_admins: ${superadminEmail}`);
      } else {
        const hash = await bcrypt.hash(initialPassword, 10);
        await db.query(`
          INSERT INTO super_admins (id, email, password_hash, full_name, role, status)
          VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', 'active')
          ON CONFLICT (email) DO NOTHING;
        `, [`usr_superadmin_${Date.now()}`, superadminEmail, hash, 'Super Admin']);
        console.log(`[Migration] Super Admin account bootstrapped in super_admins: ${superadminEmail}`);
      }
    } else {
      console.log(`[Migration] Super Admin verified in super_admins: ${superadminEmail}`);
    }

    // 4. Migrate Gym Owner accounts (kondhalkarp1600@gmail.com and any other GYM_OWNERs) into gym_owners table
    const legacyOwners = await db.query(`
      SELECT id, email, password_hash, full_name, role, gym_id, status, must_change_password, invitation_status, invitation_sent_at, last_login_at, created_at, updated_at
      FROM users
      WHERE LOWER(email) = 'kondhalkarp1600@gmail.com' OR role = 'GYM_OWNER'
    `);

    for (const owner of legacyOwners.rows) {
      const normalizedOwnerEmail = owner.email.toLowerCase().trim();
      await db.query(`
        INSERT INTO gym_owners (
          id, email, password_hash, full_name, phone, role, gym_id,
          status, must_change_password, invitation_status, invitation_sent_at,
          last_login_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NULL, 'GYM_OWNER', $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          gym_id = EXCLUDED.gym_id,
          status = EXCLUDED.status,
          must_change_password = EXCLUDED.must_change_password,
          invitation_status = EXCLUDED.invitation_status,
          invitation_sent_at = EXCLUDED.invitation_sent_at,
          last_login_at = EXCLUDED.last_login_at,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        owner.id,
        normalizedOwnerEmail,
        owner.password_hash,
        owner.full_name,
        owner.gym_id,
        owner.status || 'active',
        Boolean(owner.must_change_password),
        owner.invitation_status || 'pending',
        owner.invitation_sent_at,
        owner.last_login_at,
        owner.created_at || new Date(),
        owner.updated_at || new Date()
      ]);
      console.log(`[Migration] Gym Owner preserved and synchronized in gym_owners: ${normalizedOwnerEmail}`);
    }

    // 5. Update foreign key constraints on password_reset_tokens
    await db.query(`
      ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_super_admin_fkey'
        ) THEN
          ALTER TABLE password_reset_tokens
          ADD CONSTRAINT password_reset_tokens_super_admin_fkey
          FOREIGN KEY (user_id) REFERENCES super_admins(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('[Migration] password_reset_tokens foreign key verified to super_admins.');

    // 6. Backfill slugs for existing gyms if empty
    try {
      const gymsWithoutSlug = await db.query("SELECT id, name FROM gyms WHERE slug IS NULL OR slug = ''");
      for (const g of gymsWithoutSlug.rows) {
        let baseSlug = (g.name || 'gym').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gym';
        let candidateSlug = baseSlug;
        let counter = 1;
        while (true) {
          const check = await db.query('SELECT id FROM gyms WHERE LOWER(slug) = $1 AND id != $2', [candidateSlug, g.id]);
          if (check.rows.length === 0) break;
          counter++;
          candidateSlug = `${baseSlug}-${counter}`;
        }
        await db.query('UPDATE gyms SET slug = $1 WHERE id = $2', [candidateSlug, g.id]);
        console.log(`[Migration] Assigned slug "${candidateSlug}" to gym "${g.name}" (${g.id})`);
      }
    } catch (_slugErr) {
      console.warn('[Migration] Note: Gym slug backfill skipped or column pending:', _slugErr.message);
    }

    return { success: true, health };
  } catch (err) {
    console.error('[Migration Error] Failed to execute schema statements:', err.message);
    return { success: false, error: err.message };
  }
};

// If run directly via CLI: `node src/database/migrate.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration Fatal Error]:', err);
      process.exit(1);
    });
}
