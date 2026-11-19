import db from '../config/db.js';

export async function migrateMemberAuth() {
  console.log('[Migration] Adding member authentication columns to database...');
  await db.query(`
    ALTER TABLE members ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
    ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    ALTER TABLE members ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(50) DEFAULT 'pending';
    ALTER TABLE members ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
    CREATE INDEX IF NOT EXISTS idx_members_slug ON members(LOWER(slug));
    CREATE INDEX IF NOT EXISTS idx_members_email ON members(LOWER(email));
  `);
  console.log('[Migration] Member authentication columns and indices ensured.');
}

if (process.argv[1]?.endsWith('add_member_auth_columns.js')) {
  migrateMemberAuth()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
