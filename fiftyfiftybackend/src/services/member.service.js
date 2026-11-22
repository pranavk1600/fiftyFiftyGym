/**
 * Member Service
 * Encapsulates calculation, sequential ID generation, and formatting for gym members.
 */

import db from '../config/db.js';

/**
 * Calculates membership end date from start date and duration in months (or days).
 * @param {string|Date} startDate - Format YYYY-MM-DD
 * @param {number} durationMonths - e.g. 1, 3, 6, 12
 * @returns {string} Format YYYY-MM-DD
 */
export const calculateEndDate = (startDate, durationMonths = 1) => {
  const start = startDate ? new Date(startDate) : new Date();
  if (isNaN(start.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  const months = parseInt(durationMonths, 10) || 1;
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  // Handle day overflow (e.g. Jan 31 + 1 month)
  if (end.getDate() !== start.getDate()) {
    end.setDate(0);
  }

  return end.toISOString().split('T')[0];
};

/**
 * Auto-generates the next sequential Member ID for a given gym (e.g. 2106, 2107...).
 * Falls back to 2101 if no prior numeric IDs exist.
 * @param {string} gymId
 * @returns {Promise<string>}
 */
export const getNextCustomMemberId = async (gymId) => {
  try {
    const res = await db.query(
      `SELECT custom_member_id FROM members 
       WHERE gym_id = $1 AND custom_member_id ~ '^[0-9]+$' 
       ORDER BY CAST(custom_member_id AS INTEGER) DESC LIMIT 1`,
      [gymId]
    );

    if (res.rows.length > 0 && res.rows[0].custom_member_id) {
      const highest = parseInt(res.rows[0].custom_member_id, 10);
      return String(highest + 1);
    }
  } catch (_e) {
    // Database may be offline or unmigrated
  }

  return '2106';
};

/**
 * Auto-generates the next sequential receipt number (e.g. 4372, 4373...).
 * @param {string} gymId
 * @returns {Promise<string>}
 */
export const getNextReceiptNumber = async (gymId) => {
  try {
    const res = await db.query(
      `SELECT receipt_number FROM members 
       WHERE gym_id = $1 AND receipt_number ~ '^[0-9]+$' 
       ORDER BY CAST(receipt_number AS INTEGER) DESC LIMIT 1`,
      [gymId]
    );

    if (res.rows.length > 0 && res.rows[0].receipt_number) {
      const highest = parseInt(res.rows[0].receipt_number, 10);
      return String(highest + 1);
    }
  } catch (_e) {
    // Database may be offline or unmigrated
  }

  return '4372';
};

/**
 * Formats a member row to ensure all Excel alignment fields are present with sensible defaults.
 * @param {object} row
 * @returns {object}
 */
export const formatMemberResponse = (row) => {
  const total = parseFloat(row.totalAmount || row.total_amount || 0);
  const paid = parseFloat(row.paidAmount || row.paid_amount || total);
  const balance = row.balanceAmount !== undefined && row.balanceAmount !== null
    ? parseFloat(row.balanceAmount)
    : (row.balance_amount !== undefined && row.balance_amount !== null ? parseFloat(row.balance_amount) : Math.max(0, total - paid));

  // Determine customMemberId: use custom_member_id if available, or extract clean short number from id
  let customId = row.customMemberId || row.custom_member_id;
  if (!customId && row.id) {
    const numMatch = row.id.match(/\d{4,}/);
    customId = numMatch ? numMatch[0] : row.id.slice(-6);
  }

  return {
    id: row.id,
    customMemberId: customId || '2106',
    name: row.name || row.full_name || '',
    paymentDate: row.paymentDate || row.payment_date || row.joinDate || row.join_date || new Date().toISOString().split('T')[0],
    joinDate: row.joinDate || row.join_date || new Date().toISOString().split('T')[0],
    expiryDate: row.expiryDate || row.expiry_date || null,
    durationMonths: parseInt(row.durationMonths || row.duration_months || 1, 10),
    membershipType: row.membershipType || row.membership_type || row.plan || row.current_plan_name || 'Gym + cardio',
    totalAmount: total,
    paidAmount: paid,
    balanceAmount: balance,
    receiptNumber: row.receiptNumber || row.receipt_number || '',
    phone: row.phone || '',
    email: row.email || '',
    slug: row.slug || '',
    plan: row.plan || row.current_plan_name || 'Gym + cardio',
    planId: row.planId || row.current_plan_id || null,
    status: row.status || 'active',
    visits: row.visits || row.total_visits || 0,
    invitationStatus: row.invitationStatus || row.invitation_status || 'pending',
    invitationSentAt: row.invitationSentAt || row.invitation_sent_at || null,
    createdAt: row.createdAt || row.created_at || new Date().toISOString()
  };
};
