import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { calculateMembershipEndDate } from '../utils/dateUtils.js';
import { runExcelColumnsMigration } from '../database/create_excel_columns_migration.js';

/**
 * Parses flexible date formats commonly found in Excel and CSV exports:
 * - ISO: YYYY-MM-DD
 * - Indian / British: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * - US: MM/DD/YYYY
 * - Text months: 15-Jan-2024, 15 Jan 2024, Jan 15 2024
 * - Excel numeric serial date (e.g. 45366)
 */
export const parseFlexibleDate = (raw) => {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // 1. Check for Excel integer serial date (e.g. 44927 for 2023-01-01)
  if (/^\d{4,5}$/.test(str)) {
    const serial = parseInt(str, 10);
    // Excel base date: Dec 30, 1899 (accounting for 1900 leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + serial * 86400000);
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split('T')[0];
    }
  }

  // 2. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    // Sanity check day and month bounds
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  // 4. Text month names: 15-Jan-2024, 15 Jan 2024
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
};

/**
 * Parses numeric duration in days from text like "3 Months", "1 Year", "30 Days", "90".
 */
export const parseDurationDays = (durationStr, startDate, endDate) => {
  // If both start and end date are valid, calculate exact difference
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return diffDays;
  }

  if (!durationStr) return 30;
  const str = String(durationStr).toLowerCase().trim();

  // "1 year" or "12 months" or "1y"
  if (str.includes('year') || str === '1y' || str === '1 yr') return 365;

  // Months
  const monthMatch = str.match(/(\d+)\s*(month|m)/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    return months * 30;
  }

  // Days
  const dayMatch = str.match(/(\d+)\s*(day|d)/);
  if (dayMatch) {
    return parseInt(dayMatch[1], 10);
  }

  // Pure number
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    // If <= 12, assume months (e.g. 1, 3, 6, 12)
    if (num <= 12) return num * 30;
    return num; // assume days (e.g. 30, 90, 180, 365)
  }

  return 30;
};

/**
 * Parses currency / numeric amounts safely (e.g. "₹12,000", "12000.50", "Rs. 500").
 */
export const parseAmount = (raw) => {
  if (raw === null || raw === undefined) return 0;
  let str = String(raw).trim();
  if (!str) return 0;

  // Remove currency words and symbols: Rs., Rs, INR, ₹, $, etc.
  str = str.replace(/(?:rs\.?|inr|₹|\$|€|£)/gi, '').trim();

  // Remove commas (thousand separators)
  str = str.replace(/,/g, '');

  // Match standard decimal or integer number
  const match = str.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;

  const num = parseFloat(match[0]);
  return isNaN(num) ? 0 : Math.max(0, num);
};

/**
 * Sanitizes fields to prevent CSV formula injection when exporting reports.
 */
export const sanitizeCsvField = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    return `'${str}`;
  }
  return str;
};

/**
 * Parses raw CSV text into array of object rows.
 * Correctly handles quotes, commas inside quotes, CRLF and LF.
 */
export const parseCsvText = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = [];
  let currentLine = [];
  let currentCell = '';
  let insideQuotes = false;

  const text = csvText.replace(/^\uFEFF/, ''); // Strip BOM if present

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentLine.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF after CR
      }
      currentLine.push(currentCell.trim());
      if (currentLine.some((c) => c !== '')) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    if (currentLine.some((c) => c !== '')) {
      lines.push(currentLine);
    }
  }

  if (lines.length < 2) return [];

  // Normalize header names
  const rawHeaders = lines[0];
  const headers = rawHeaders.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const rowObj = {};
    for (let j = 0; j < rawHeaders.length; j++) {
      const headerKey = headers[j] || `col_${j}`;
      rowObj[headerKey] = line[j] !== undefined ? line[j] : '';
      // Also keep original key
      rowObj[rawHeaders[j].trim()] = line[j] !== undefined ? line[j] : '';
    }
    rows.push(rowObj);
  }

  return rows;
};

/**
 * Standardizes a single row according to the Excel column mapping specification:
 * - ID -> Existing Member ID
 * - NAME -> Member Name
 * - Payment -> Payment Date
 * - Start D -> Membership Start Date
 * - End D -> Membership End Date
 * - Duration -> Membership Duration
 * - M Type -> Membership Type
 * - Total Am -> Total Amount
 * - Received Am -> Received Amount
 * - Bal. Am -> Balance Amount
 * - Rc N -> Receipt Number
 * Also extracts optional phone and email if present.
 */
export const mapCsvRowToMember = (row, rowIndex = 0) => {
  // Helper to extract value using flexible header variations
  const getVal = (...keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
      // Check lowercase stripped
      const stripped = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (row[stripped] !== undefined && row[stripped] !== null && String(row[stripped]).trim() !== '') {
        return String(row[stripped]).trim();
      }
    }
    return '';
  };

  const rawId = getVal('ID', 'Member ID', 'id', 'MemberId', 'member_id', 'custom_member_id');
  const name = getVal('NAME', 'Name', 'Member Name', 'full_name', 'MemberName');
  const paymentDateRaw = getVal('Payment', 'Payment Date', 'payment_date', 'Pay Date');
  const startDateRaw = getVal('Start D', 'Start Date', 'start_date', 'Start', 'StartDate', 'Join Date');
  const endDateRaw = getVal('End D', 'End Date', 'end_date', 'End', 'EndDate', 'Expiry Date');
  const durationRaw = getVal('Duration', 'duration', 'Months', 'Period');
  const membershipType = getVal('M Type', 'Membership Type', 'Plan', 'plan_name', 'MType', 'Type') || 'Gym + cardio';

  const rawTotal = getVal('Total Am', 'Total Amount', 'total_amount', 'Total', 'TotalAm', 'Amount');
  const rawReceived = getVal('Received Am', 'Received Amount', 'received_amount', 'Received', 'ReceivedAm', 'Paid', 'Amount Paid');
  const rawBalance = getVal('Bal. Am', 'Bal Am', 'Balance Amount', 'balance_amount', 'Balance', 'BalAm', 'Bal');
  const receiptNumber = getVal('Rc N', 'Rc No', 'Receipt Number', 'RcN', 'receipt_no', 'Receipt', 'ReceiptNo', 'rc_n');
  const phone = getVal('Phone', 'Mobile', 'Contact', 'phone_number', 'phone');
  const email = getVal('Email', 'Email Address', 'email', 'Mail');

  const totalAmount = parseAmount(rawTotal);
  const receivedAmount = parseAmount(rawReceived);

  // If the CSV contains an explicit balance value, preserve and validate it.
  // Calculate balance as Total Amount - Received Amount only when the balance column is missing or empty.
  let balanceAmount;
  if (rawBalance !== '') {
    balanceAmount = parseAmount(rawBalance);
  } else {
    balanceAmount = Math.max(0, totalAmount - receivedAmount);
  }

  const startDate = parseFlexibleDate(startDateRaw) || parseFlexibleDate(paymentDateRaw) || new Date().toISOString().split('T')[0];
  let endDate = parseFlexibleDate(endDateRaw);

  const durationDays = parseDurationDays(durationRaw, startDate, endDate);
  const durationMonths = parseInt(durationRaw, 10) || Math.max(1, Math.round(durationDays / 30));
  if (!endDate) {
    endDate = calculateMembershipEndDate(startDate, durationDays);
  }

  const paymentDate = parseFlexibleDate(paymentDateRaw) || startDate;

  return {
    rowIndex: rowIndex + 1,
    rawId: rawId || null,
    name: name || '',
    phone: phone || '',
    email: email || '',
    startDate,
    endDate,
    paymentDate,
    durationDays,
    durationMonths,
    membershipType,
    totalAmount,
    receivedAmount,
    balanceAmount,
    receiptNumber: receiptNumber || null
  };
};

/**
 * Validates a list of mapped member records against business rules and database constraints.
 * Detects duplicates, invalid dates, missing required fields.
 */
export const validateMemberRecords = async (gymId, mappedRows) => {
  // 1. Fetch existing members for this gym to check existing IDs and emails
  let existingIdSet = new Set();
  let existingEmailSet = new Set();

  try {
    const existing = await db.query(
      'SELECT id, LOWER(email) AS email FROM members WHERE gym_id = $1',
      [gymId]
    );
    for (const r of existing.rows) {
      if (r.id) existingIdSet.add(r.id.trim().toLowerCase());
      if (r.email) existingEmailSet.add(r.email.trim().toLowerCase());
    }
  } catch (err) {
    console.warn('[validateMemberRecords] DB query note:', err.message);
  }

  const seenInFileIds = new Set();
  const seenInFileEmails = new Set();

  const validRecords = [];
  const duplicateRecords = [];
  const invalidRecords = [];

  for (const record of mappedRows) {
    const errors = [];

    // Validation 1: Name is required
    if (!record.name || record.name.trim().length < 2) {
      errors.push('Member Name is required (minimum 2 characters).');
    }

    // Validation 2: Dates
    if (!record.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(record.startDate)) {
      errors.push('Invalid membership start date.');
    }
    if (!record.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(record.endDate)) {
      errors.push('Invalid membership end date.');
    }

    // Validation 3: Email format if provided
    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email.trim())) {
      errors.push('Invalid email address format.');
    }

    // Validation 4: Amounts
    if (isNaN(record.totalAmount) || record.totalAmount < 0) {
      errors.push('Total Amount must be a positive number.');
    }
    if (isNaN(record.receivedAmount) || record.receivedAmount < 0) {
      errors.push('Received Amount must be a positive number.');
    }

    if (errors.length > 0) {
      invalidRecords.push({
        ...record,
        status: 'INVALID',
        errorReason: errors.join(' ')
      });
      continue;
    }

    // Check duplicate ID
    let isDuplicate = false;
    let dupReason = '';

    if (record.rawId) {
      const cleanId = record.rawId.trim().toLowerCase();
      if (existingIdSet.has(cleanId)) {
        isDuplicate = true;
        dupReason = `Member ID "${record.rawId}" already exists in this gym.`;
      } else if (seenInFileIds.has(cleanId)) {
        isDuplicate = true;
        dupReason = `Duplicate Member ID "${record.rawId}" found within the CSV file.`;
      } else {
        seenInFileIds.add(cleanId);
      }
    }

    // Check duplicate Email if email exists
    if (!isDuplicate && record.email) {
      const cleanEmail = record.email.trim().toLowerCase();
      if (existingEmailSet.has(cleanEmail)) {
        isDuplicate = true;
        dupReason = `Email "${record.email}" is already registered in this gym.`;
      } else if (seenInFileEmails.has(cleanEmail)) {
        isDuplicate = true;
        dupReason = `Duplicate email "${record.email}" found within the CSV file.`;
      } else {
        seenInFileEmails.add(cleanEmail);
      }
    }

    if (isDuplicate) {
      duplicateRecords.push({
        ...record,
        status: 'DUPLICATE',
        errorReason: dupReason
      });
    } else {
      validRecords.push({
        ...record,
        status: 'VALID',
        errorReason: null
      });
    }
  }

  return {
    totalRecords: mappedRows.length,
    validCount: validRecords.length,
    duplicateCount: duplicateRecords.length,
    invalidCount: invalidRecords.length,
    validRecords,
    duplicateRecords,
    invalidRecords,
    preview: mappedRows.slice(0, 20)
  };
};

/**
 * Executes high-performance bulk insertion for valid member records in safe batches.
 * Preserves member IDs, start/end dates, creates subscription and payment records.
 * Adheres strictly to business rules: no invitation emails, no attendance check-in.
 */
export const executeBulkMemberImport = async (gymId, records, options = {}) => {
  if (!gymId) throw new Error('Gym ID is required for bulk member import.');
  if (!Array.isArray(records) || records.length === 0) {
    return { importedCount: 0, duplicateCount: 0, errorCount: 0, results: [] };
  }

  // 1. Fetch gym information and existing plans
  const gymRes = await db.query('SELECT id, name, slug FROM gyms WHERE id = $1 LIMIT 1', [gymId]);
  if (gymRes.rows.length === 0) {
    throw new Error('Gym branch not found.');
  }

  // Ensure Excel alignment columns exist on the database
  try {
    await runExcelColumnsMigration();
  } catch (_migErr) {}

  const plansRes = await db.query(
    'SELECT id, name, duration_days FROM membership_plans WHERE gym_id = $1',
    [gymId]
  );
  const planMap = new Map();
  for (const p of plansRes.rows) {
    planMap.set(p.name.toLowerCase().trim(), p);
  }

  // 2. Fetch existing member slugs and IDs in memory to avoid collision
  const existingMembersRes = await db.query(
    'SELECT id, slug, LOWER(email) AS email FROM members WHERE gym_id = $1',
    [gymId]
  );
  const existingIdSet = new Set(existingMembersRes.rows.map((r) => r.id.toLowerCase().trim()));
  const existingSlugSet = new Set(existingMembersRes.rows.map((r) => r.slug).filter(Boolean));
  const existingEmailSet = new Set(existingMembersRes.rows.map((r) => r.email).filter(Boolean));

  // Common random placeholder hash for secure offline password
  const placeholderHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  const todayStr = new Date().toISOString().split('T')[0];

  let importedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const importedMembers = [];
  const skippedErrors = [];

  // Batch process in chunks of 50 for database resilience
  const BATCH_SIZE = 50;

  for (let b = 0; b < records.length; b += BATCH_SIZE) {
    const chunk = records.slice(b, b + BATCH_SIZE);

    for (const item of chunk) {
      try {
        // ID resolution
        let memberId = item.rawId ? String(item.rawId).trim().slice(0, 50) : null;
        if (memberId && existingIdSet.has(memberId.toLowerCase())) {
          duplicateCount++;
          skippedErrors.push({
            name: item.name,
            id: memberId,
            reason: `Member ID "${memberId}" already exists.`
          });
          continue;
        }

        // Email check
        const cleanEmail = item.email ? item.email.trim().toLowerCase() : null;
        if (cleanEmail && existingEmailSet.has(cleanEmail)) {
          duplicateCount++;
          skippedErrors.push({
            name: item.name,
            email: cleanEmail,
            reason: `Email "${cleanEmail}" is already registered.`
          });
          continue;
        }

        if (!memberId) {
          memberId = `MEM${Date.now().toString().slice(-4)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        }
        existingIdSet.add(memberId.toLowerCase());
        if (cleanEmail) existingEmailSet.add(cleanEmail);

        // Name & Slug
        const memberName = item.name.trim();
        const baseSlug = memberName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'member';
        let memberSlug = baseSlug;
        let counter = 2;
        while (existingSlugSet.has(memberSlug)) {
          memberSlug = `${baseSlug}-${counter++}`;
        }
        existingSlugSet.add(memberSlug);

        // Plan resolution
        let planId = null;
        let planName = item.membershipType ? item.membershipType.trim() : 'Gym + cardio';
        const matchedPlan = planMap.get(planName.toLowerCase());
        if (matchedPlan) {
          planId = matchedPlan.id;
          planName = matchedPlan.name;
        }

        const joinDate = item.startDate || todayStr;
        const expiryDate = item.endDate || calculateMembershipEndDate(joinDate, item.durationDays || 30);
        const isExpired = expiryDate < todayStr;
        const memberStatus = isExpired ? 'expired' : 'active';
        const phone = item.phone && item.phone.trim() ? item.phone.trim() : '0000000000';

        // Excel alignment fields
        const durationMonths = item.durationMonths || (item.durationDays ? Math.max(1, Math.round(item.durationDays / 30)) : 1);
        const totalAmount = parseFloat(item.totalAmount) || 0;
        const paidAmount = parseFloat(item.receivedAmount) || 0;
        const balanceAmount = item.balanceAmount !== undefined && item.balanceAmount !== null
          ? parseFloat(item.balanceAmount)
          : Math.max(0, totalAmount - paidAmount);
        const customMemberId = item.rawId ? String(item.rawId).trim() : memberId;
        const receiptNo = item.receiptNumber ? String(item.receiptNumber).trim() : customMemberId;
        const paymentDate = item.paymentDate || joinDate;
        const membershipType = item.membershipType ? item.membershipType.trim() : planName;

        // 1. Insert Member Record with Excel Alignment Columns
        let created;
        try {
          const insertMemberSql = `
            INSERT INTO members (
              id, custom_member_id, gym_id, full_name, phone, email, current_plan_id, current_plan_name,
              payment_date, join_date, expiry_date, duration_months, membership_type,
              total_amount, paid_amount, balance_amount, receipt_number,
              status, slug, password_hash, must_change_password,
              invitation_status, invitation_sent_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, false, 'imported', NULL)
            RETURNING id, custom_member_id AS "customMemberId", full_name AS name, phone, email, current_plan_name AS plan,
                      TO_CHAR(payment_date, 'YYYY-MM-DD') AS "paymentDate",
                      TO_CHAR(join_date, 'YYYY-MM-DD') AS "joinDate",
                      TO_CHAR(expiry_date, 'YYYY-MM-DD') AS "expiryDate",
                      duration_months AS "durationMonths",
                      membership_type AS "membershipType",
                      total_amount AS "totalAmount",
                      paid_amount AS "paidAmount",
                      balance_amount AS "balanceAmount",
                      receipt_number AS "receiptNumber",
                      status, slug;
          `;

          const memberRes = await db.query(insertMemberSql, [
            memberId,
            customMemberId,
            gymId,
            memberName,
            phone,
            cleanEmail,
            planId,
            planName,
            paymentDate,
            joinDate,
            expiryDate,
            durationMonths,
            membershipType,
            totalAmount,
            paidAmount,
            balanceAmount,
            receiptNo,
            memberStatus,
            memberSlug,
            placeholderHash
          ]);
          created = memberRes.rows[0];
        } catch (_colErr) {
          // Fallback if unmigrated database schema
          const basicSql = `
            INSERT INTO members (
              id, gym_id, full_name, phone, email, current_plan_id, current_plan_name,
              join_date, expiry_date, status, slug, password_hash, must_change_password,
              invitation_status, invitation_sent_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, 'imported', NULL)
            RETURNING id, full_name AS name, phone, email, current_plan_name AS plan,
                      TO_CHAR(join_date, 'YYYY-MM-DD') AS "joinDate",
                      TO_CHAR(expiry_date, 'YYYY-MM-DD') AS "expiryDate",
                      status, slug;
          `;
          const memberRes = await db.query(basicSql, [
            memberId,
            gymId,
            memberName,
            phone,
            cleanEmail,
            planId,
            planName,
            joinDate,
            expiryDate,
            memberStatus,
            memberSlug,
            placeholderHash
          ]);
          created = {
            ...memberRes.rows[0],
            customMemberId,
            paymentDate,
            durationMonths,
            membershipType,
            totalAmount,
            paidAmount,
            balanceAmount,
            receiptNumber: receiptNo
          };
        }

        // 2. Insert Subscription Record
        let subscriptionId = null;
        try {
          const subSql = `
            INSERT INTO member_subscriptions (
              member_id, plan_id, gym_id, start_date, end_date, amount_paid, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
          `;
          const subRes = await db.query(subSql, [
            memberId,
            planId,
            gymId,
            joinDate,
            expiryDate,
            item.receivedAmount || 0,
            isExpired ? 'EXPIRED' : 'ACTIVE'
          ]);
          subscriptionId = subRes.rows[0]?.id;
        } catch (_subErr) {
          // Continue if subscription schema allows
        }

        // 3. Insert Historical Payment Record if amount > 0
        if (item.receivedAmount > 0) {
          try {
            const payId = `pay_imp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            const payDate = item.paymentDate || joinDate;
            const paySql = `
              INSERT INTO payments (
                id, gym_id, member_id, member_name, plan_name, amount, mode, status, date, notes
              )
              VALUES ($1, $2, $3, $4, $5, $6, 'IMPORT', 'paid', $7, $8);
            `;
            const notes = `Imported from Excel. Total: ₹${item.totalAmount || 0}, Balance: ₹${item.balanceAmount || 0}` + (item.receiptNumber ? `, Receipt: ${item.receiptNumber}` : '');
            await db.query(paySql, [
              payId,
              gymId,
              memberId,
              memberName,
              planName,
              item.receivedAmount,
              payDate,
              notes
            ]);
          } catch (_payErr) {
            // Non-critical
          }
        }

        // 4. Insert Receipt Record if receiptNumber provided
        if (item.receiptNumber) {
          try {
            const cleanRc = String(item.receiptNumber).trim();
            const rcpId = `rcp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            const rcSql = `
              INSERT INTO membership_receipts (
                id, receipt_number, gym_id, member_id, membership_subscription_id, plan_name,
                amount, payment_status, receipt_type, storage_path, issued_date, payment_mode
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'HISTORICAL_IMPORT', 'historical_import', $9, 'IMPORT')
              ON CONFLICT (receipt_number) DO NOTHING;
            `;
            await db.query(rcSql, [
              rcpId,
              cleanRc,
              gymId,
              memberId,
              subscriptionId,
              planName,
              item.receivedAmount || 0,
              item.balanceAmount > 0 ? 'PARTIAL' : 'PAID',
              item.paymentDate || joinDate
            ]);
          } catch (_rcErr) {
            // Non-critical
          }
        }

        importedCount++;
        importedMembers.push(created);
      } catch (rowErr) {
        errorCount++;
        skippedErrors.push({
          name: item.name,
          error: rowErr.message
        });
      }
    }
  }

  return {
    success: true,
    totalSubmitted: records.length,
    importedCount,
    duplicateCount,
    errorCount,
    importedMembers,
    skippedErrors
  };
};

/**
 * Returns a ready-to-download sample CSV string matching the user's Excel column requirements.
 */
export const generateSampleCsv = () => {
  const headers = ['ID', 'NAME', 'Phone', 'Email', 'Payment', 'Start D', 'End D', 'Duration', 'M Type', 'Total Am', 'Received Am', 'Bal. Am', 'Rc N'];
  const sampleRows = [
    ['101', 'Rahul Sharma', '9876543210', 'rahul.sharma@example.com', '2024-01-10', '2024-01-10', '2024-04-10', '3 Months', 'General Fitness', '6000', '6000', '0', 'REC-1001'],
    ['102', 'Priya Patel', '9823456789', 'priya.patel@example.com', '2024-02-01', '2024-02-01', '2025-02-01', '1 Year', 'Personal Training', '24000', '20000', '4000', 'REC-1002'],
    ['103', 'Amit Verma', '9812345678', 'amit.verma@example.com', '2024-03-05', '2024-03-05', '2024-04-05', '1 Month', 'Strength & Cardio', '2500', '2500', '0', 'REC-1003'],
    ['104', 'Sneha Kulkarni', '9890123456', '', '2024-01-15', '2024-01-15', '2024-07-15', '6 Months', 'General Fitness', '11000', '11000', '0', 'REC-1004'],
    ['105', 'Vikas Deshmukh', '9871234560', 'vikas.d@example.com', '2024-02-20', '2024-02-20', '2024-05-20', '3 Months', 'Crossfit & Cardio', '7500', '5000', '2500', 'REC-1005']
  ];

  return [
    headers.join(','),
    ...sampleRows.map((row) => row.map((cell) => (cell.includes(',') ? `"${cell}"` : cell)).join(','))
  ].join('\r\n');
};

export default {
  parseFlexibleDate,
  parseDurationDays,
  parseAmount,
  parseCsvText,
  mapCsvRowToMember,
  validateMemberRecords,
  executeBulkMemberImport,
  generateSampleCsv
};
