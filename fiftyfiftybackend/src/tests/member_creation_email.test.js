import assert from 'node:assert/strict';
import {
  renderMemberInvitationHtml,
  renderMemberInvitationText,
  sendMemberInvitationEmail,
  sendEmail,
  setEmailDispatcherForTest
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
  console.log('Member Creation Welcome Email & Brevo Dispatch Tests');
  console.log('======================================================\n');

  try {
    // 1. Text Template Execution & Absence of ReferenceErrors
    await test('renderMemberInvitationText renders successfully without ReferenceErrors', () => {
      const text = renderMemberInvitationText({
        gymName: 'Pranav GYM',
        memberName: 'Rahul Kumar',
        idNo: '2106',
        planName: 'Gym + cardio',
        durationMonths: 1,
        startDate: '2026-11-23',
        expiryDate: '2026-12-23',
        totalAmount: 1200,
        paidAmount: 1200,
        balanceAmount: 0,
        loginUrl: 'https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/login',
        activationUrl: 'https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/setup-password?token=abc123token',
        expiryDays: 7
      });

      assert.ok(typeof text === 'string' && text.length > 50, 'Text output must be a non-empty string');
      assert.ok(text.includes('WELCOME TO PRANAV GYM'), 'Must include gym name in uppercase');
      assert.ok(text.includes('Rahul Kumar'), 'Must include member name');
      assert.ok(text.includes('Member ID / Receipt #: 2106'), 'Must include member ID');
      assert.ok(text.includes('Plan: Gym + cardio'), 'Must include plan name');
      assert.ok(text.includes('Duration: 1 Month(s)'), 'Must include duration');
      assert.ok(text.includes('Start Date: 2026-11-23'), 'Must include start date');
      assert.ok(text.includes('Expiry Date: 2026-12-23'), 'Must include expiry date');
      assert.ok(text.includes('Total Fee: ₹1200'), 'Must include total fee');
      assert.ok(text.includes('Amount Paid: ₹1200'), 'Must include paid amount');
      assert.ok(text.includes('Balance Due: ₹0'), 'Must include balance due');
      assert.ok(text.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/setup-password?token=abc123token'), 'Must include activation URL');
      assert.ok(text.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/login'), 'Must include login portal URL');
    });

    // 2. HTML Template Branding & Content Check
    await test('renderMemberInvitationHtml renders rich branded email layout', () => {
      const html = renderMemberInvitationHtml({
        gymName: 'Pranav GYM',
        gymLogoUrl: 'https://res.cloudinary.com/demo/image/upload/pranav_logo.png',
        memberName: 'Rahul Kumar',
        idNo: '2106',
        planName: 'Gym + cardio',
        durationMonths: 1,
        startDate: '2026-11-23',
        expiryDate: '2026-12-23',
        totalAmount: 1200,
        paidAmount: 1000,
        balanceAmount: 200,
        loginUrl: 'https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/login',
        activationUrl: 'https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/setup-password?token=abc123token',
        expiryDays: 7
      });

      assert.ok(html.includes('Welcome to Pranav GYM, Rahul Kumar!'), 'Must include personalized header');
      assert.ok(html.includes('https://res.cloudinary.com/demo/image/upload/pranav_logo.png'), 'Must include gym logo URL');
      assert.ok(html.includes('₹1200'), 'Must render total fee');
      assert.ok(html.includes('₹1000'), 'Must render paid amount');
      assert.ok(html.includes('₹200'), 'Must render balance amount');
      assert.ok(html.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/setup-password?token=abc123token'), 'Must include activation link in CTA');
      assert.ok(html.includes('https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/login'), 'Must include member login portal URL');
    });

    // 3. Graceful handling of missing/empty email
    await test('sendMemberInvitationEmail gracefully skips when email is empty or missing', async () => {
      const resNull = await sendMemberInvitationEmail({ to: null, gymName: 'Pranav GYM', memberName: 'No Email' });
      assert.strictEqual(resNull.success, false);
      assert.strictEqual(resNull.status, 'skipped');

      const resEmpty = await sendMemberInvitationEmail({ to: '   ', gymName: 'Pranav GYM', memberName: 'Empty Email' });
      assert.strictEqual(resEmpty.success, false);
      assert.strictEqual(resEmpty.status, 'skipped');
    });

    // 4. Successful Email Dispatch with Mock Dispatcher
    await test('sendMemberInvitationEmail dispatches complete email payload including PDF attachment', async () => {
      let dispatchedPayload = null;
      setEmailDispatcherForTest(async (payload) => {
        dispatchedPayload = payload;
        return { success: true, messageId: '<test-message-id-999@brevo.com>' };
      });

      const fakePdfBuffer = Buffer.from('FAKE_PDF_HEADER_DATA');
      const result = await sendMemberInvitationEmail({
        to: 'member@example.com',
        gymName: 'Pranav GYM',
        memberName: 'Rahul Kumar',
        idNo: '2106',
        planName: 'Gym + cardio',
        durationMonths: 1,
        startDate: '2026-11-23',
        expiryDate: '2026-12-23',
        totalAmount: 1200,
        paidAmount: 1200,
        balanceAmount: 0,
        loginUrl: 'https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/login',
        activationUrl: 'https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/setup-password?token=sec_token',
        receiptPdfBuffer: fakePdfBuffer,
        receiptNumber: '4372'
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.messageId, '<test-message-id-999@brevo.com>');
      assert.ok(dispatchedPayload, 'Dispatcher must receive payload');
      assert.strictEqual(dispatchedPayload.to, 'member@example.com');
      assert.strictEqual(dispatchedPayload.recipientName, 'Rahul Kumar');
      assert.strictEqual(dispatchedPayload.subject, 'Welcome to Pranav GYM – Your Member Portal Access');
      assert.ok(dispatchedPayload.attachments, 'Payload should include attachments');
      assert.strictEqual(dispatchedPayload.attachments.length, 1);
      assert.strictEqual(dispatchedPayload.attachments[0].name, '4372.pdf');
      assert.strictEqual(dispatchedPayload.attachments[0].content, fakePdfBuffer.toString('base64'));

      // Clear test dispatcher
      setEmailDispatcherForTest(null);
    });

    // 5. Resilience: Retry without attachment if Brevo rejects payload with attachment
    await test('sendEmail retries without attachment if attachment causes dispatch rejection', async () => {
      let attemptCount = 0;
      let finalUsedAttachment = undefined;

      setEmailDispatcherForTest(async (payload) => {
        attemptCount++;
        finalUsedAttachment = payload.attachments;
        return { success: true, messageId: '<retry-success@brevo.com>' };
      });

      const fakePdfBuffer = Buffer.from('CORRUPT_OR_OVERSIZED_DATA');
      const result = await sendMemberInvitationEmail({
        to: 'retry@example.com',
        gymName: 'Pranav GYM',
        memberName: 'Test Member',
        idNo: '2107',
        receiptNumber: '4373',
        receiptPdfBuffer: fakePdfBuffer
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(attemptCount, 1);
      assert.ok(finalUsedAttachment);

      setEmailDispatcherForTest(null);
    });

    // 6. Security check: no plain passwords in emails
    await test('Member invitation email contains ZERO plain-text passwords', () => {
      const text = renderMemberInvitationText({
        gymName: 'Pranav GYM',
        memberName: 'Rahul Kumar',
        activationUrl: 'https://leopardxgyms.vercel.app/gym/pranav-gym/rahul-kumar/setup-password?token=sec'
      });

      assert.strictEqual(/temporary password|your password is/i.test(text), false, 'Must never leak plain-text credentials');
      assert.ok(text.includes('ACTIVATE YOUR ACCOUNT & SET YOUR PASSWORD'), 'Must prompt user to set their own password');
    });

  } finally {
    setEmailDispatcherForTest(null);
  }

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
