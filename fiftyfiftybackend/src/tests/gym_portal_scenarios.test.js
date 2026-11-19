import http from 'http';
import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const { default: app } = await import('../app.js');
const { default: db } = await import('../config/db.js');
const { setEmailDispatcherForTest } = await import('../services/email.service.js');
const { ROLES } = await import('../constants/roles.constant.js');

let server = null;
let baseUrl = '';

const startTestServer = () => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
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

const request = (method, endpoint, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const reqHeaders = { ...headers };
    let postData = null;

    if (body !== null) {
      postData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_e) {
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
    if (postData) req.write(postData);
    req.end();
  });
};

let passedCount = 0;
let failedCount = 0;

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedCount++;
  }
};

async function runGymPortalScenarios() {
  console.log('\n====================================================');
  console.log('FiftyFifty Gym — Dynamic Branded Gym Portal Scenarios');
  console.log('====================================================\n');

  await startTestServer();

  let superAdminToken = null;
  let lastMockedEmail = null;

  // Intercept Brevo transactional emails
  setEmailDispatcherForTest((payload) => {
    lastMockedEmail = payload;
    return Promise.resolve({
      success: true,
      messageId: `mock_portal_${Date.now()}`
    });
  });

  const timestamp = Date.now();
  const testSaEmail = `test_sa_portal_${timestamp}@fiftyfiftygym.com`;
  const testSaPassword = 'SuperAdminSecretPass123!';
  const testSaId = `usr_sa_portal_${timestamp}`;

  // Test gym details
  const testGymName = `Pranav Fitness ${timestamp.toString().slice(-4)}`;
  const testOwnerName = 'Pranav Kondhalkar';
  const testOwnerEmail = `pranav_${timestamp}@fitness-test.com`;
  const newPermanentPassword = 'PranavStrongPassword2026!';

  let createdGymId = null;
  let createdGymSlug = null;
  let createdOwnerId = null;
  let rawActivationToken = null;

  // Secondary gym for cross-gym isolation testing
  let otherGymId = null;
  let otherGymSlug = null;

  try {
    // 0. Setup test Super Admin
    const bcrypt = (await import('bcryptjs')).default;
    const saHash = await bcrypt.hash(testSaPassword, 10);
    await db.query(`
      INSERT INTO super_admins (id, email, password_hash, full_name, role, status)
      VALUES ($1, $2, $3, 'Platform Admin', 'SUPER_ADMIN', 'active')
    `, [testSaId, testSaEmail, saHash]);

    // 1. Super Admin Login
    await test('Super Admin logs in and receives JWT token', async () => {
      const res = await request('POST', '/api/auth/superadmin/login', {
        email: testSaEmail,
        password: testSaPassword
      });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.data.token);
      superAdminToken = res.body.data.token;
    });

    // 2. Gym Creation with Automatic Slug Generation and Brevo Email
    await test('Super Admin creates "Pranav Fitness" -> generates unique slug & sends invitation email', async () => {
      lastMockedEmail = null;

      const res = await request('POST', '/api/admin/gyms', {
        name: testGymName,
        owner_name: testOwnerName,
        email: testOwnerEmail,
        phone: '+91 98200 55443',
        address: '100 Fitness Boulevard',
        city: 'Pune',
        state: 'Maharashtra',
        logo_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        description: 'Elite training facility'
      }, {
        authorization: `Bearer ${superAdminToken}`
      });

      assert.strictEqual(res.statusCode, 201, `Create gym failed: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);

      const gymData = res.body.data.gym;
      const ownerData = res.body.data.owner;

      createdGymId = gymData.id;
      createdGymSlug = gymData.slug;
      createdOwnerId = ownerData.id;

      assert.ok(createdGymSlug, 'Gym slug must be present');
      assert.ok(createdGymSlug.startsWith('pranav-fitness'), `Slug must start with pranav-fitness (got ${createdGymSlug})`);
      assert.strictEqual(gymData.invitation_status, 'invitation_sent');
      assert.strictEqual(res.body.data.emailDelivered, true);

      // Verify DB record
      const gymDb = await db.query('SELECT * FROM gyms WHERE id = $1', [createdGymId]);
      assert.strictEqual(gymDb.rows.length, 1);
      assert.strictEqual(gymDb.rows[0].slug, createdGymSlug);

      // Verify email contents
      assert.ok(lastMockedEmail !== null, 'Brevo email must have been dispatched');
      assert.strictEqual(lastMockedEmail.to, testOwnerEmail.toLowerCase());
      assert.ok(lastMockedEmail.subject.includes(testGymName));
      assert.ok(lastMockedEmail.htmlContent.includes(`/gym/${createdGymSlug}/login`), 'HTML must include gym login URL');
      assert.ok(lastMockedEmail.textContent.includes(`/gym/${createdGymSlug}/login`), 'Text must include gym login URL');
      assert.ok(lastMockedEmail.htmlContent.includes(`/gym/${createdGymSlug}/setup-password`), 'HTML must include password setup link');

      // Extract raw token from activation link
      const tokenMatch = lastMockedEmail.textContent.match(/setup-password\?token=([a-f0-9]+)/);
      assert.ok(tokenMatch, 'Activation token must be extracted from email');
      rawActivationToken = tokenMatch[1];
    });

    // 3. Second Gym to test Slug Uniqueness Collision Handling
    await test('Slug collision handling generates unique indexed slug', async () => {
      const res = await request('POST', '/api/admin/gyms', {
        name: testGymName, // same name
        owner_name: 'Second Owner',
        email: `other_${timestamp}@fitness-test.com`,
        phone: '+91 98200 99887'
      }, {
        authorization: `Bearer ${superAdminToken}`
      });

      assert.strictEqual(res.statusCode, 201);
      otherGymId = res.body.data.gym.id;
      otherGymSlug = res.body.data.gym.slug;

      assert.notStrictEqual(otherGymSlug, createdGymSlug, 'Colliding slug must be unique');
      assert.ok(otherGymSlug.startsWith(createdGymSlug), 'Colliding slug must append index');
    });

    // 4. Public Gym Lookup by Slug
    await test('GET /api/gyms/slug/:slug returns sanitized public branding', async () => {
      const res = await request('GET', `/api/gyms/slug/${createdGymSlug}`);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.name, testGymName);
      assert.strictEqual(res.body.data.slug, createdGymSlug);
      assert.strictEqual(res.body.data.city, 'Pune');
      assert.strictEqual(res.body.data.logo_url, 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
    });

    // 5. Unknown Slug Returns 404
    await test('GET /api/gyms/slug/non-existent-xyz returns 404 Not Found', async () => {
      const res = await request('GET', '/api/gyms/slug/non-existent-xyz-999');
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
    });

    // 6. Public routes fallback also returns 404 for unknown slug
    await test('GET /api/public/gyms/non-existent-xyz returns 404 Not Found', async () => {
      const res = await request('GET', '/api/public/gyms/non-existent-xyz-999');
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
    });

    // 7. Token Verification Endpoint
    await test('GET /api/auth/verify-reset-token validates gym owner token', async () => {
      assert.ok(rawActivationToken);
      const res = await request('GET', `/api/auth/verify-reset-token?token=${rawActivationToken}`);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.valid, true);
      assert.strictEqual(res.body.data.email, testOwnerEmail.toLowerCase());
      assert.strictEqual(res.body.data.userType, 'GYM_OWNER');
      assert.strictEqual(res.body.data.gymSlug, createdGymSlug);
    });

    // 8. Set Password using Invitation Token
    await test('POST /api/auth/reset-password activates gym owner password and single-use token', async () => {
      const res = await request('POST', '/api/auth/reset-password', {
        token: rawActivationToken,
        newPassword: newPermanentPassword
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.success, true);
      assert.strictEqual(res.body.data.userType, 'GYM_OWNER');
      assert.strictEqual(res.body.data.gymSlug, createdGymSlug);

      // Verify token is now marked used (single-use)
      const tokenDb = await db.query('SELECT used_at FROM password_reset_tokens WHERE user_id = $1', [createdOwnerId]);
      assert.ok(tokenDb.rows[0].used_at !== null, 'Token must be marked used');

      // Attempting to reuse the same token must fail
      const reuseRes = await request('GET', `/api/auth/verify-reset-token?token=${rawActivationToken}`);
      assert.strictEqual(reuseRes.statusCode, 400);

      // Verify owner account updated
      const ownerDb = await db.query('SELECT must_change_password, invitation_status FROM gym_owners WHERE id = $1', [createdOwnerId]);
      assert.strictEqual(ownerDb.rows[0].must_change_password, false);
      assert.strictEqual(ownerDb.rows[0].invitation_status, 'accepted');
    });

    // 9. Dedicated Gym Login: POST /api/auth/gym/login
    let ownerAuthToken = null;
    await test('POST /api/auth/gym/login succeeds with correct owner credentials and gymSlug', async () => {
      const res = await request('POST', '/api/auth/gym/login', {
        email: testOwnerEmail,
        password: newPermanentPassword,
        gymSlug: createdGymSlug
      });

      assert.strictEqual(res.statusCode, 200, `Login failed: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user.role, 'GYM_OWNER');
      assert.strictEqual(res.body.data.user.gymId, createdGymId);
      assert.strictEqual(res.body.data.user.gymSlug, createdGymSlug);
      assert.strictEqual(res.body.data.user.gymLogoUrl, 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
      assert.ok(res.body.data.token);

      ownerAuthToken = res.body.data.token;
    });

    // 9b. Universal login preserves gymSlug and gym metadata for Gym Owner
    await test('POST /api/auth/login returns gymSlug for authenticated Gym Owner', async () => {
      const res = await request('POST', '/api/auth/login', {
        email: testOwnerEmail,
        password: newPermanentPassword,
        portal: 'GYM_ADMIN'
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.user.role, 'GYM_OWNER');
      assert.strictEqual(res.body.data.user.gymSlug, createdGymSlug);
    });

    // 10. Cross-Gym Tenant Rejection (403 Forbidden)
    await test('POST /api/auth/gym/login rejects owner trying to log into another gym portal (403)', async () => {
      assert.ok(otherGymSlug);

      const res = await request('POST', '/api/auth/gym/login', {
        email: testOwnerEmail, // belongs to createdGymSlug
        password: newPermanentPassword,
        gymSlug: otherGymSlug // target is different gym
      });

      assert.strictEqual(res.statusCode, 403, `Cross-gym login must be 403 Forbidden (got ${res.statusCode}: ${JSON.stringify(res.body)})`);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.message.includes('authorization') || res.body.message.includes('denied'));
    });

    // 11. Invalid Password Rejection (401 Unauthorized)
    await test('POST /api/auth/gym/login rejects wrong password (401)', async () => {
      const res = await request('POST', '/api/auth/gym/login', {
        email: testOwnerEmail,
        password: 'IncorrectPassword999!',
        gymSlug: createdGymSlug
      });

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });

    // 12. Non-existent Gym Slug on Login (404 Not Found)
    await test('POST /api/auth/gym/login rejects non-existent gymSlug (404)', async () => {
      const res = await request('POST', '/api/auth/gym/login', {
        email: testOwnerEmail,
        password: newPermanentPassword,
        gymSlug: 'non-existent-gym-xyz'
      });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
    });

    // 13. Resend Invitation
    await test('POST /api/admin/gyms/:id/resend-invitation issues fresh token and email', async () => {
      lastMockedEmail = null;

      const res = await request('POST', `/api/admin/gyms/${createdGymId}/resend-invitation`, null, {
        authorization: `Bearer ${superAdminToken}`
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.invitationStatus, 'invitation_sent');
      assert.strictEqual(res.body.data.emailDelivered, true);
      assert.ok(res.body.data.loginUrl.includes(`/gym/${createdGymSlug}/login`));
      assert.ok(res.body.data.activationUrl.includes(`/gym/${createdGymSlug}/setup-password`));

      assert.ok(lastMockedEmail !== null);
      assert.strictEqual(lastMockedEmail.to, testOwnerEmail.toLowerCase());
      assert.ok(lastMockedEmail.htmlContent.includes(`/gym/${createdGymSlug}/setup-password`));
    });

    // 14. Gym Owner Forgot Password Validation
    await test('POST /api/auth/gym/forgot-password validates email and prevents user enumeration', async () => {
      const emptyRes = await request('POST', '/api/auth/gym/forgot-password', {});
      assert.strictEqual(emptyRes.statusCode, 400);

      const invalidEmailRes = await request('POST', '/api/auth/gym/forgot-password', { email: 'not-an-email' });
      assert.strictEqual(invalidEmailRes.statusCode, 400);

      const nonExistentRes = await request('POST', '/api/auth/gym/forgot-password', {
        email: 'unregistered_owner_xyz_999@fitness.local',
        gymSlug: createdGymSlug
      });
      assert.strictEqual(nonExistentRes.statusCode, 200);
      assert.strictEqual(nonExistentRes.body.success, true);
      assert.ok(nonExistentRes.body.data.message.includes('password reset instructions have been sent'));
    });

    // 15. Gym Owner Forgot Password Link Generation & Brevo Email Dispatch
    let gymOwnerResetToken = null;
    const finalOwnerPassword = 'PranavBrandNewPassword2026!#';

    await test('POST /api/auth/gym/forgot-password dispatches Brevo email with gym name & valid reset link', async () => {
      lastMockedEmail = null;

      const res = await request('POST', '/api/auth/gym/forgot-password', {
        email: testOwnerEmail,
        gymSlug: createdGymSlug
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);

      // Verify token in database
      const tokenDb = await db.query(
        'SELECT id, token_hash, expires_at, used_at FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',
        [createdOwnerId]
      );
      assert.strictEqual(tokenDb.rows.length, 1, 'Token must exist in database for Gym Owner');
      assert.ok(new Date(tokenDb.rows[0].expires_at) > new Date(), 'Token must have future expiry');

      // Verify Brevo email payload
      assert.ok(lastMockedEmail !== null, 'Brevo email must be received');
      assert.strictEqual(lastMockedEmail.to, testOwnerEmail.toLowerCase());
      assert.ok(lastMockedEmail.subject.includes(testGymName), 'Subject must include gym name');
      assert.ok(lastMockedEmail.htmlContent.includes(testGymName), 'HTML email must include gym name');
      assert.ok(lastMockedEmail.htmlContent.includes(`/gym/${createdGymSlug}/reset-password?token=`), 'HTML must have gym-specific reset link');
      assert.ok(lastMockedEmail.textContent.includes(`/gym/${createdGymSlug}/reset-password?token=`), 'Text must have gym-specific reset link');

      // Extract raw token from reset link
      const match = lastMockedEmail.textContent.match(/reset-password\?token=([a-f0-9]+)/);
      assert.ok(match, 'Token must be extractable from email text content');
      gymOwnerResetToken = match[1];
    });

    // 16. Verify Gym Owner Reset Token
    await test('GET /api/auth/verify-reset-token validates Gym Owner token and identifies gym details', async () => {
      assert.ok(gymOwnerResetToken);

      const res = await request('GET', `/api/auth/verify-reset-token?token=${gymOwnerResetToken}`);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.valid, true);
      assert.strictEqual(res.body.data.email, testOwnerEmail.toLowerCase());
      assert.strictEqual(res.body.data.userType, 'GYM_OWNER');
      assert.strictEqual(res.body.data.gymSlug, createdGymSlug);
      assert.strictEqual(res.body.data.gymName, testGymName);
    });

    // 17. Reset Password Execution
    await test('POST /api/auth/reset-password securely updates gym owner password and invalidates token', async () => {
      assert.ok(gymOwnerResetToken);

      // Rejects too-short password
      const shortRes = await request('POST', '/api/auth/reset-password', {
        token: gymOwnerResetToken,
        newPassword: 'short'
      });
      assert.strictEqual(shortRes.statusCode, 400);

      // Successful reset
      const resetRes = await request('POST', '/api/auth/reset-password', {
        token: gymOwnerResetToken,
        newPassword: finalOwnerPassword
      });

      assert.strictEqual(resetRes.statusCode, 200);
      assert.strictEqual(resetRes.body.success, true);
      assert.strictEqual(resetRes.body.data.userType, 'GYM_OWNER');
      assert.strictEqual(resetRes.body.data.gymSlug, createdGymSlug);

      // Single-use enforcement: token marked used in DB
      const tokenDb = await db.query(
        'SELECT used_at FROM password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [createdOwnerId]
      );
      assert.ok(tokenDb.rows[0].used_at !== null, 'Token must be marked used');

      // Reusing token must fail with 400
      const reuseRes = await request('POST', '/api/auth/reset-password', {
        token: gymOwnerResetToken,
        newPassword: 'AnotherPassword#999'
      });
      assert.strictEqual(reuseRes.statusCode, 400);

      // Verify token is rejected by GET /api/auth/verify-reset-token
      const verifyUsedRes = await request('GET', `/api/auth/verify-reset-token?token=${gymOwnerResetToken}`);
      assert.strictEqual(verifyUsedRes.statusCode, 400);
    });

    // 18. Verify Old Password Fails and New Password Succeeds
    await test('Old Gym Owner password is invalid and new reset password authenticates successfully', async () => {
      // 1. Old password fails
      const oldLoginRes = await request('POST', '/api/auth/gym/login', {
        email: testOwnerEmail,
        password: newPermanentPassword,
        gymSlug: createdGymSlug
      });
      assert.strictEqual(oldLoginRes.statusCode, 401, 'Old password must be rejected');

      // 2. New password succeeds
      const newLoginRes = await request('POST', '/api/auth/gym/login', {
        email: testOwnerEmail,
        password: finalOwnerPassword,
        gymSlug: createdGymSlug
      });
      assert.strictEqual(newLoginRes.statusCode, 200, 'New reset password must succeed');
      assert.strictEqual(newLoginRes.body.data.user.role, 'GYM_OWNER');
      assert.strictEqual(newLoginRes.body.data.user.gymSlug, createdGymSlug);
      assert.ok(newLoginRes.body.data.token, 'Must receive signed JWT token');
    });

    // 19. Super Admin and Gym Owner Isolation
    await test('Super Admin and Gym Owner password reset endpoints maintain strict tenant isolation', async () => {
      // Super Admin endpoint POST /api/auth/forgot-password does NOT create token for Gym Owner
      const priorCountRes = await db.query('SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [createdOwnerId]);
      const countBefore = parseInt(priorCountRes.rows[0].count, 10);

      const saEndpointRes = await request('POST', '/api/auth/forgot-password', {
        email: testOwnerEmail
      });
      assert.strictEqual(saEndpointRes.statusCode, 200);

      const afterCountRes = await db.query('SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [createdOwnerId]);
      const countAfter = parseInt(afterCountRes.rows[0].count, 10);
      assert.strictEqual(countAfter, countBefore, 'Super Admin forgot-password must not issue reset tokens to gym owners');

      // Gym Owner endpoint POST /api/auth/gym/forgot-password does NOT create token for Super Admin
      const saTokensBefore = await db.query('SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [testSaId]);
      const saCountBefore = parseInt(saTokensBefore.rows[0].count, 10);

      const gymEndpointRes = await request('POST', '/api/auth/gym/forgot-password', {
        email: testSaEmail
      });
      assert.strictEqual(gymEndpointRes.statusCode, 200);

      const saTokensAfter = await db.query('SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [testSaId]);
      const saCountAfter = parseInt(saTokensAfter.rows[0].count, 10);
      assert.strictEqual(saCountAfter, saCountBefore, 'Gym Owner forgot-password must not issue reset tokens to Super Admins');
    });

  } finally {
    // Clean up test data
    console.log('\nCleaning up test records...');
    if (createdGymId) {
      await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [createdOwnerId]).catch(() => {});
      await db.query('DELETE FROM gym_owners WHERE gym_id = $1', [createdGymId]).catch(() => {});
      await db.query('DELETE FROM gyms WHERE id = $1', [createdGymId]).catch(() => {});
    }
    if (otherGymId) {
      await db.query('DELETE FROM gym_owners WHERE gym_id = $1', [otherGymId]).catch(() => {});
      await db.query('DELETE FROM gyms WHERE id = $1', [otherGymId]).catch(() => {});
    }
    await db.query('DELETE FROM super_admins WHERE id = $1', [testSaId]).catch(() => {});
    await stopTestServer();
  }

  console.log(`\nPortal Scenario Results: ${passedCount}/${passedCount + failedCount} passed.`);
  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runGymPortalScenarios();
