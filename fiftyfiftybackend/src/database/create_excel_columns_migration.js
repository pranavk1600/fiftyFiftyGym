import db, { getClient } from '../config/db.js';

export async function runExcelColumnsMigration() {
  console.log('[Migration] Verifying and applying Excel alignment columns to members table...');

  let client = null;
  try {
    client = await getClient();
    await client.query('BEGIN');

    // 1. Add Excel columns to members table
    await client.query(`
      ALTER TABLE members ADD COLUMN IF NOT EXISTS custom_member_id VARCHAR(50);
      ALTER TABLE members ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_type VARCHAR(100) DEFAULT 'Gym + Cardio';
      ALTER TABLE members ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
    `);

    // 2. Add indices for optimal performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_members_custom_id ON members(custom_member_id);
      CREATE INDEX IF NOT EXISTS idx_members_receipt_no ON members(receipt_number);
      CREATE INDEX IF NOT EXISTS idx_members_payment_date ON members(payment_date);
    `);

    await client.query('COMMIT');
    console.log('[Migration] Excel alignment columns on members table verified successfully.');
    return { success: true };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.warn('[Migration Notice] Could not apply Excel columns to database (database may be offline):', error.message);
    return { success: false, error: error.message };
  } finally {
    if (client) {
      client.release();
    }
  }
}

if (process.argv[1]?.endsWith('create_excel_columns_migration.js')) {
  runExcelColumnsMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
