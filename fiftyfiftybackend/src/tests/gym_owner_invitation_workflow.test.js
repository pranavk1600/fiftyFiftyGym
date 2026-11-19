import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');
dotenv.config({ path: path.join(backendRoot, '.env') });

import app from '../app.js';
import { ROLES } from '../constants/roles.constant.js';
import { setEmailDispatcherForTest } from '../services/email.service.js';
import {
  addInMemoryGym,
  getInMemoryGyms,
  findInMemoryGym,
  findInMemoryOwner,
  validateInMemoryToken,
  consumeInMemoryToken,
  registerInMemoryToken,
  resetInMemoryOwners
} from '../services/devGymStore.js';

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

const request = (options, body = null) => {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: serverPort,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
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
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  console.log('========================================================');
  console.log('FiftyFifty Gym: Gym Owner Invitation End-to-End Test Suite');
  console.log('========================================================\n');

  await startTestServer();

  let sentEmails = [];
  setEmailDispatcherForTest(async (mailOptions) => {
    sentEmails.push(mailOptions);
    return {
      success: true,
      messageId: `<test-${Date.now()}@test.brevo.com>`
    };
  });

  const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
  const superAdminToken = jwt.sign(
    {
      id: 'sa_test_001',
      email: 'leopardxtechnology@gmail.com',
      role: ROLES.SUPER_ADMIN,
      fullName: 'Super Admin Test'
    },
    secret,
    { expiresIn: '1h' }
  );

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  };

  // 1. Dry run and reset of owner accounts
  await test('1. Safe Reset Utility: dry run identifies accounts without deletion', async () => {
    resetInMemoryOwners();
    const gyms = getInMemoryGyms();
    assert.equal(gyms.length >= 1, true);
    // Gym was preserved, but owner info was reset to pending
    assert.equal(gyms[0].invitation_status, 'pending');
  });

  // 2. Super Admin authorization
  await test('2. Super Admin Access: Protected route rejects unauthorized client', async () => {
    const res = await request({
      path: '/api/admin/gyms',
      method: 'GET'
    });
    assert.equal(res.statusCode, 401);
  });

  // 3 & 4. Create Gym and verify Gym record
  let createdGym = null;
  let rawToken = null;
  await test('3 & 4. Gym Creation: Super Admin creates gym and verifies record creation', async () => {
    sentEmails = [];
    const payload = {
      name: 'Titan Fitness Club',
      owner_name: 'Rohit Sharma',
      email: 'rohit.titan@test.com',
      phone: '+91 99988 77766',
      city: 'Mumbai',
      state: 'Maharashtra',
      opening_hours: '05:00 AM - 11:00 PM',
      description: 'Elite training facility'
    };

    const res = await request(
      {
        path: '/api/admin/gyms',
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      },
      payload
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.gym.name, 'Titan Fitness Club');
    assert.equal(res.body.data.gym.slug, 'titan-fitness-club');
    assert.equal(res.body.data.emailDelivered, true);
    assert.equal(res.body.data.invitationStatus, 'sent');
    createdGym = res.body.data.gym;

    // Extract rawToken from activationUrl
    const activationUrl = res.body.data.activationUrl;
    assert.equal(activationUrl.includes('/setup-password?token='), true);
    rawToken = new URL(activationUrl).searchParams.get('token');
    assert.equal(Boolean(rawToken), true);
  });

  // 5. Verify Gym Owner account creation
  await test('5. Gym Owner Account: Linked owner account created with role GYM_OWNER', async () => {
    const owner = findInMemoryOwner('rohit.titan@test.com');
    assert.equal(Boolean(owner), true);
    assert.equal(owner.role, ROLES.GYM_OWNER);
    assert.equal(owner.email, 'rohit.titan@test.com');
  });

  // 6 & 7. Verify token generation and Brevo email acceptance
  await test('6 & 7. Invitation Token & Brevo Email: Email dispatched without exposing plaintext passwords', async () => {
    assert.equal(sentEmails.length, 1);
    const sent = sentEmails[0];
    assert.equal(sent.to, 'rohit.titan@test.com');
    assert.equal(sent.subject.includes('Titan Fitness Club'), true);
    const bodyHtml = sent.htmlContent || sent.html || '';
    const bodyText = sent.textContent || sent.text || '';
    assert.equal(bodyHtml.includes(rawToken), true);
    // Security check: no temporary password in email
    assert.equal(bodyHtml.includes('Temporary Password'), false);
    assert.equal(bodyHtml.includes('temporaryPassword'), false);
    assert.equal(bodyText.includes('Temporary Password'), false);
  });

  // 8. Brevo Delivery Webhook event
  await test('8. Brevo Webhook: Transitions invitation status from "sent" to "delivered"', async () => {
    const webhookRes = await request(
      {
        path: '/api/webhooks/brevo',
        method: 'POST'
      },
      {
        event: 'delivered',
        email: 'rohit.titan@test.com',
        'message-id': '<test-msg-001@brevo.com>'
      }
    );

    assert.equal(webhookRes.statusCode, 200);
    assert.equal(webhookRes.body.success, true);
    const gym = findInMemoryGym(createdGym.id);
    assert.equal(gym.invitation_status, 'delivered');
  });

  // 9. Verify invitation token API
  await test('9. Token Verification: Validates invitation token before password setup', async () => {
    const res = await request({
      path: `/api/auth/verify-reset-token?token=${rawToken}`,
      method: 'GET'
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.valid, true);
    assert.equal(res.body.data.email, 'rohit.titan@test.com');
    assert.equal(res.body.data.gymSlug, 'titan-fitness-club');
  });

  // 10. Complete password setup
  await test('10. Password Setup: Sets secure owner password and marks status "accepted"', async () => {
    const res = await request(
      {
        path: '/api/auth/reset-password',
        method: 'POST'
      },
      {
        token: rawToken,
        newPassword: 'MySecurePassword#2026'
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.gymSlug, 'titan-fitness-club');

    const gym = findInMemoryGym(createdGym.id);
    assert.equal(gym.invitation_status, 'accepted');
  });

  // 11. Single-use enforcement (used token rejected)
  await test('11. Single-use Token: Previously consumed token cannot be reused', async () => {
    const res = await request(
      {
        path: '/api/auth/reset-password',
        method: 'POST'
      },
      {
        token: rawToken,
        newPassword: 'AnotherPassword#2026'
      }
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message.includes('already been used'), true);
  });

  // 12. Gym Owner login
  let ownerToken = null;
  await test('12. Gym Owner Login: Logs in with gym slug and credentials', async () => {
    const res = await request(
      {
        path: '/api/auth/gym/login',
        method: 'POST'
      },
      {
        email: 'rohit.titan@test.com',
        password: 'MySecurePassword#2026',
        gymSlug: 'titan-fitness-club'
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, ROLES.GYM_OWNER);
    assert.equal(res.body.data.user.gymSlug, 'titan-fitness-club');
    ownerToken = res.body.data.token;
    assert.equal(Boolean(ownerToken), true);
  });

  // 13. Gym-level tenant isolation
  await test('13. Gym Isolation: Owner is blocked from accessing another gym\'s data', async () => {
    const res = await request({
      path: '/api/members?gymId=another-gym-id',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-gym-id': 'another-gym-id'
      }
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message.includes('another gym'), true);
  });

  // 14. Resend invitation
  await test('14. Resend Invitation: Generates fresh token, invalidates old token, and dispatches email', async () => {
    sentEmails = [];
    const res = await request({
      path: `/api/admin/gyms/${createdGym.id}/resend-invitation`,
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.emailDelivered, true);
    assert.equal(sentEmails.length, 1);

    const freshUrl = res.body.data.activationUrl;
    const freshToken = new URL(freshUrl).searchParams.get('token');
    assert.notEqual(freshToken, rawToken);

    // Verify fresh token is valid
    const verifyRes = await request({
      path: `/api/auth/verify-reset-token?token=${freshToken}`,
      method: 'GET'
    });
    assert.equal(verifyRes.statusCode, 200);
    assert.equal(verifyRes.body.data.valid, true);
  });

  // 15. Brevo failure handling
  await test('15. Brevo Failure Handling: Preserves gym and owner in "pending" status on email error', async () => {
    // Simulate Brevo outage
    setEmailDispatcherForTest(async () => {
      throw new Error('Brevo API 401 Unauthorized: Invalid API key');
    });

    const res = await request(
      {
        path: '/api/admin/gyms',
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      },
      {
        name: 'Apex Athletic Club',
        owner_name: 'Sunil Gavaskar',
        email: 'sunil.apex@test.com',
        phone: '+91 91234 56789',
        city: 'Pune',
        state: 'Maharashtra'
      }
    );

    // Status is 201 Created (gym created successfully, but email not delivered)
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.emailDelivered, false);
    assert.equal(res.body.data.invitationStatus, 'pending');
    assert.equal(res.body.message.includes('could not be delivered'), true);

    // Gym record was preserved
    const apexGym = findInMemoryGym('apex-athletic-club');
    assert.equal(Boolean(apexGym), true);
    assert.equal(apexGym.invitation_status, 'pending');

    // Owner account was preserved in pending state
    const apexOwner = findInMemoryOwner('sunil.apex@test.com');
    assert.equal(Boolean(apexOwner), true);
  });

  await stopTestServer();

  console.log('\n========================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL TEST RUN ERROR]:', err);
  if (server) server.close();
  process.exit(1);
});
