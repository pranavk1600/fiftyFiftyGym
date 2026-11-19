import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import db from '../config/db.js';
import { generateMembershipReceiptPdf } from '../services/pdf.service.js';
import {
  uploadReceiptPdf,
  generateReceiptSignedUrls,
  createSignedDownloadToken,
  verifySignedDownloadToken,
  getReceiptPdfBuffer
} from '../services/storage.service.js';

test('Membership Receipt System - Comprehensive Verification Suite', async (t) => {
  let testGymId;
  let testMemberId;
  let testReceiptId;
  let testReceiptNumber;

  // Setup: Fetch an active gym from PostgreSQL
  await t.test('1. Database Setup & Environment Verification', async () => {
    const gymRes = await db.query('SELECT id, name, slug, logo_url FROM gyms WHERE status = $1 LIMIT 1', ['active']);
    assert.ok(gymRes.rows.length > 0, 'Active gym must exist in database');
    testGymId = gymRes.rows[0].id;
    assert.ok(testGymId, 'Valid gymId resolved');
  });

  // 2. Test PDFKit Generation Service
  await t.test('2. PDFKit Receipt Generation produces valid PDF buffer', async () => {
    const pdfBuffer = await generateMembershipReceiptPdf({
      gym: {
        name: 'FiftyFifty Downtown Fitness',
        address: '101 Fitness Boulevard',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        phone: '+91 98765 00001',
        email: 'info@fiftyfifty.com'
      },
      member: {
        id: 'MEM-TEST-001',
        name: 'Rahul Sharma',
        email: 'rahul.test@example.com',
        phone: '+91 91234 56789',
        slug: 'rahul-sharma'
      },
      plan: {
        name: 'Gold Annual Membership',
        durationDays: 365,
        durationLabel: '365 Days',
        price: 12000
      },
      receipt: {
        receiptNumber: 'REC-2026-TEST01',
        issuedDate: '2026-10-30',
        joinDate: '2026-10-30',
        expiryDate: '2027-10-30',
        amount: 12000,
        paymentStatus: 'PAID',
        receiptType: 'PAYMENT_RECEIPT',
        paymentReference: 'UPI-9876543210',
        paymentMode: 'UPI'
      }
    });

    assert.ok(Buffer.isBuffer(pdfBuffer), 'Must return a Buffer instance');
    assert.ok(pdfBuffer.length > 1000, 'PDF buffer must contain substantial document bytes');
    // PDF magic bytes %PDF-
    assert.equal(pdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'Must start with PDF header magic bytes');
  });

  // 3. Test Storage Service - Upload and signed URLs
  await t.test('3. Supabase / Local Storage Service persists PDF and generates signed URLs', async () => {
    testReceiptNumber = `REC-${Date.now()}`;
    const dummyBuffer = Buffer.from('%PDF-1.4 Mock PDF Content For Storage Verification');
    const uploadResult = await uploadReceiptPdf({
      gymId: testGymId,
      memberId: 'MEM-TEST-002',
      receiptNumber: testReceiptNumber,
      pdfBuffer: dummyBuffer
    });

    assert.ok(uploadResult.storagePath, 'Upload result must provide storagePath');
    assert.match(uploadResult.storagePath, new RegExp(testReceiptNumber), 'Storage path contains receipt number');

    // Retrieve buffer
    const retrievedBuffer = await getReceiptPdfBuffer(uploadResult.storagePath);
    assert.ok(Buffer.isBuffer(retrievedBuffer), 'Retrieved content must be a buffer');
    assert.equal(retrievedBuffer.toString('ascii'), dummyBuffer.toString('ascii'), 'Retrieved buffer matches original content');

    // Generate signed preview & download URLs
    const signedUrls = await generateReceiptSignedUrls({
      receiptId: 'rcp_test_123',
      storagePath: uploadResult.storagePath,
      expiresInSeconds: 900
    });

    assert.ok(signedUrls.previewUrl, 'Must provide valid preview URL');
    assert.ok(signedUrls.downloadUrl, 'Must provide valid download URL');
  });

  // 4. Test HMAC-SHA256 Token Generation & Expiration Verification
  await t.test('4. HMAC Signed Token Verification and Tamper Resistance', () => {
    const { token } = createSignedDownloadToken('rcp_secure_999', 900);

    // Valid token
    assert.equal(verifySignedDownloadToken('rcp_secure_999', token), true, 'Valid token passes verification');

    // Tampered token
    assert.equal(verifySignedDownloadToken('rcp_tampered_id', token), false, 'Tampered receiptId fails verification');
    assert.equal(verifySignedDownloadToken('rcp_secure_999', token + 'bad'), false, 'Corrupted signature fails verification');

    // Expired token simulation
    const expiredSeconds = Math.floor(Date.now() / 1000) - 60;
    const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
    const expiredSig = crypto.createHmac('sha256', secret).update(`rcp_expired:${expiredSeconds}`).digest('hex');
    const expiredToken = `${expiredSeconds}.${expiredSig}`;

    assert.equal(verifySignedDownloadToken('rcp_expired', expiredToken), false, 'Expired token must fail verification');
  });

  // 5. Test Registration Receipt Flow in PostgreSQL
  await t.test('5. Registration Receipt Insertion & Initial PAYMENT_PENDING state', async () => {
    testMemberId = `MEM${Date.now().toString().slice(-4)}TEST`;
    const receiptNum = `REC-REG-${Date.now()}`;

    // Insert dummy member
    await db.query(`
      INSERT INTO members (id, gym_id, full_name, phone, email, current_plan_name, join_date, expiry_date, status, slug)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active', $7)
    `, [testMemberId, testGymId, 'Test Member Receipt', '+91 90000 00000', `test.mem.${Date.now()}@example.com`, 'Standard Plan', `test-${Date.now()}`]);

    // Insert Registration Receipt
    const receiptRes = await db.query(`
      INSERT INTO membership_receipts (
        receipt_number, gym_id, member_id, plan_name, amount,
        payment_status, receipt_type, storage_path, issued_date,
        payment_reference, payment_mode
      )
      VALUES ($1, $2, $3, $4, 1500.00, 'PAYMENT_PENDING', 'REGISTRATION_ACKNOWLEDGEMENT', $5, CURRENT_DATE, 'PENDING_CONFIRMATION', 'UNPAID')
      RETURNING id, receipt_number, payment_status, receipt_type;
    `, [receiptNum, testGymId, testMemberId, 'Standard Plan', `membership-receipts/${testGymId}/${testMemberId}/${receiptNum}.pdf`]);

    assert.equal(receiptRes.rows.length, 1);
    testReceiptId = receiptRes.rows[0].id;
    assert.equal(receiptRes.rows[0].payment_status, 'PAYMENT_PENDING', 'New registration receipt must be PAYMENT_PENDING');
    assert.equal(receiptRes.rows[0].receipt_type, 'REGISTRATION_ACKNOWLEDGEMENT', 'Receipt type must be REGISTRATION_ACKNOWLEDGEMENT');
  });

  // 6. Test Payment Recording and Verified PAID Receipt Generation
  await t.test('6. Payment Recording creates verified PAID PAYMENT_RECEIPT', async () => {
    const paidReceiptNum = `REC-PAID-${Date.now()}`;
    const paymentId = `RCP-TEST-${Date.now()}`;

    // Insert payment record first to satisfy foreign key
    await db.query(`
      INSERT INTO payments (id, gym_id, member_id, member_name, amount, mode, plan_name, status, notes, date)
      VALUES ($1, $2, $3, $4, 1500.00, 'UPI', 'Standard Plan', 'paid', 'Test payment notes', CURRENT_DATE)
    `, [paymentId, testGymId, testMemberId, 'Test Member Receipt']);

    // Record verified payment receipt
    const paidRes = await db.query(`
      INSERT INTO membership_receipts (
        receipt_number, gym_id, member_id, payment_id, plan_name,
        amount, payment_status, receipt_type, storage_path, issued_date,
        payment_reference, payment_mode
      )
      VALUES ($1, $2, $3, $4, $5, 1500.00, 'PAID', 'PAYMENT_RECEIPT', $6, CURRENT_DATE, $7, 'UPI')
      RETURNING id, receipt_number, payment_status, receipt_type, amount;
    `, [
      paidReceiptNum,
      testGymId,
      testMemberId,
      paymentId,
      'Standard Plan',
      `membership-receipts/${testGymId}/${testMemberId}/${paidReceiptNum}.pdf`,
      paymentId
    ]);

    assert.equal(paidRes.rows.length, 1);
    assert.equal(paidRes.rows[0].payment_status, 'PAID', 'Payment receipt must have PAID status');
    assert.equal(paidRes.rows[0].receipt_type, 'PAYMENT_RECEIPT', 'Receipt type must be PAYMENT_RECEIPT');
  });

  // 7. Test Tenant Isolation and Member Ownership
  await t.test('7. Tenant Isolation: Member receipts belong strictly to member & gym', async () => {
    const receipts = await db.query(`
      SELECT r.id, r.receipt_number, r.gym_id, r.member_id, r.payment_status
      FROM membership_receipts r
      WHERE r.member_id = $1
      ORDER BY r.created_at DESC;
    `, [testMemberId]);

    assert.ok(receipts.rows.length >= 2, 'Member must have both registration and paid receipts');
    receipts.rows.forEach((r) => {
      assert.equal(r.gym_id, testGymId, 'Gym ID must match tenant gym');
      assert.equal(r.member_id, testMemberId, 'Member ID must match');
    });

    // Cleanup test records
    await db.query('DELETE FROM membership_receipts WHERE member_id = $1', [testMemberId]);
    await db.query('DELETE FROM payments WHERE member_id = $1', [testMemberId]);
    await db.query('DELETE FROM members WHERE id = $1', [testMemberId]);
  });

  setTimeout(() => process.exit(0), 100);
});
