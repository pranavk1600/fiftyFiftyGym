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
    await db.query(schemaSql);
    console.log('[Migration] Schema tables and indices ensured successfully.');

    // Bootstrap Super Admin accounts from secure environment variables
    const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'leopardxtechnology@gmail.com').toLowerCase().trim();
    const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || 'SuperAdmin#2026!FiftyFifty';

    const userCheck = await db.query('SELECT id, email, password_hash, role FROM users WHERE LOWER(email) = $1', [superadminEmail]);
    if (userCheck.rows.length === 0) {
      const hash = await bcrypt.hash(initialPassword, 10);
      await db.query(`
        INSERT INTO users (id, email, password_hash, full_name, role, gym_id, status)
        VALUES ($1, $2, $3, $4, $5, NULL, 'active')
      `, [`usr_superadmin_${Date.now()}`, superadminEmail, hash, 'Super Admin', 'SUPER_ADMIN']);
      console.log(`[Migration] Super Admin account created successfully for: ${superadminEmail}`);
    } else {
      await db.query(`
        UPDATE users SET role = 'SUPER_ADMIN', status = 'active' WHERE LOWER(email) = $1
      `, [superadminEmail]);
      console.log(`[Migration] Existing Super Admin account confirmed for: ${superadminEmail}`);
    }

    // Optional legacy fallback platform admin account
    const fallbackAdminCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', ['admin@fiftyfifty.com']);
    if (fallbackAdminCheck.rows.length === 0) {
      const adminHash = await bcrypt.hash('admin123', 10);
      await db.query(`
        INSERT INTO users (id, email, password_hash, full_name, role, gym_id, status)
        VALUES ('usr_admin_1', 'admin@fiftyfifty.com', $1, 'Platform Super Admin', 'SUPER_ADMIN', NULL, 'active')
        ON CONFLICT (email) DO NOTHING;
      `, [adminHash]);
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
