import assert from 'node:assert/strict';
import {
  PRODUCTION_FRONTEND_URL,
  LOCAL_DEV_FRONTEND_URL,
  DISCONTINUED_DOMAINS,
  isProductionEnvironment,
  getFrontendUrl,
  getMemberFrontendUrl,
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
  console.log('Production Active Domain (leopardxgyms.vercel.app) Test');
  console.log('======================================================\n');

  const originalEnv = { ...process.env };

  try {
    // -------------------------------------------------------------
    // 1. Config tests: getFrontendUrl() and getMemberFrontendUrl()
    // -------------------------------------------------------------
    await test('PRODUCTION_FRONTEND_URL is set to https://leopardxgyms.vercel.app', () => {
      assert.strictEqual(PRODUCTION_FRONTEND_URL, 'https://leopardxgyms.vercel.app');
    });

    await test('getFrontendUrl() returns active production domain when FRONTEND_URL is unset', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;
      delete process.env.RENDER;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://leopardxgyms.vercel.app');
      assert.strictEqual(url.includes('fiftyfiftygym.vercel.app'), false);
      assert.strictEqual(url.includes('localhost'), false);
    });

    await test('getFrontendUrl() prevents localhost in production if FRONTEND_URL is set to localhost', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'http://localhost:5173';
      delete process.env.RENDER;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://leopardxgyms.vercel.app');
      assert.strictEqual(url.includes('localhost'), false);
    });

    await test('getFrontendUrl() automatically overrides discontinued fiftyfiftygym.vercel.app domain', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://fiftyfiftygym.vercel.app';
      delete process.env.RENDER;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://leopardxgyms.vercel.app');
      assert.strictEqual(url.includes('fiftyfiftygym.vercel.app'), false);
    });

    await test('getFrontendUrl() strips trailing slash cleanly', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://leopardxgyms.vercel.app/';
      delete process.env.RENDER;

      const url = getFrontendUrl();
      assert.strictEqual(url, 'https://leopardxgyms.vercel.app');
      assert.strictEqual(url.endsWith('/'), false);
    });

    await test('getMemberFrontendUrl() returns active domain and respects distinct MEMBER_FRONTEND_URL', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;
      delete process.env.MEMBER_FRONTEND_URL;
      delete process.env.RENDER;

      // Default fallback
      assert.strictEqual(getMemberFrontendUrl(), 'https://leopardxgyms.vercel.app');

      // Overrides discontinued domain if passed in MEMBER_FRONTEND_URL
      process.env.MEMBER_FRONTEND_URL = 'https://fiftyfiftygym.vercel.app';
      assert.strictEqual(getMemberFrontendUrl(), 'https://leopardxgyms.vercel.app');

      // Custom valid domain
      process.env.MEMBER_FRONTEND_URL = 'https://members.leopardxgyms.vercel.app';
      assert.strictEqual(getMemberFrontendUrl(), 'https://members.leopardxgyms.vercel.app');
    });

    await test('getFrontendUrl() preserves localhost in local development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RENDER;
      delete process.env.FRONTEND_URL;

      assert.strictEqual(getFrontendUrl(), 'http://localhost:5173');

      process.env.FRONTEND_URL = 'http://localhost:5173';
      assert.strictEqual(getFrontendUrl(), 'http://localhost:5173');
    });

    // -------------------------------------------------------------
    // 2. Sanitizer tests: sanitizeEmailUrl()
    // -------------------------------------------------------------
    await test('sanitizeEmailUrl() replaces discontinued domain with active leopardxgyms domain', () => {
      const oldUrl = 'https://fiftyfiftygym.vercel.app/gym/pranav-gym/setup-password?token=sec_abc123';
      const clean = sanitizeEmailUrl(oldUrl);

      assert.strictEqual(clean, 'https://leopardxgyms.vercel.app/gym/pranav-gym/setup-password?token=sec_abc123');
      assert.strictEqual(clean.includes('fiftyfiftygym.vercel.app'), false);
    });

    await test('sanitizeEmailUrl() replaces localhost with active domain in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RENDER;

      const dirty = 'http://localhost:5173/gym/pranav-gym/login';
      const clean = sanitizeEmailUrl(dirty);

      assert.strictEqual(clean, 'https://leopardxgyms.vercel.app/gym/pranav-gym/login');
      assert.strictEqual(clean.includes('localhost'), false);
    });

    // -------------------------------------------------------------
    // 3. Gym Owner Invitation Email Template Tests (Pranav GYM scenario)
    // -------------------------------------------------------------
    await test('Gym Owner invitation email for "Pranav GYM" uses https://leopardxgyms.vercel.app', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://leopardxgyms.vercel.app';
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

      // No old domain or localhost
      assert.strictEqual(html.includes('fiftyfiftygym.vercel.app'), false);
      assert.strictEqual(html.includes('localhost'), false);
      assert.strictEqual(text.includes('fiftyfiftygym.vercel.app'), false);
      assert.strictEqual(text.includes('localhost'), false);

      // Exact expected URLs
      assert.strictEqual(loginUrl, 'https://leopardxgyms.vercel.app/gym/pranav-gym/login');
      assert.strictEqual(activationUrl, `https://leopardxgyms.vercel.app/gym/pranav-gym/setup-password?token=${secureToken}`);

      // Verification in HTML & Text
      assert.strictEqual(html.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/login'), true);
      assert.strictEqual(text.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/login'), true);

      const ctaExpected = `href="https://leopardxgyms.vercel.app/gym/pranav-gym/setup-password?token=${secureToken}"`;
      assert.strictEqual(html.includes(ctaExpected), true);

      const fallbackExpected = `https://leopardxgyms.vercel.app/gym/pranav-gym/setup-password?token=${secureToken}`;
      assert.strictEqual(html.includes(fallbackExpected), true);
      assert.strictEqual(text.includes(fallbackExpected), true);
    });

    // -------------------------------------------------------------
    // 4. Member Invitation & Password Reset Emails
    // -------------------------------------------------------------
    await test('Member invitation and password reset emails use active domain leopardxgyms.vercel.app', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://leopardxgyms.vercel.app';
      delete process.env.RENDER;
      delete process.env.MEMBER_FRONTEND_URL;

      const memberFrontendUrl = getMemberFrontendUrl();
      const gymSlug = 'pranav-gym';
      const memberSlug = 'rahul-kumar';
      const rawActivationToken = 'mem_act_token_777';

      const loginUrl = `${memberFrontendUrl}/gym/${gymSlug}/${memberSlug}/login`;
      const activationUrl = `${memberFrontendUrl}/gym/${gymSlug}/${memberSlug}/setup-password?token=${rawActivationToken}`;

      const memberHtml = renderMemberInvitationHtml({
        gymName: 'Pranav GYM',
        memberName: 'Rahul Kumar',
        planName: 'Gold Annual',
        loginUrl,
        activationUrl
      });

      assert.strictEqual(memberHtml.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/setup-password?token=mem_act_token_777'), true);
      assert.strictEqual(memberHtml.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/login'), true);
      assert.strictEqual(memberHtml.includes('fiftyfiftygym.vercel.app'), false);
      assert.strictEqual(memberHtml.includes('localhost'), false);

      const resetUrl = `${memberFrontendUrl}/gym/${gymSlug}/${memberSlug}/reset-password?token=mem_reset_123`;
      const resetHtml = renderMemberPasswordResetHtml({
        gymName: 'Pranav GYM',
        memberName: 'Rahul Kumar',
        resetUrl
      });

      assert.strictEqual(resetHtml.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/reset-password?token=mem_reset_123'), true);
      assert.strictEqual(resetHtml.includes('fiftyfiftygym.vercel.app'), false);
      assert.strictEqual(resetHtml.includes('localhost'), false);
    });

    await test('Super Admin and Gym Owner password reset emails use active domain leopardxgyms.vercel.app', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://leopardxgyms.vercel.app';
      delete process.env.RENDER;

      const frontendUrl = getFrontendUrl();
      const saReset = `${frontendUrl}/reset-password?token=sa_tok_888`;
      const saHtml = renderPasswordResetHtml({ resetUrl: saReset });

      assert.strictEqual(saHtml.includes('https://leopardxgyms.vercel.app/reset-password?token=sa_tok_888'), true);
      assert.strictEqual(saHtml.includes('fiftyfiftygym.vercel.app'), false);
      assert.strictEqual(saHtml.includes('localhost'), false);

      const ownerReset = `${frontendUrl}/gym/pranav-gym/reset-password?token=owner_tok_999`;
      const ownerHtml = renderGymOwnerPasswordResetHtml({ resetUrl: ownerReset, gymName: 'Pranav GYM' });

      assert.strictEqual(ownerHtml.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/reset-password?token=owner_tok_999'), true);
      assert.strictEqual(ownerHtml.includes('fiftyfiftygym.vercel.app'), false);
      assert.strictEqual(ownerHtml.includes('localhost'), false);
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
