import db, { getClient } from '../config/db.js';

export async function runMigration() {
  console.log('[Migration] Creating membership_receipts table and verifying storage bucket...');

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Create membership_receipts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS membership_receipts (
        id VARCHAR(50) PRIMARY KEY,
        receipt_number VARCHAR(50) UNIQUE NOT NULL,
        gym_id VARCHAR(50) NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        member_id VARCHAR(50) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        membership_subscription_id INTEGER REFERENCES member_subscriptions(id) ON DELETE SET NULL,
        payment_id VARCHAR(50) REFERENCES payments(id) ON DELETE SET NULL,
        plan_name VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'PAYMENT_PENDING',
        receipt_type VARCHAR(50) NOT NULL DEFAULT 'REGISTRATION_ACKNOWLEDGEMENT',
        storage_path TEXT NOT NULL,
        download_url TEXT,
        issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_reference VARCHAR(100),
        payment_mode VARCHAR(50),
        pdf_generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create indices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receipts_gym_id ON membership_receipts(gym_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_member_id ON membership_receipts(member_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON membership_receipts(receipt_number);
      CREATE INDEX IF NOT EXISTS idx_receipts_payment_status ON membership_receipts(payment_status);
    `);

    // 3. Try to register private bucket 'membership-receipts' in Supabase storage schema if available
    try {
      await client.query(`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('membership-receipts', 'membership-receipts', false)
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('[Migration] Supabase storage bucket "membership-receipts" registered.');
    } catch (storageErr) {
      console.warn('[Migration Warning] storage.buckets insert notice:', storageErr.message);
    }

    await client.query('COMMIT');
    console.log('[Migration] membership_receipts table successfully created and verified.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('create_receipts_table.js')) {
  runMigration().then(() => {
    console.log('Migration finished successfully.');
    process.exit(0);
  }).catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
