import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

// Load environment variables
dotenv.config({ path: path.join(backendRoot, '.env') });

import app from '../app.js';
import db, { checkDatabaseHealth, sanitizeDbUrl, parseDbConfig, isPlaceholderConfig } from '../config/db.js';
import {
  renderPasswordResetHtml,
  renderPasswordResetText,
  sendEmail,
  setEmailDispatcherForTest
} from '../services/email.service.js';
import { setCloudinaryUploaderForTest } from '../services/cloudinary.service.js';

// Setup ephemeral test HTTP server on an available random port
let server = null;
let serverPort = 0;

const startTestServer = () => {
  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      resolve();
    });
  });
};

const stopTestServer = () => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
};

// HTTP client helper for test requests
const request = (method, urlPath, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const jsonStr = body !== null ? JSON.stringify(body) : '';
    const reqHeaders = {
      'content-type': 'application/json',
      'accept': 'application/json',
      ...headers
    };
    if (body !== null) {
      reqHeaders['content-length'] = Buffer.byteLength(jsonStr);
    }

    const options = {
      hostname: '127.0.0.1',
      port: serverPort,
      path: urlPath,
      method,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => { resBody += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(resBody);
        } catch (_e) {
          parsed = resBody;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (jsonStr) {
      req.write(jsonStr);
    }
    req.end();
  });
};

const requestMultipart = (urlPath, fileBuffer, fileName, mimeType, fieldName = 'logo', headers = {}) => {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const head = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(head, 'utf-8'),
      fileBuffer,
      Buffer.from(tail, 'utf-8')
    ]);

    const reqHeaders = {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': body.length,
      ...headers
    };

    const options = {
      hostname: '127.0.0.1',
      port: serverPort,
      path: urlPath,
      method: 'POST',
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => { resBody += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(resBody);
        } catch (_e) {
          parsed = resBody;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
};

const runAllTests = async () => {
  console.log('====================================================');
  console.log('FiftyFifty Gym Backend & Separate Tables Verification');
  console.log('====================================================\n');

  let lastMockedEmail = null;
  setEmailDispatcherForTest((payload) => {
    lastMockedEmail = payload;
    return Promise.resolve({
      success: true,
      messageId: `mock_brevo_${Date.now()}`
    });
  });

  await startTestServer();

  let passed = 0;
  let total = 0;

  const test = async (name, fn) => {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  };

  try {
    // Test 1: Verify .gitignore contains .env
    await test('.gitignore contains .env pattern and preserves .env.example', () => {
      const gitignorePath = path.join(backendRoot, '.gitignore');
      assert.ok(fs.existsSync(gitignorePath), '.gitignore file exists');
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const lines = content.split('\n').map(l => l.trim());
      assert.ok(lines.includes('.env'), '.gitignore must list .env');
      assert.ok(lines.includes('!.env.example'), '.gitignore must preserve !.env.example');
    });

    // Test 2: Verify sanitizeDbUrl masks passwords
    await test('sanitizeDbUrl safely redacts credentials without data leakage', () => {
      const raw = 'postgresql://postgres:MySecretPass123!@db.dntnzfxcoyopsmrifdbq.supabase.co:5432/postgres';
      const sanitized = sanitizeDbUrl(raw);
      assert.ok(!sanitized.includes('MySecretPass123!'), 'Password must never appear in sanitized URL');
      assert.ok(sanitized.includes('****'), 'Sanitized URL must contain masked placeholder ****');
      assert.ok(sanitized.includes('db.dntnzfxcoyopsmrifdbq.supabase.co:5432/postgres'), 'Host and path must be preserved');
    });

    // Test 3: Password parsing with special characters & no double-encoding
    await test('parseDbConfig preserves special characters without double-encoding', () => {
      const specialUrl = 'postgresql://myuser:P%40ss%23w0rd!%252B@aws-0-ap-northeast-2.pooler.supabase.com:5432/mydb';
      const config = parseDbConfig(specialUrl);
      assert.ok(config !== null);
      assert.strictEqual(config.host, 'aws-0-ap-northeast-2.pooler.supabase.com');
      assert.strictEqual(config.port, 5432);
      assert.strictEqual(config.user, 'myuser');
      assert.strictEqual(config.database, 'mydb');
      assert.strictEqual(config.password, 'P@ss#w0rd!%2B');
      assert.strictEqual(config.ssl.rejectUnauthorized, false);
    });

    // Test 4: Placeholder detection
    await test('isPlaceholderConfig correctly detects empty or placeholder URLs', () => {
      assert.strictEqual(isPlaceholderConfig(''), true);
      assert.strictEqual(isPlaceholderConfig('postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.supabase.co:5432/postgres'), true);
      assert.strictEqual(isPlaceholderConfig('postgresql://postgres.ref:secret@aws-0-pooler.supabase.com:5432/postgres'), false);
    });

    // Test 5: Verify PORT environment variable default & loading
    await test('Server PORT is configurable and defaults to 5000', () => {
      const expectedPort = process.env.PORT || 5000;
      assert.strictEqual(Number(expectedPort), 5000, 'PORT should be 5000');
    });

    // Test 6: Verify /api/health endpoint returns 200 and healthy status
    await test('GET /api/health responds with 200 and database health report without leaking secrets', async () => {
      const res = await request('GET', '/api/health');
      assert.strictEqual(res.statusCode, 200, 'Status code must be 200');
      assert.strictEqual(res.body.success, true, 'Response must be success: true');
      assert.strictEqual(res.body.data.status, 'healthy', 'Status must be healthy');
      assert.ok(res.body.data.database, 'Must include database property');
      assert.ok(typeof res.body.data.database.connected === 'boolean', 'database.connected must be boolean');

      const target = res.body.data.database.target || '';
      assert.ok(target.includes('****') || target === 'Not configured', 'Target must have password masked with ****');
    });

    // Test 7: Verify database connection probe behavior
    await test('checkDatabaseHealth() reports accurate status without throwing unhandled errors', async () => {
      const health = await checkDatabaseHealth();
      assert.ok(typeof health === 'object' && health !== null);
      assert.ok('connected' in health);
      assert.ok('status' in health);

      const isPlaceholder = isPlaceholderConfig(process.env.DATABASE_URL);
      if (isPlaceholder) {
        assert.strictEqual(health.status, 'unconfigured', 'Should report unconfigured when password is placeholder');
        assert.strictEqual(health.connected, false, 'Should be disconnected when password is placeholder');
      } else {
        console.log(`    [Live DB Probe]: connected=${health.connected}, status=${health.status}, latency=${health.latencyMs}ms`);
      }
    });

    // Test 8: Super Admin Authentication against super_admins table
    let superAdminToken = null;
    const superadminEmail = process.env.SUPERADMIN_EMAIL || 'leopardxtechnology@gmail.com';
    const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || 'SuperAdmin#2026!FiftyFifty';

    await test('POST /api/auth/superadmin/login and /api/auth/login authenticate Super Admin from super_admins table', async () => {
      // Ensure baseline Super Admin hash in super_admins table before authentication
      const bcrypt = (await import('bcryptjs')).default;
      const baseHash = await bcrypt.hash(initialPassword, 10);
      await db.query(
        'UPDATE super_admins SET password_hash = $1, status = \'active\' WHERE LOWER(email) = $2',
        [baseHash, superadminEmail.toLowerCase()]
      );

      // 1. Correct credentials via universal login
      const res = await request('POST', '/api/auth/login', {
        email: superadminEmail,
        password: initialPassword
      });

      assert.strictEqual(res.statusCode, 200, `Login should succeed with 200 OK (got ${res.statusCode}: ${JSON.stringify(res.body)})`);
      assert.strictEqual(res.body.success, true, 'Login should have success: true');
      assert.ok(res.body.data.token, 'Should return JWT token');
      assert.strictEqual(res.body.data.user.email, superadminEmail);
      assert.ok(res.body.data.user.role === 'SUPER_ADMIN' || res.body.data.user.role === 'PLATFORM_ADMIN');
      assert.strictEqual(res.body.data.user.password_hash, undefined, 'Password hash must never be returned');

      superAdminToken = res.body.data.token;

      // 1b. Dedicated Super Admin login endpoint
      const superAdminEndpointRes = await request('POST', '/api/auth/superadmin/login', {
        email: superadminEmail,
        password: initialPassword
      });
      assert.strictEqual(superAdminEndpointRes.statusCode, 200, 'POST /api/auth/superadmin/login must succeed for Super Admin');

      // 1c. Super Admin attempting to login via Gym Admin portal must be rejected
      const crossLoginRes = await request('POST', '/api/auth/admin/login', {
        email: superadminEmail,
        password: initialPassword
      });
      assert.ok(crossLoginRes.statusCode === 401 || crossLoginRes.statusCode === 403, 'Super Admin must not authenticate on gym owner endpoint');

      // 2. Incorrect password should be rejected
      const badRes = await request('POST', '/api/auth/superadmin/login', {
        email: superadminEmail,
        password: 'wrong_password_attempt'
      });
      assert.strictEqual(badRes.statusCode, 401, 'Wrong password must return 401');
    });

    // Test 9: RBAC Authorization Protection on Super Admin Endpoints
    await test('Admin endpoints reject unauthenticated or non-admin requests', async () => {
      const unauthRes = await request('GET', '/api/admin/dashboard');
      assert.strictEqual(unauthRes.statusCode, 401, 'Unauthenticated request should return 401');

      const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
      const memberToken = jwt.sign(
        { id: 'usr_mem_1', email: 'member@fiftyfifty.com', role: 'MEMBER' },
        secret,
        { expiresIn: '1h' }
      );
      const forbiddenRes = await request('GET', '/api/admin/dashboard', null, {
        authorization: `Bearer ${memberToken}`
      });
      assert.strictEqual(forbiddenRes.statusCode, 403, 'Member token should return 403 Forbidden');
    });

    // Test 10: Super Admin Dashboard Platform Overview
    await test('GET /api/admin/dashboard returns clean platform status without gym-specific statistics', async () => {
      assert.ok(superAdminToken, 'Super Admin token must be available');
      const res = await request('GET', '/api/admin/dashboard', null, {
        authorization: `Bearer ${superAdminToken}`
      });

      assert.strictEqual(res.statusCode, 200, `Dashboard should return 200 (got ${res.statusCode}: ${JSON.stringify(res.body)})`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'operational');
      assert.ok(res.body.data.system);
      assert.ok(res.body.data.database);
      assert.strictEqual(res.body.data.totalMembers, undefined, 'Gym totalMembers must not be on dashboard');
      assert.strictEqual(res.body.data.todayAttendance, undefined, 'Gym todayAttendance must not be on dashboard');
      assert.strictEqual(res.body.data.monthlyRevenue, undefined, 'Gym monthlyRevenue must not be on dashboard');
      assert.strictEqual(res.body.data.weeklyAttendanceTrend, undefined, 'Gym attendance trend must not be on dashboard');
      assert.strictEqual(res.body.data.gym, undefined, 'Gym profile banner data must not be on dashboard');
    });

    // Test 11: Super Admin Gym Management Profile Retrieval & Persistence
    await test('GET /api/admin/gym and PUT /api/admin/gym persist gym settings', async () => {
      assert.ok(superAdminToken, 'Super Admin token must be available');

      const getRes = await request('GET', '/api/admin/gym', null, {
        authorization: `Bearer ${superAdminToken}`
      });
      assert.strictEqual(getRes.statusCode, 200);

      if (getRes.body.data) {
        assert.ok(getRes.body.data.id);
        assert.ok(getRes.body.data.name);

        const updatedPayload = {
          name: 'FiftyFifty Downtown Fitness',
          owner_name: 'Om Kolekar',
          email: 'owner@fiftyfifty.com',
          phone: '+91 98765 00001',
          address: '101 Fitness Boulevard, Downtown',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001',
          opening_hours: '06:00 AM - 10:00 PM',
          description: 'Premier state-of-the-art gym with modern equipment and expert trainers.',
          business_contact: '+91 98765 00001',
          status: 'active'
        };

        const putRes = await request('PUT', '/api/admin/gym', updatedPayload, {
          authorization: `Bearer ${superAdminToken}`
        });
        assert.strictEqual(putRes.statusCode, 200, 'PUT /api/admin/gym should succeed with 200 OK');
        assert.strictEqual(putRes.body.data.name, 'FiftyFifty Downtown Fitness');
        assert.strictEqual(putRes.body.data.city, 'Mumbai');
      } else {
        assert.strictEqual(getRes.body.data, null, 'Safe null profile returned when 0 gyms exist');
      }
    });

    // Test 12: Verify Database Schema Definition
    await test('Database schema.sql defines separate super_admins, gym_owners, and gyms tables', () => {
      const schemaPath = path.join(backendRoot, 'src/database/schema.sql');
      assert.ok(fs.existsSync(schemaPath), 'schema.sql exists');
      const sql = fs.readFileSync(schemaPath, 'utf-8');

      const expectedTables = [
        'super_admins',
        'gym_owners',
        'gyms',
        'users',
        'membership_plans',
        'members',
        'member_subscriptions',
        'attendance',
        'payments',
        'notifications',
        'password_reset_tokens'
      ];

      for (const table of expectedTables) {
        assert.ok(
          sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
          `schema.sql must define table: ${table}`
        );
      }

      assert.ok(sql.includes('opening_hours'), 'schema.sql must extend gyms with opening_hours');
      assert.ok(sql.includes('idx_gym_owners_email'), 'schema.sql must index gym_owners email');
      assert.ok(sql.includes('idx_super_admins_email'), 'schema.sql must index super_admins email');
    });

    // Test 13: Brevo Email Templates
    await test('Brevo email service renders branded templates and handles error boundaries safely', async () => {
      const resetUrl = 'https://fiftyfiftygym.com/reset-password?token=sample_test_token_123';
      const html = renderPasswordResetHtml({ resetUrl, recipientName: 'Super Admin', expiryMinutes: 15 });
      assert.ok(html.includes('FIFTYFIFTY'), 'Email HTML must include FIFTYFIFTY branding');
      assert.ok(html.includes(resetUrl), 'Email HTML must embed the reset URL');
      assert.ok(html.includes('15 minutes'), 'Email HTML must mention the 15-minute token expiry');

      const text = renderPasswordResetText({ resetUrl, recipientName: 'Super Admin', expiryMinutes: 15 });
      assert.ok(text.includes(resetUrl), 'Text template must include the reset URL');
      assert.ok(text.includes('15 minutes'), 'Text template must mention expiry');

      await assert.rejects(
        async () => sendEmail({ to: '', subject: 'Test' }),
        /Recipient email is required/
      );

      await assert.rejects(
        async () => sendEmail({ to: 'admin@fiftyfifty.com', subject: '' }),
        /Email subject is required/
      );
    });

    // Test 14: Forgot Password Input Validation
    await test('POST /api/auth/forgot-password validates input and prevents user enumeration', async () => {
      const emptyRes = await request('POST', '/api/auth/forgot-password', {});
      assert.strictEqual(emptyRes.statusCode, 400, 'Missing email should return 400');

      const invalidRes = await request('POST', '/api/auth/forgot-password', { email: 'not-an-email' });
      assert.strictEqual(invalidRes.statusCode, 400, 'Invalid email format should return 400');

      const nonExistentRes = await request('POST', '/api/auth/forgot-password', {
        email: 'nobody_random_xyz@fiftyfiftygym.com'
      });
      assert.strictEqual(nonExistentRes.statusCode, 200, 'Non-existent email must return 200 generic message');
      assert.strictEqual(nonExistentRes.body.success, true);
      assert.ok(
        nonExistentRes.body.data.message.includes('password reset instructions have been sent'),
        'Generic message must not leak whether account exists'
      );
    });

    // Test 15: Forgot Password Token Generation in super_admins
    await test('POST /api/auth/forgot-password generates token record for active Super Admin in super_admins', async () => {
      const res = await request('POST', '/api/auth/forgot-password', {
        email: superadminEmail
      });
      assert.strictEqual(res.statusCode, 200, 'Super admin forgot-password must return 200');
      assert.strictEqual(res.body.success, true);

      // Verify token record in database for super_admins
      const saRes = await db.query('SELECT id FROM super_admins WHERE LOWER(email) = $1', [superadminEmail.toLowerCase()]);
      assert.ok(saRes.rows.length > 0, 'Super Admin user must exist in super_admins table');
      const saId = saRes.rows[0].id;

      const tokenRes = await db.query(
        'SELECT id, token_hash, expires_at, used_at FROM password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [saId]
      );
      assert.ok(tokenRes.rows.length > 0, 'A password_reset_tokens record must exist for the Super Admin');
      assert.strictEqual(tokenRes.rows[0].used_at, null, 'Newly created token must not be marked used');
      assert.ok(new Date(tokenRes.rows[0].expires_at) > new Date(), 'Token expiration must be in the future');
    });

    // Test 16: Verify Reset Token Endpoint
    let testRawToken = null;
    await test('GET /api/auth/verify-reset-token validates tokens without consuming them', async () => {
      const missingRes = await request('GET', '/api/auth/verify-reset-token');
      assert.strictEqual(missingRes.statusCode, 400, 'Missing token parameter must return 400');

      const invalidRes = await request('GET', '/api/auth/verify-reset-token?token=non_existent_token_hex_1234567890');
      assert.strictEqual(invalidRes.statusCode, 400, 'Non-existent token must return 400');

      const saRes = await db.query('SELECT id FROM super_admins WHERE LOWER(email) = $1', [superadminEmail.toLowerCase()]);
      const saId = saRes.rows[0].id;

      testRawToken = crypto.randomBytes(32).toString('hex');
      const testTokenHash = crypto.createHash('sha256').update(testRawToken).digest('hex');
      const testExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [saId, testTokenHash, testExpiresAt]
      );

      const validRes = await request('GET', `/api/auth/verify-reset-token?token=${testRawToken}`);
      assert.strictEqual(validRes.statusCode, 200, 'Valid token must return 200');
      assert.strictEqual(validRes.body.success, true);
      assert.strictEqual(validRes.body.data.valid, true);
    });

    // Test 17: Complete Super Admin Password Reset & Invalidation
    await test('POST /api/auth/reset-password updates super_admins, enforces single-use, and enables new login', async () => {
      assert.ok(testRawToken, 'Test raw token must be initialized from previous step');
      const temporaryNewPassword = 'SuperAdmin#Updated2026!Pass';

      const shortPassRes = await request('POST', '/api/auth/reset-password', {
        token: testRawToken,
        newPassword: 'short'
      });
      assert.strictEqual(shortPassRes.statusCode, 400, 'Password < 8 characters must be rejected with 400');

      const resetRes = await request('POST', '/api/auth/reset-password', {
        token: testRawToken,
        newPassword: temporaryNewPassword
      });
      assert.strictEqual(resetRes.statusCode, 200, 'Password reset must succeed with 200 OK');
      assert.strictEqual(resetRes.body.success, true);

      const reuseRes = await request('POST', '/api/auth/reset-password', {
        token: testRawToken,
        newPassword: 'AnotherPassword#2026!'
      });
      assert.strictEqual(reuseRes.statusCode, 400, 'Re-using a consumed token must return 400');

      const checkRes = await request('GET', `/api/auth/verify-reset-token?token=${testRawToken}`);
      assert.strictEqual(checkRes.statusCode, 400, 'Used token must be rejected by verify-reset-token');

      const oldLoginRes = await request('POST', '/api/auth/superadmin/login', {
        email: superadminEmail,
        password: initialPassword
      });
      assert.strictEqual(oldLoginRes.statusCode, 401, 'Old password must no longer authenticate');

      const newLoginRes = await request('POST', '/api/auth/superadmin/login', {
        email: superadminEmail,
        password: temporaryNewPassword
      });
      assert.strictEqual(newLoginRes.statusCode, 200, 'New password must authenticate successfully');
      assert.ok(newLoginRes.body.data.token, 'Must receive signed JWT with new password');

      // Restore original password
      const bcrypt = (await import('bcryptjs')).default;
      const originalHash = await bcrypt.hash(initialPassword, 10);
      await db.query(
        'UPDATE super_admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = $2',
        [originalHash, superadminEmail.toLowerCase()]
      );

      const restoredLoginRes = await request('POST', '/api/auth/superadmin/login', {
        email: superadminEmail,
        password: initialPassword
      });
      assert.strictEqual(restoredLoginRes.statusCode, 200, 'Original credentials must authenticate after test cleanup');
    });

    // Test 18: POST /api/admin/gyms validation & duplicate email prevention
    await test('POST /api/admin/gyms rejects invalid inputs, unauthorized callers, and duplicate owner emails', async () => {
      const unauthRes = await request('POST', '/api/admin/gyms', { name: 'Test Gym' });
      assert.strictEqual(unauthRes.statusCode, 401, 'Unauthenticated request must return 401');

      const missingNameRes = await request('POST', '/api/admin/gyms', {
        owner_name: 'Sameer Varma',
        email: 'sameer@test.com',
        phone: '+91 99999 11111'
      }, { authorization: `Bearer ${superAdminToken}` });
      assert.strictEqual(missingNameRes.statusCode, 400, 'Missing gym name must return 400');

      const missingOwnerRes = await request('POST', '/api/admin/gyms', {
        name: 'Iron Forge Gym',
        email: 'sameer@test.com',
        phone: '+91 99999 11111'
      }, { authorization: `Bearer ${superAdminToken}` });
      assert.strictEqual(missingOwnerRes.statusCode, 400, 'Missing owner name must return 400');

      const invalidEmailRes = await request('POST', '/api/admin/gyms', {
        name: 'Iron Forge Gym',
        owner_name: 'Sameer Varma',
        email: 'not-an-email',
        phone: '+91 99999 11111'
      }, { authorization: `Bearer ${superAdminToken}` });
      assert.strictEqual(invalidEmailRes.statusCode, 400, 'Invalid email format must return 400');

      // Duplicate owner email against existing Super Admin account
      const duplicateRes = await request('POST', '/api/admin/gyms', {
        name: 'Another Gym Branch',
        owner_name: 'Platform Admin',
        email: superadminEmail,
        phone: '+91 98765 00001'
      }, { authorization: `Bearer ${superAdminToken}` });
      assert.strictEqual(duplicateRes.statusCode, 409, 'Duplicate owner email must return 409 Conflict');
    });

    // Test 19: POST /api/admin/gyms provisions gym & gym_owners in transaction
    let createdGymId = null;
    let createdOwnerUserId = null;
    let createdOwnerEmail = `newowner_${Date.now()}@fiftyfifty-test.com`;
    let temporaryPasswordCaptured = null;

    await test('POST /api/admin/gyms atomically provisions gym and gym_owners account, hashing password and triggering Brevo email', async () => {
      lastMockedEmail = null;

      const payload = {
        name: 'FiftyFifty Bandra Elite',
        owner_name: 'Vikramaditya Roy',
        email: createdOwnerEmail,
        phone: '+91 98111 99999',
        address: '42 Linking Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400050',
        opening_hours: '05:30 AM - 11:00 PM',
        description: 'Elite luxury fitness hub in Bandra West'
      };

      const res = await request('POST', '/api/admin/gyms', payload, {
        authorization: `Bearer ${superAdminToken}`
      });

      assert.strictEqual(res.statusCode, 201, `Create gym must return 201 Created (got ${res.statusCode}: ${JSON.stringify(res.body)})`);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.gym.id, 'Response must include created gym ID');
      assert.ok(res.body.data.owner.id, 'Response must include created owner ID');
      assert.strictEqual(res.body.data.invitationStatus, 'invitation_sent');
      assert.strictEqual(res.body.data.emailDelivered, true);
      assert.strictEqual(res.body.data.owner.password_hash, undefined, 'Password hash must never be in response');

      createdGymId = res.body.data.gym.id;
      createdOwnerUserId = res.body.data.owner.id;

      // Verify records in gyms table
      const gymDb = await db.query('SELECT * FROM gyms WHERE id = $1', [createdGymId]);
      assert.strictEqual(gymDb.rows.length, 1, 'Gym must exist in gyms table');
      assert.strictEqual(gymDb.rows[0].name, 'FiftyFifty Bandra Elite');
      assert.strictEqual(gymDb.rows[0].invitation_status, 'invitation_sent');

      // Verify records in gym_owners table (NOT users)
      const ownerDb = await db.query('SELECT * FROM gym_owners WHERE id = $1', [createdOwnerUserId]);
      assert.strictEqual(ownerDb.rows.length, 1, 'Owner user must exist in gym_owners table');
      assert.strictEqual(ownerDb.rows[0].email, createdOwnerEmail.toLowerCase());
      assert.strictEqual(ownerDb.rows[0].role, 'GYM_OWNER');
      assert.strictEqual(ownerDb.rows[0].gym_id, createdGymId);
      assert.strictEqual(ownerDb.rows[0].must_change_password, true);
      assert.ok(ownerDb.rows[0].password_hash.startsWith('$2'), 'Password must be hashed with bcrypt');

      // Verify Brevo mock received invitation
      assert.ok(lastMockedEmail !== null, 'Brevo email dispatcher must have been called');
      assert.strictEqual(lastMockedEmail.to, createdOwnerEmail.toLowerCase());
      assert.ok(lastMockedEmail.subject.includes('FiftyFifty Bandra Elite'));
      assert.ok(lastMockedEmail.htmlContent.includes('/admin/login'), 'HTML invitation email must link specifically to /admin/login');
      assert.ok(lastMockedEmail.textContent.includes('/admin/login'), 'Plain-text invitation email must link specifically to /admin/login');

      const tempPassMatch = lastMockedEmail.textContent.match(/Temporary Password: (Gym#[^\s]+)/);
      assert.ok(tempPassMatch, 'Temporary password must be embedded in the invitation email');
      temporaryPasswordCaptured = tempPassMatch[1];
    });

    // Test 20: GET /api/admin/gyms listing with owner & invitation status
    await test('GET /api/admin/gyms lists all gyms with owner metadata from gym_owners', async () => {
      const res = await request('GET', '/api/admin/gyms', null, {
        authorization: `Bearer ${superAdminToken}`
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data), 'Data must be an array of gyms');

      const found = res.body.data.find((g) => g.id === createdGymId);
      assert.ok(found, 'Newly created gym must be listed in GET /api/admin/gyms');
      assert.strictEqual(found.owner_email, createdOwnerEmail.toLowerCase());
      assert.strictEqual(found.displayInvitationStatus, 'password_setup_pending');
    });

    // Test 21: Brevo failure handling & Resend invitation
    await test('POST /api/admin/gyms/:id/resend-invitation generates new temporary password and resends email without duplicating accounts', async () => {
      assert.ok(createdGymId);

      setEmailDispatcherForTest(() => Promise.resolve({ success: false, error: 'Simulated Brevo network failure' }));

      const failedRes = await request('POST', `/api/admin/gyms/${createdGymId}/resend-invitation`, null, {
        authorization: `Bearer ${superAdminToken}`
      });
      assert.strictEqual(failedRes.statusCode, 200);
      assert.strictEqual(failedRes.body.data.invitationStatus, 'invitation_failed');
      assert.strictEqual(failedRes.body.data.emailDelivered, false);

      const gymDbFailed = await db.query('SELECT invitation_status FROM gyms WHERE id = $1', [createdGymId]);
      assert.strictEqual(gymDbFailed.rows[0].invitation_status, 'invitation_failed');

      setEmailDispatcherForTest((payload) => {
        lastMockedEmail = payload;
        return Promise.resolve({ success: true, messageId: `mock_resend_${Date.now()}` });
      });

      const retryRes = await request('POST', `/api/admin/gyms/${createdGymId}/resend-invitation`, null, {
        authorization: `Bearer ${superAdminToken}`
      });
      assert.strictEqual(retryRes.statusCode, 200);
      assert.strictEqual(retryRes.body.data.invitationStatus, 'invitation_sent');
      assert.strictEqual(retryRes.body.data.emailDelivered, true);

      // Confirm no duplicate accounts exist in gym_owners
      const countRes = await db.query('SELECT COUNT(*) FROM gym_owners WHERE gym_id = $1', [createdGymId]);
      assert.strictEqual(parseInt(countRes.rows[0].count, 10), 1, 'Resending must never duplicate gym owner accounts');

      const tempPassMatch = lastMockedEmail.textContent.match(/Temporary Password: (Gym#[^\s]+)/);
      assert.ok(tempPassMatch);
      temporaryPasswordCaptured = tempPassMatch[1];
    });

    // Test 22: Gym Owner authentication against gym_owners table
    let ownerToken = null;
    await test('Gym Owner authenticates with temporary credentials against gym_owners table', async () => {
      assert.ok(temporaryPasswordCaptured);

      const res = await request('POST', '/api/auth/admin/login', {
        email: createdOwnerEmail,
        password: temporaryPasswordCaptured
      });

      assert.strictEqual(res.statusCode, 200, `Owner login should succeed with 200 (got ${res.statusCode}: ${JSON.stringify(res.body)})`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user.role, 'GYM_OWNER');
      assert.strictEqual(res.body.data.user.gymId, createdGymId);
      assert.strictEqual(res.body.data.user.mustChangePassword, true);
      assert.ok(res.body.data.token, 'Must return signed JWT token');

      ownerToken = res.body.data.token;

      // Gym Owner attempting to authenticate via Super Admin endpoint must be rejected
      const crossOwnerRes = await request('POST', '/api/auth/superadmin/login', {
        email: createdOwnerEmail,
        password: temporaryPasswordCaptured
      });
      assert.strictEqual(crossOwnerRes.statusCode, 401, 'Gym Owner must be rejected from Super Admin login endpoint');
    });

    // Test 23: Gym Owner Permanent Password Setup
    await test('Gym Owner sets permanent password via POST /api/auth/setup-password', async () => {
      assert.ok(ownerToken);
      const newPermanentPass = 'Owner#PermanentSecure2026!';

      const setupRes = await request('POST', '/api/auth/setup-password', {
        newPassword: newPermanentPass
      }, {
        authorization: `Bearer ${ownerToken}`
      });

      assert.strictEqual(setupRes.statusCode, 200, 'Password setup must succeed');
      assert.strictEqual(setupRes.body.success, true);

      // Verify must_change_password in DB is now false
      const ownerCheck = await db.query('SELECT must_change_password FROM gym_owners WHERE id = $1', [createdOwnerUserId]);
      assert.strictEqual(ownerCheck.rows[0].must_change_password, false);

      // Authenticate with new permanent password
      const newLoginRes = await request('POST', '/api/auth/admin/login', {
        email: createdOwnerEmail,
        password: newPermanentPass
      });
      assert.strictEqual(newLoginRes.statusCode, 200, 'Must authenticate with permanent password');
      assert.strictEqual(newLoginRes.body.data.user.mustChangePassword, false);
      ownerToken = newLoginRes.body.data.token;
    });

    // Test 24: Correct Account Table Separation Verification
    await test('Account table separation guarantees Super Admins and Gym Owners never cross-authenticate', async () => {
      // 1. Super Admin is in super_admins, not gym_owners
      const saInOwners = await db.query('SELECT id FROM gym_owners WHERE LOWER(email) = $1', [superadminEmail.toLowerCase()]);
      assert.strictEqual(saInOwners.rows.length, 0, 'Super Admin must NOT exist in gym_owners table');

      // 2. Gym Owner is in gym_owners, not super_admins
      const ownerInSA = await db.query('SELECT id FROM super_admins WHERE LOWER(email) = $1', [createdOwnerEmail.toLowerCase()]);
      assert.strictEqual(ownerInSA.rows.length, 0, 'Gym Owner must NOT exist in super_admins table');
    });

    // Test 25: Existing Data Preservation Verification
    await test('Existing Gym Owner (kondhalkarp1600@gmail.com) and Super Admin (leopardxtechnology@gmail.com) are preserved', async () => {
      // Preserved Gym Owner
      const kondhalkarRes = await db.query("SELECT * FROM gym_owners WHERE LOWER(email) = 'kondhalkarp1600@gmail.com'");
      assert.strictEqual(kondhalkarRes.rows.length, 1, 'kondhalkarp1600@gmail.com must exist in gym_owners');
      assert.strictEqual(kondhalkarRes.rows[0].gym_id, 'gym_1793194259833_26bcef');
      assert.ok(kondhalkarRes.rows[0].password_hash, 'kondhalkarp1600@gmail.com must have valid password hash');

      // Preserved Super Admin
      const leopardxRes = await db.query("SELECT * FROM super_admins WHERE LOWER(email) = 'leopardxtechnology@gmail.com'");
      assert.strictEqual(leopardxRes.rows.length, 1, 'leopardxtechnology@gmail.com must exist in super_admins');
      assert.ok(leopardxRes.rows[0].password_hash, 'leopardxtechnology@gmail.com must have valid password hash');

      // Preserved users table
      const usersTableCheck = await db.query("SELECT COUNT(*) FROM users");
      assert.ok(parseInt(usersTableCheck.rows[0].count, 10) >= 1, 'users table must be preserved');
    });

    // Test 26: Gym-level data isolation
    await test('Gym Owner is strictly isolated to assigned gym and blocked from cross-gym access', async () => {
      assert.ok(ownerToken);

      const selfRes = await request('GET', '/api/owner/dashboard', null, {
        authorization: `Bearer ${ownerToken}`
      });
      assert.strictEqual(selfRes.statusCode, 200);
      assert.strictEqual(selfRes.body.data.gymId, createdGymId);

      const foreignRes = await request('GET', '/api/owner/dashboard', null, {
        authorization: `Bearer ${ownerToken}`,
        'x-gym-id': 'gym_alpha_1'
      });
      assert.strictEqual(foreignRes.statusCode, 403, 'Cross-gym query must be blocked with 403 Forbidden');
      assert.ok(
        foreignRes.body.message.includes('Access denied') || foreignRes.body.message.includes('another gym'),
        'Forbidden response must explain tenant isolation boundary'
      );

      // Cleanup created test gym & owner from database
      await db.query('DELETE FROM gym_owners WHERE gym_id = $1', [createdGymId]);
      await db.query('DELETE FROM gyms WHERE id = $1', [createdGymId]);
    });

    // Test 27: Logo upload unauthorized check
    await test('Logo upload rejects unauthenticated requests with 401', async () => {
      const dummyPng = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
      const res = await requestMultipart('/api/admin/gyms/upload-logo', dummyPng, 'logo.png', 'image/png');
      assert.strictEqual(res.statusCode, 401);
    });

    // Test 28: Logo upload role authorization check
    await test('Logo upload rejects non-admin users with 403', async () => {
      assert.ok(ownerToken);
      const dummyPng = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
      const res = await requestMultipart('/api/admin/gyms/upload-logo', dummyPng, 'logo.png', 'image/png', 'logo', {
        authorization: `Bearer ${ownerToken}`
      });
      assert.strictEqual(res.statusCode, 403);
    });

    // Test 29: Logo upload file type validation check
    await test('Logo upload rejects invalid file formats with 400', async () => {
      const textBuffer = Buffer.from('This is not an image');
      const res = await requestMultipart('/api/admin/gyms/upload-logo', textBuffer, 'test.txt', 'text/plain', 'logo', {
        authorization: `Bearer ${superAdminToken}`
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('Invalid file format') || res.body.message.includes('Only PNG'));
    });

    // Test 30: Successful logo upload through Cloudinary service mock
    await test('Logo upload validates and uploads buffer to Cloudinary returning secure_url', async () => {
      let mockUploaderInvoked = false;
      setCloudinaryUploaderForTest(async (buf, opts) => {
        mockUploaderInvoked = true;
        assert.ok(Buffer.isBuffer(buf));
        assert.strictEqual(opts.folder, 'fiftyfiftygym/logos');
        return {
          secure_url: 'https://res.cloudinary.com/testcloud/image/upload/v1234567890/fiftyfiftygym/logos/test_gym_logo.png',
          public_id: 'fiftyfiftygym/logos/test_gym_logo',
          format: 'png',
          bytes: buf.length
        };
      });

      const validPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d420000000049454e44ae426082', 'hex');
      const res = await requestMultipart('/api/admin/gyms/upload-logo', validPng, 'gym_logo.png', 'image/png', 'logo', {
        authorization: `Bearer ${superAdminToken}`
      });

      assert.strictEqual(res.statusCode, 200, `Upload should succeed with 200 (got ${res.statusCode}: ${JSON.stringify(res.body)})`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(mockUploaderInvoked, true, 'Custom test uploader must be invoked');
      assert.ok(res.body.data.secure_url.includes('cloudinary.com'));
      assert.strictEqual(res.body.data.format, 'png');

      setCloudinaryUploaderForTest(null);
    });

    console.log(`\nResults: ${passed}/${total} tests passed.\n`);

    if (passed !== total) {
      process.exit(1);
    }
    process.exit(0);
  } finally {
    await stopTestServer();
  }
};

runAllTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
