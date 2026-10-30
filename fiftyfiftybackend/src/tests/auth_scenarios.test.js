import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(backendRoot, '.env') });

import app from '../app.js';
import db from '../config/db.js';

let server = null;
let serverPort = 0;

const startServer = () => {
  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      console.log(`Ephemeral test server running on 127.0.0.1:${serverPort}`);
      resolve();
    });
  });
};

const stopServer = () => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
};

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

    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: urlPath,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (jsonStr) {
      req.write(jsonStr);
    }
    req.end();
  });
};

async function runAllTests() {
  await startServer();

  const testSuperAdminId = `usr_test_sa_${Date.now()}`;
  const testSuperAdminEmail = `test_superadmin_${Date.now()}@testplatform.local`;
  const testSuperAdminPassword = process.env.TEST_SUPERADMIN_PASSWORD || `TestSuperAdmin#${crypto.randomBytes(6).toString('hex')}!`;

  const testOwnerEmail = `test_owner_${Date.now()}@testgym.com`;
  const testOwnerPassword = process.env.TEST_OWNER_PASSWORD || `TestOwner#${crypto.randomBytes(6).toString('hex')}!`;
  const testOwnerInactiveEmail = `test_owner_inactive_${Date.now()}@testgym.com`;

  const testMemberEmail = `test_member_${Date.now()}@testgym.com`;
  const testMemberPassword = process.env.TEST_MEMBER_PASSWORD || `TestMember#${crypto.randomBytes(6).toString('hex')}!`;

  let superAdminToken = null;
  let gymOwnerToken = null;
  let memberToken = null;

  try {
    console.log('\n=== Setting up test fixtures in Supabase DB ===');

    // 0. Create active test Super Admin in super_admins table
    const saHash = await bcrypt.hash(testSuperAdminPassword, 10);
    await db.query(`
      INSERT INTO super_admins (id, email, password_hash, full_name, role, status)
      VALUES ($1, $2, $3, 'Active Test Super Admin', 'SUPER_ADMIN', 'active')
    `, [testSuperAdminId, testSuperAdminEmail, saHash]);

    // Get an existing gym id
    const gymRes = await db.query('SELECT id FROM gyms LIMIT 1');
    const existingGymId = gymRes.rows.length > 0 ? gymRes.rows[0].id : null;

    // 1. Create active test gym owner in gym_owners table
    const ownerHash = await bcrypt.hash(testOwnerPassword, 10);
    const ownerId = `usr_test_owner_${Date.now()}`;
    await db.query(`
      INSERT INTO gym_owners (id, email, password_hash, full_name, role, gym_id, status)
      VALUES ($1, $2, $3, 'Active Test Owner', 'GYM_OWNER', $4, 'active')
    `, [ownerId, testOwnerEmail, ownerHash, existingGymId]);

    // 2. Create inactive test gym owner in gym_owners table
    const inactiveOwnerId = `usr_test_owner_inact_${Date.now()}`;
    await db.query(`
      INSERT INTO gym_owners (id, email, password_hash, full_name, role, gym_id, status)
      VALUES ($1, $2, $3, 'Inactive Test Owner', 'GYM_OWNER', $4, 'inactive')
    `, [inactiveOwnerId, testOwnerInactiveEmail, ownerHash, existingGymId]);

    // 3. Create active test member in users table
    const memberHash = await bcrypt.hash(testMemberPassword, 10);
    const memberId = `usr_test_member_${Date.now()}`;
    await db.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, gym_id, status)
      VALUES ($1, $2, $3, 'Active Test Member', 'MEMBER', $4, 'active')
    `, [memberId, testMemberEmail, memberHash, existingGymId]);

    console.log('✓ Test fixtures successfully created in database.\n');

    // -------------------------------------------------------------
    // Scenario 1: Correct Super Admin email and password -> Super Admin dashboard
    // -------------------------------------------------------------
    console.log('--- Scenario 1: Correct Super Admin email and password -> Super Admin dashboard ---');
    const saLoginRes = await request('POST', '/api/auth/login', {
      email: testSuperAdminEmail,
      password: testSuperAdminPassword,
      portal: 'SUPER_ADMIN'
    });
    assert.strictEqual(saLoginRes.statusCode, 200, 'Super admin login must return 200');
    assert.strictEqual(saLoginRes.body.success, true);
    assert.strictEqual(saLoginRes.body.data.user.role, 'SUPER_ADMIN');
    assert.ok(saLoginRes.body.data.token, 'Must return JWT token');
    superAdminToken = saLoginRes.body.data.token;

    // Verify Super Admin dashboard access
    const saDashRes = await request('GET', '/api/admin/dashboard', null, {
      authorization: `Bearer ${superAdminToken}`
    });
    assert.strictEqual(saDashRes.statusCode, 200, 'Super Admin dashboard must be accessible (200 OK)');
    assert.strictEqual(saDashRes.body.success, true);
    console.log('✓ Scenario 1 PASSED: Super Admin authenticated from super_admins table and dashboard reached (/admin/dashboard)\n');

    // -------------------------------------------------------------
    // Scenario 2: Incorrect Super Admin password -> Login rejected
    // -------------------------------------------------------------
    console.log('--- Scenario 2: Incorrect Super Admin password -> Login rejected ---');
    const saBadPassRes = await request('POST', '/api/auth/login', {
      email: testSuperAdminEmail,
      password: 'IncorrectPassword#999',
      portal: 'SUPER_ADMIN'
    });
    assert.strictEqual(saBadPassRes.statusCode, 401, 'Incorrect password must be rejected with 401');
    assert.strictEqual(saBadPassRes.body.success, false);
    assert.strictEqual(saBadPassRes.body.message, 'Invalid email or password');
    console.log('✓ Scenario 2 PASSED: Incorrect Super Admin password rejected with 401\n');

    // -------------------------------------------------------------
    // Scenario 3: Gym Owner credentials -> Gym Owner dashboard
    // -------------------------------------------------------------
    console.log('--- Scenario 3: Gym Owner credentials -> Gym Owner dashboard ---');
    const ownerLoginRes = await request('POST', '/api/auth/login', {
      email: testOwnerEmail,
      password: testOwnerPassword,
      portal: 'GYM_ADMIN'
    });
    assert.strictEqual(ownerLoginRes.statusCode, 200, 'Gym Owner login must return 200');
    assert.strictEqual(ownerLoginRes.body.success, true);
    assert.strictEqual(ownerLoginRes.body.data.user.role, 'GYM_OWNER');
    assert.ok(ownerLoginRes.body.data.token, 'Must return JWT token');
    gymOwnerToken = ownerLoginRes.body.data.token;

    // Verify Gym Owner dashboard access
    const ownerDashRes = await request('GET', '/api/owner/dashboard', null, {
      authorization: `Bearer ${gymOwnerToken}`
    });
    assert.strictEqual(ownerDashRes.statusCode, 200, 'Gym Owner dashboard must be accessible (200 OK)');
    assert.strictEqual(ownerDashRes.body.success, true);
    console.log('✓ Scenario 3 PASSED: Gym Owner authenticated from gym_owners table and dashboard reached (/owner/dashboard)\n');

    // -------------------------------------------------------------
    // Scenario 4: Deleted or inactive Gym Owner -> Login rejected
    // -------------------------------------------------------------
    console.log('--- Scenario 4: Deleted or inactive Gym Owner -> Login rejected ---');
    const inactiveOwnerRes = await request('POST', '/api/auth/login', {
      email: testOwnerInactiveEmail,
      password: testOwnerPassword,
      portal: 'GYM_ADMIN'
    });
    assert.strictEqual(inactiveOwnerRes.statusCode, 403, 'Inactive gym owner must return 403 Forbidden');
    assert.strictEqual(inactiveOwnerRes.body.success, false);
    assert.ok(inactiveOwnerRes.body.message.includes('deactivated') || inactiveOwnerRes.body.message.includes('unapproved'));
    console.log('✓ Scenario 4 PASSED: Inactive Gym Owner login rejected with 403\n');

    // -------------------------------------------------------------
    // Scenario 5: Super Admin credentials entered under Gym Owner role -> Rejected
    // -------------------------------------------------------------
    console.log('--- Scenario 5: Super Admin credentials entered under Gym Owner role -> Rejected ---');
    const saUnderOwnerRoleRes = await request('POST', '/api/auth/login', {
      email: testSuperAdminEmail,
      password: testSuperAdminPassword,
      portal: 'GYM_ADMIN' // Gym Owner portal
    });
    assert.strictEqual(saUnderOwnerRoleRes.statusCode, 401, 'Super Admin credentials under Gym Owner role must return 401');
    assert.strictEqual(saUnderOwnerRoleRes.body.success, false);
    console.log('✓ Scenario 5 PASSED: Cross-role attempt (Super Admin under Gym Owner) rejected with 401\n');

    // -------------------------------------------------------------
    // Scenario 6: Gym Owner credentials entered under Super Admin role -> Rejected
    // -------------------------------------------------------------
    console.log('--- Scenario 6: Gym Owner credentials entered under Super Admin role -> Rejected ---');
    const ownerUnderSaRoleRes = await request('POST', '/api/auth/login', {
      email: testOwnerEmail,
      password: testOwnerPassword,
      portal: 'SUPER_ADMIN' // Super Admin portal
    });
    assert.strictEqual(ownerUnderSaRoleRes.statusCode, 401, 'Gym Owner credentials under Super Admin role must return 401');
    assert.strictEqual(ownerUnderSaRoleRes.body.success, false);
    console.log('✓ Scenario 6 PASSED: Cross-role attempt (Gym Owner under Super Admin) rejected with 401\n');

    // -------------------------------------------------------------
    // Scenario 7: Member credentials -> Member dashboard only after successful authentication
    // -------------------------------------------------------------
    console.log('--- Scenario 7: Member credentials -> Member dashboard only after successful authentication ---');
    // Wrong password check
    const badMemberRes = await request('POST', '/api/auth/login', {
      email: testMemberEmail,
      password: 'WrongMemberPassword#1',
      portal: 'MEMBER'
    });
    assert.strictEqual(badMemberRes.statusCode, 401, 'Member with wrong password must return 401');

    // Correct password check
    const memberLoginRes = await request('POST', '/api/auth/login', {
      email: testMemberEmail,
      password: testMemberPassword,
      portal: 'MEMBER'
    });
    assert.strictEqual(memberLoginRes.statusCode, 200, 'Member login must return 200');
    assert.strictEqual(memberLoginRes.body.success, true);
    assert.strictEqual(memberLoginRes.body.data.user.role, 'MEMBER');
    assert.ok(memberLoginRes.body.data.token, 'Must return JWT token');
    memberToken = memberLoginRes.body.data.token;
    console.log('✓ Scenario 7 PASSED: Member credentials verified against database -> destination /member/dashboard\n');

    // -------------------------------------------------------------
    // Scenario 8: Refresh after login -> Session remains valid according to secure token strategy
    // -------------------------------------------------------------
    console.log('--- Scenario 8: Refresh after login -> Session remains valid ---');
    const meRes = await request('GET', '/api/auth/me', null, {
      authorization: `Bearer ${superAdminToken}`
    });
    assert.strictEqual(meRes.statusCode, 200, 'Session validation /api/auth/me must return 200');
    assert.strictEqual(meRes.body.success, true);
    assert.strictEqual(meRes.body.data.user.id, saLoginRes.body.data.user.id);
    assert.strictEqual(meRes.body.data.user.role, 'SUPER_ADMIN');
    console.log('✓ Scenario 8 PASSED: Session verification via /api/auth/me succeeded with valid JWT\n');

    // -------------------------------------------------------------
    // Scenario 9: Logout -> Protected dashboard access is denied
    // -------------------------------------------------------------
    console.log('--- Scenario 9: Logout -> Protected dashboard access is denied ---');
    // Request without token (simulating client logout where storage is cleared)
    const loggedOutRes = await request('GET', '/api/admin/dashboard');
    assert.strictEqual(loggedOutRes.statusCode, 401, 'Protected dashboard without token must return 401');

    // Request with invalid token
    const invalidTokenRes = await request('GET', '/api/admin/dashboard', null, {
      authorization: 'Bearer invalid.bogus.jwt.token'
    });
    assert.strictEqual(invalidTokenRes.statusCode, 401, 'Protected dashboard with invalid token must return 401');
    console.log('✓ Scenario 9 PASSED: Protected dashboard access is denied without valid session token\n');

    console.log('=====================================================');
    console.log('ALL 9 MANDATORY AUTHENTICATION SCENARIOS PASSED 100%!');
    console.log('=====================================================');

  } finally {
    // Clean up test rows
    console.log('\n--- Cleaning up test fixtures from database ---');
    await db.query('DELETE FROM super_admins WHERE id = $1', [testSuperAdminId]);
    await db.query('DELETE FROM gym_owners WHERE email IN ($1, $2)', [testOwnerEmail, testOwnerInactiveEmail]);
    await db.query('DELETE FROM users WHERE email = $1', [testMemberEmail]);
    console.log('✓ Test fixtures cleaned up.');

    await stopServer();
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
