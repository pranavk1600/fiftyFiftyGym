import assert from 'node:assert/strict';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  hashOtp,
  generateSecureOtp,
  checkRateLimit,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtpToken,
  _resetOtpMemoryForTest
} from '../services/otp.service.js';
import {
  setEmailDispatcherForTest,
  renderPasswordResetOtpHtml,
  renderPasswordResetOtpText
} from '../services/email.service.js';
import { addInMemoryGym } from '../services/devGymStore.js';

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
};

const runOtpSuite = async () => {
  console.log('\n======================================================');
  console.log('OTP-Based Forgot Password Security & Flow Tests');
  console.log('======================================================\n');

  try {
    // -------------------------------------------------------------
    // 1. Generation & Hashing Tests
    // -------------------------------------------------------------
    await test('generateSecureOtp generates a 6-digit numeric string', () => {
      for (let i = 0; i < 50; i++) {
        const otp = generateSecureOtp();
        assert.strictEqual(typeof otp, 'string');
        assert.strictEqual(otp.length, 6);
        assert.ok(/^\d{6}$/.test(otp), `OTP "${otp}" must consist of exactly 6 digits`);
        const num = parseInt(otp, 10);
        assert.ok(num >= 100000 && num <= 999999);
      }
    });

    await test('hashOtp produces secure salted SHA-256 hash', () => {
      const email = 'owner@pranavgym.com';
      const otp = '482910';
      const hash1 = hashOtp(email, otp);
      const hash2 = hashOtp('OWNER@pranavgym.com ', '482910'); // Case-insensitive, trimmed

      assert.strictEqual(hash1.length, 64);
      assert.strictEqual(hash1, hash2, 'Normalized email should produce identical hash');

      const hashOtherEmail = hashOtp('other@pranavgym.com', otp);
      assert.notStrictEqual(hash1, hashOtherEmail, 'Different email must produce different hash (salted)');

      const hashOtherOtp = hashOtp(email, '482911');
      assert.notStrictEqual(hash1, hashOtherOtp, 'Different OTP must produce different hash');
    });

    // -------------------------------------------------------------
    // 2. Email Template Security Tests (No URLs, 5-min expiry)
    // -------------------------------------------------------------
    await test('renderPasswordResetOtpHtml contains 6-digit OTP and NO reset URLs or tokens', () => {
      const otp = '928374';
      const html = renderPasswordResetOtpHtml({
        otp,
        recipientName: 'Pranav Owner',
        gymName: 'Pranav GYM',
        expiryMinutes: 5
      });
      const text = renderPasswordResetOtpText({
        otp,
        recipientName: 'Pranav Owner',
        gymName: 'Pranav GYM',
        expiryMinutes: 5
      });

      // Must contain OTP
      assert.ok(html.includes(otp), 'HTML must contain the 6-digit OTP');
      assert.ok(text.includes(otp), 'Text must contain the 6-digit OTP');

      // Must mention 5 minutes
      assert.ok(html.includes('5 minutes'), 'HTML must mention 5 minutes');
      assert.ok(text.includes('5 minutes'), 'Text must mention 5 minutes');

      // Must NEVER contain reset URLs or query tokens
      assert.strictEqual(html.includes('token='), false, 'HTML must NOT contain reset link token parameter');
      assert.strictEqual(html.includes('/reset-password'), false, 'HTML must NOT contain reset-password URL');
      assert.strictEqual(text.includes('token='), false, 'Text must NOT contain reset link token parameter');
      assert.strictEqual(text.includes('/reset-password'), false, 'Text must NOT contain reset-password URL');
    });

    // -------------------------------------------------------------
    // 3. User Enumeration Prevention
    // -------------------------------------------------------------
    await test('sendPasswordResetOtp returns generic success message when account does not exist', async () => {
      _resetOtpMemoryForTest();
      const res = await sendPasswordResetOtp({
        email: 'nobody_random_nonexistent_12345@example.com',
        clientIp: '127.0.0.1'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.userFound, false);
      assert.ok(res.message.includes('a 6-digit verification code has been sent'), 'Must return generic message');
    });

    // -------------------------------------------------------------
    // 4. Rate Limiting & Cooldown Tests
    // -------------------------------------------------------------
    await test('sendPasswordResetOtp enforces 60-second cooldown between resend requests', async () => {
      _resetOtpMemoryForTest();
      const testEmail = 'cooldown_test@example.com';

      // First request
      const res1 = await sendPasswordResetOtp({ email: testEmail, clientIp: '127.0.0.1' });
      assert.strictEqual(res1.success, true);

      // Immediate second request
      const res2 = await sendPasswordResetOtp({ email: testEmail, clientIp: '127.0.0.1' });
      assert.strictEqual(res2.success, false);
      assert.strictEqual(res2.rateLimited, true);
      assert.ok(res2.remainingSeconds > 0 && res2.remainingSeconds <= 60);
      assert.ok(res2.message.includes('Please wait'));
    });

    // -------------------------------------------------------------
    // 5. Full End-to-End OTP Reset Flow for Gym Owner
    // -------------------------------------------------------------
    await test('Full OTP lifecycle: Send OTP -> Verify -> Reset Password -> Login with New Password', async () => {
      _resetOtpMemoryForTest();

      const ownerEmail = 'pranav_owner_otp_test@pranavgym.com';
      const initialPassword = 'InitialOwnerPass#123';
      const initialHash = await bcrypt.hash(initialPassword, 10);

      // Seed mock gym & owner in devGymStore
      addInMemoryGym(
        { id: 'gym_otp_01', name: 'Pranav Fitness', slug: 'pranav-fitness' },
        { id: 'owner_otp_01', email: ownerEmail, fullName: 'Pranav Kondhalkar', gymId: 'gym_otp_01', password_hash: initialHash }
      );

      // Intercept Brevo email to capture the dispatched OTP
      let capturedEmail = null;
      let capturedOtp = null;
      setEmailDispatcherForTest(async (payload) => {
        capturedEmail = payload.to;
        // Extract 6-digit OTP from subject
        const match = payload.subject.match(/\b\d{6}\b/);
        if (match) capturedOtp = match[0];
        return { success: true, messageId: 'test-otp-msg-01' };
      });

      // Step A: Request OTP
      const sendRes = await sendPasswordResetOtp({ email: ownerEmail, clientIp: '192.168.1.50' });
      assert.strictEqual(sendRes.success, true);
      assert.strictEqual(sendRes.userFound, true);
      assert.ok(capturedEmail === ownerEmail);
      assert.ok(capturedOtp && capturedOtp.length === 6, 'OTP must have been dispatched');

      // Step B: Attempt verification with incorrect OTP
      const failRes = await verifyPasswordResetOtp({ email: ownerEmail, otp: '000000' });
      assert.strictEqual(failRes.success, false);
      assert.ok(failRes.message.includes('attempt'));

      // Step C: Verify with correct OTP
      const verifyRes = await verifyPasswordResetOtp({ email: ownerEmail, otp: capturedOtp });
      assert.strictEqual(verifyRes.success, true);
      assert.ok(verifyRes.resetToken && verifyRes.resetToken.length >= 32, 'Must return secure resetToken');

      // Step D: Attempt to reuse the same OTP (Single-Use check)
      const reuseOtpRes = await verifyPasswordResetOtp({ email: ownerEmail, otp: capturedOtp });
      assert.strictEqual(reuseOtpRes.success, false, 'Must reject reused OTP');

      // Step E: Set new password using the resetToken
      const newPassword = 'NewSecretPassword#2026';
      const resetRes = await resetPasswordWithOtpToken({
        email: ownerEmail,
        resetToken: verifyRes.resetToken,
        newPassword
      });
      assert.strictEqual(resetRes.success, true);
      assert.strictEqual(resetRes.message, 'Password Reset Successfully!');

      // Step F: Attempt to reuse the resetToken (Single-Use check)
      const reuseTokenRes = await resetPasswordWithOtpToken({
        email: ownerEmail,
        resetToken: verifyRes.resetToken,
        newPassword: 'AnotherPassword#999'
      });
      assert.strictEqual(reuseTokenRes.success, false, 'Must reject already used resetToken');
    });

    // -------------------------------------------------------------
    // 6. Max Attempts Lockout Test
    // -------------------------------------------------------------
    await test('OTP locks out after 5 consecutive incorrect attempts', async () => {
      _resetOtpMemoryForTest();

      const testEmail = 'lockout_test@pranavgym.com';
      addInMemoryGym(
        { id: 'gym_otp_02', name: 'Lockout Gym', slug: 'lockout-gym' },
        { id: 'owner_otp_02', email: testEmail, fullName: 'Test User', gymId: 'gym_otp_02' }
      );

      let correctOtp = null;
      setEmailDispatcherForTest(async (payload) => {
        const match = payload.subject.match(/\b\d{6}\b/);
        if (match) correctOtp = match[0];
        return { success: true };
      });

      await sendPasswordResetOtp({ email: testEmail, clientIp: '10.0.0.1' });
      assert.ok(correctOtp);

      // Attempt 1 to 4 should report remaining attempts
      for (let attempt = 1; attempt <= 4; attempt++) {
        const res = await verifyPasswordResetOtp({ email: testEmail, otp: '111111' });
        assert.strictEqual(res.success, false);
        assert.strictEqual(res.locked, undefined);
        assert.strictEqual(res.message.includes(`${5 - attempt} attempt`), true);
      }

      // 5th failed attempt should lock
      const fifthRes = await verifyPasswordResetOtp({ email: testEmail, otp: '111111' });
      assert.strictEqual(fifthRes.success, false);
      assert.strictEqual(fifthRes.locked, true);
      assert.ok(fifthRes.message.includes('Too many incorrect attempts'));

      // Even correct OTP should now be rejected because it is locked
      const lateCorrectRes = await verifyPasswordResetOtp({ email: testEmail, otp: correctOtp });
      assert.strictEqual(lateCorrectRes.success, false);
      assert.strictEqual(lateCorrectRes.locked, true);
    });

  } finally {
    // Reset test dispatcher
    setEmailDispatcherForTest(null);
    _resetOtpMemoryForTest();
  }

  console.log('\n======================================================');
  console.log(`OTP Test Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runOtpSuite();
