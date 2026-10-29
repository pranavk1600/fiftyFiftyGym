-- ==============================================================================
-- FIFTYFIFTY GYM MANAGEMENT SOFTWARE — POSTGRESQL SCHEMA (SUPABASE)
-- Safe, non-destructive, idempotent DDL (CREATE TABLE IF NOT EXISTS)
-- ==============================================================================

-- 1. SUPER ADMINS TABLE (Super Admin Accounts Only)
CREATE TABLE IF NOT EXISTS super_admins (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(LOWER(email));

-- 2. GYM TENANTS TABLE (Gym Profile Data)
CREATE TABLE IF NOT EXISTS gyms (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Safe, non-destructive extensions for gym profile and settings
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(100);
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS business_contact VARCHAR(100);
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gyms_slug ON gyms(LOWER(slug));

-- 3. GYM OWNERS TABLE (Gym Owner Accounts Only)
CREATE TABLE IF NOT EXISTS gym_owners (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'GYM_OWNER',
  gym_id VARCHAR(50) REFERENCES gyms(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  must_change_password BOOLEAN DEFAULT false,
  invitation_status VARCHAR(50) DEFAULT 'pending',
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gym_owners_email ON gym_owners(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_gym_owners_gym_id ON gym_owners(gym_id);

-- 4. USERS & RBAC ROLES TABLE (Preserved for compatibility and Members)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  gym_id VARCHAR(50) REFERENCES gyms(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_gym_id ON users(gym_id);

-- 5. MEMBERSHIP PLANS TABLE
CREATE TABLE IF NOT EXISTS membership_plans (
  id SERIAL PRIMARY KEY,
  gym_id VARCHAR(50) REFERENCES gyms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration_days INTEGER NOT NULL,
  duration_label VARCHAR(100),
  price NUMERIC(10, 2) NOT NULL,
  features TEXT[] DEFAULT '{}',
  is_popular BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plans_gym_id ON membership_plans(gym_id);

-- 6. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(50) PRIMARY KEY,
  gym_id VARCHAR(50) REFERENCES gyms(id) ON DELETE CASCADE,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  current_plan_id INTEGER REFERENCES membership_plans(id) ON DELETE SET NULL,
  current_plan_name VARCHAR(255),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  emergency_contact VARCHAR(100),
  total_visits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- 7. MEMBER SUBSCRIPTIONS HISTORY TABLE
CREATE TABLE IF NOT EXISTS member_subscriptions (
  id SERIAL PRIMARY KEY,
  member_id VARCHAR(50) REFERENCES members(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES membership_plans(id) ON DELETE RESTRICT,
  gym_id VARCHAR(50) REFERENCES gyms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount_paid NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON member_subscriptions(member_id);

-- 8. ATTENDANCE CHECK-IN LOGS TABLE
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  gym_id VARCHAR(50) REFERENCES gyms(id) ON DELETE CASCADE,
  member_id VARCHAR(50) REFERENCES members(id) ON DELETE CASCADE,
  member_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  plan_name VARCHAR(255),
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  check_out_time TIMESTAMP WITH TIME ZONE,
  session_focus VARCHAR(255),
  status VARCHAR(50) DEFAULT 'IN_GYM',
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_attendance_gym_id ON attendance(gym_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);

-- 9. PAYMENTS & TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(50) PRIMARY KEY,
  gym_id VARCHAR(50) REFERENCES gyms(id) ON DELETE CASCADE,
  member_id VARCHAR(50) REFERENCES members(id) ON DELETE SET NULL,
  member_name VARCHAR(255) NOT NULL,
  plan_name VARCHAR(255),
  amount NUMERIC(10, 2) NOT NULL,
  mode VARCHAR(50) NOT NULL DEFAULT 'UPI',
  status VARCHAR(50) DEFAULT 'paid',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_gym_id ON payments(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);

-- 10. OPERATIONAL NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  gym_id VARCHAR(50) REFERENCES gyms(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  level VARCHAR(50) DEFAULT 'info',
  is_unread BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_gym_id ON notifications(gym_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(gym_id, is_unread);

-- 11. PASSWORD RESET TOKENS TABLE (Secure Single-Use Cryptographic Tokens for Super Admin)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_user_id ON password_reset_tokens(user_id);
