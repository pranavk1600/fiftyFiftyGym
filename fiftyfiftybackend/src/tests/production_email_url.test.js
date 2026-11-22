import assert from 'node:assert/strict';
import {
  PRODUCTION_FRONTEND_URL,
  LOCAL_DEV_FRONTEND_URL,
  isProductionEnvironment,
  getFrontendUrl,
  sanitizeEmailUrl
} from '../config/frontend.config.js';
import {
  renderGymOwnerInvitationHtml,
  renderGymOwnerInvitationText,
  renderPasswordResetHtml,
  renderPasswordResetText,
  renderGymOwnerPasswordResetHtml,
  renderGymOwnerPasswordResetText,
  renderMemberInvitationHtml,
  renderMemberInvitationText,
  renderMemberPasswordResetHtml,
  renderMemberPasswordResetText
} from '../services/email.service.js';

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

const runSuite = async () => {
  console.log('\n======================================================');
  console.log('Production Email Frontend URL Verification Test Suite');
  console.log('======================================================\n');

  const originalEnv = { ...process.env };

  try {
    // -------------------------------------------------------------
    // 1. Config tests: getFrontendUrl() resolution logic
    // -------------------------------------------------------------
    await test('getFrontendUrl() returns production Vercel domain in production when FRONTEND_URL is unset', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;
      delete process.env.RENDER;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://fiftyfiftygym.vercel.app');
      assert.strictEqual(url.includes('localhost'), false);
    });

    await test('getFrontendUrl() prevents localhost in production if FRONTEND_URL is accidentally set to localhost', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'http://localhost:5173';
      delete process.env.RENDER;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://fiftyfiftygym.vercel.app');
      assert.strictEqual(url.includes('localhost'), false);
    });

    await test('getFrontendUrl() prevents localhost when RENDER=true (Render cloud hosted environment)', () => {
      process.env.NODE_ENV = 'development'; // Even if someone forgot to change NODE_ENV on Render
      process.env.RENDER = 'true';
      process.env.FRONTEND_URL = 'http://localhost:5173';

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://fiftyfiftygym.vercel.app');
      assert.strictEqual(url.includes('localhost'), false);
    });

    await test('getFrontendUrl() strips trailing slashes cleanly in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://fiftyfiftygym.vercel.app/';
      delete process.env.RENDER;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://fiftyfiftygym.vercel.app');
      assert.strictEqual(url.endsWith('/'), false);
    });

    await test('getFrontendUrl() supports custom production domain if properly configured without localhost', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://customgymbrand.com';
      delete process.env.RENDER;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://customgymbrand.com');
      assert.strictEqual(url.includes('localhost'), false);
    });

    await test('getFrontendUrl() allows localhost in local development when configured', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RENDER;
      process.env.FRONTEND_URL = 'http://localhost:5173';

      const url = getFrontendUrl();
      assert.strictEqual(url, 'http://localhost:5173');
    });

    await test('getFrontendUrl() defaults to localhost:5173 in local development when FRONTEND_URL is unset', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RENDER;
      delete process.env.FRONTEND_URL;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'http://localhost:5173');
    });

    // -------------------------------------------------------------
    // 2. Sanitizer tests: sanitizeEmailUrl()
    // -------------------------------------------------------------
    await test('sanitizeEmailUrl() replaces localhost with production Vercel URL in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RENDER;

      const dirty = 'http://localhost:5173/gym/pranav-gym/setup-password?token=sec_abc123';
      const clean = sanitizeEmailUrl(dirty);

      assert.strictEqual(clean, 'https://fiftyfiftygym.vercel.app/gym/pranav-gym/setup-password?token=sec_abc123');
      assert.strictEqual(clean.includes('localhost'), false);
    });

    await test('sanitizeEmailUrl() leaves valid production Vercel URLs intact', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RENDER;

      const input = 'https://fiftyfiftygym.vercel.app/gym/pranav-gym/login';
      const output = sanitizeEmailUrl(input);

      assert.strictEqual(output, input);
    });

    // -------------------------------------------------------------
    // 3. Gym Owner Invitation Email Template Tests (Pranav GYM scenario)
    // -------------------------------------------------------------
    await test('Gym Owner invitation email for "Pranav GYM" contains production Vercel URLs', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://fiftyfiftygym.vercel.app';
      delete process.env.RENDER;

      const frontendUrl = getFrontendUrl();
      const gymSlug = 'pranav-gym';
      const secureToken = '4dd90af25ab3d79a5db251f2d8c29a3ecc90331bf7f7f38e5bc82200a9bc3ec7';
      const loginUrl = `${frontendUrl}/gym/${gymSlug}/login`;
      const activationUrl = `${frontendUrl}/gym/${gymSlug}/setup-password?token=${secureToken}`;

      const html = renderGymOwnerInvitationHtml({
        gymName: 'Pranav GYM',
        ownerName: 'Pranav Kondhalkar',
        ownerEmail: 'kondhalkarp1600@gmail.com',
        loginUrl,
        activationUrl,
        expiryHours: 48
      });

      const text = renderGymOwnerInvitationText({
        gymName: 'Pranav GYM',
        ownerName: 'Pranav Kondhalkar',
        ownerEmail: 'kondhalkarp1600@gmail.com',
        loginUrl,
        activationUrl,
        expiryHours: 48
      });

      // 1. Must never contain localhost or 127.0.0.1
      assert.strictEqual(html.includes('localhost'), false, 'HTML email must not contain localhost');
      assert.strictEqual(html.includes('127.0.0.1'), false, 'HTML email must not contain 127.0.0.1');
      assert.strictEqual(text.includes('localhost'), false, 'Text email must not contain localhost');
      assert.strictEqual(text.includes('127.0.0.1'), false, 'Text email must not contain 127.0.0.1');

      // 2. Gym Login URL must use production Vercel domain
      assert.strictEqual(html.includes('https://fiftyfiftygym.vercel.app/gym/pranav-gym/login'), true);
      assert.strictEqual(text.includes('https://fiftyfiftygym.vercel.app/gym/pranav-gym/login'), true);

      // 3. Set Password & Activate Portal button CTA must use production Vercel domain
      const ctaExpected = `href="https://fiftyfiftygym.vercel.app/gym/pranav-gym/setup-password?token=${secureToken}"`;
      assert.strictEqual(html.includes(ctaExpected), true);

      // 4. Fallback setup-password link must use production Vercel domain
      const fallbackExpected = `https://fiftyfiftygym.vercel.app/gym/pranav-gym/setup-password?token=${secureToken}`;
      assert.strictEqual(html.includes(fallbackExpected), true);
      assert.strictEqual(text.includes(fallbackExpected), true);

      // 5. Preserves dynamic gym slug and secure single-use token
      assert.strictEqual(html.includes('pranav-gym'), true);
      assert.strictEqual(html.includes(secureToken), true);
    });

    await test('Gym Owner invitation email sanitizes accidental localhost inputs in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RENDER;

      const html = renderGymOwnerInvitationHtml({
        gymName: 'Pranav GYM',
        ownerName: 'Pranav Kondhalkar',
        ownerEmail: 'kondhalkarp1600@gmail.com',
        loginUrl: 'http://localhost:5173/gym/pranav-gym/login',
        activationUrl: 'http://localhost:5173/gym/pranav-gym/setup-password?token=sec_tok_999',
        expiryHours: 48
      });

      assert.strictEqual(html.includes('localhost'), false, 'Fail-safe must cleanse localhost');
      assert.strictEqual(html.includes('https://fiftyfiftygym.vercel.app/gym/pranav-gym/login'), true);
      assert.strictEqual(html.includes('https://fiftyfiftygym.vercel.app/gym/pranav-gym/setup-password?token=sec_tok_999'), true);
    });

    // -------------------------------------------------------------
    // 4. Other Platform Email Templates
    // -------------------------------------------------------------
    await test('Super Admin and Gym Owner password reset emails never contain localhost in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RENDER;

      const saHtml = renderPasswordResetHtml({
        resetUrl: 'http://localhost:5173/reset-password?token=sa_tok',
        recipientName: 'Super Admin'
      });
      assert.strictEqual(saHtml.includes('localhost'), false);
      assert.strictEqual(saHtml.includes('https://fiftyfiftygym.vercel.app/reset-password?token=sa_tok'), true);

      const ownerHtml = renderGymOwnerPasswordResetHtml({
        resetUrl: 'http://localhost:5173/gym/pranav-gym/reset-password?token=owner_tok',
        recipientName: 'Gym Owner',
        gymName: 'Pranav GYM'
      });
      assert.strictEqual(ownerHtml.includes('localhost'), false);
      assert.strictEqual(ownerHtml.includes('https://fiftyfiftygym.vercel.app/gym/pranav-gym/reset-password?token=owner_tok'), true);
    });

    await test('Member invitation and password reset emails never contain localhost in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RENDER;

      const memberHtml = renderMemberInvitationHtml({
        gymName: 'Pranav GYM',
        memberName: 'Rahul Kumar',
        planName: 'Gold Annual',
        loginUrl: 'http://localhost:5173/gym/pranav-gym/rahul-kumar/login',
        activationUrl: 'http://localhost:5173/gym/pranav-gym/rahul-kumar/setup-password?token=mem_tok'
      });
      assert.strictEqual(memberHtml.includes('localhost'), false);
      assert.strictEqual(memberHtml.includes('https://fiftyfiftygym.vercel.app/gym/pranav-gym/rahul-kumar/setup-password?token=mem_tok'), true);
      assert.strictEqual(memberHtml.includes('https://fiftyfiftygym.vercel.app/gym/pranav-gym/rahul-kumar/login'), true);

      const memberResetHtml = renderMemberPasswordResetHtml({
        gymName: 'Pranav GYM',
        memberName: 'Rahul Kumar',
        resetUrl: 'http://localhost:5173/gym/pranav-gym/rahul-kumar/reset-password?token=mem_reset_tok'
      });
      assert.strictEqual(memberResetHtml.includes('localhost'), false);
      assert.strictEqual(memberResetHtml.includes('https://fiftyfiftygym.vercel.app/gym/pranav-gym/rahul-kumar/reset-password?token=mem_reset_tok'), true);
    });

  } finally {
    process.env = originalEnv;
  }

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runSuite();
