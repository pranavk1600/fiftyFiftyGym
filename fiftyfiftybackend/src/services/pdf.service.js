import PDFDocument from 'pdfkit';

/**
 * Generates a professional printable PDF Membership Receipt / Registration Acknowledgement.
 * Features FiftyFifty orange & black branding, structured grid, gym branding,
 * member details, plan duration, verified financial amounts, and verification seal.
 *
 * @param {Object} options
 * @param {Object} options.gym - Gym profile data (name, address, city, state, postal_code, phone, email, logo_url)
 * @param {Object} options.member - Member details (id, name, email, phone, slug)
 * @param {Object} options.plan - Plan details (name, durationDays, durationLabel, price)
 * @param {Object} options.receipt - Receipt metadata (receiptNumber, issuedDate, joinDate, expiryDate, amount, paymentStatus, receiptType, paymentReference, paymentMode)
 * @returns {Promise<Buffer>}
 */
export const generateMembershipReceiptPdf = ({
  gym = {},
  member = {},
  plan = {},
  receipt = {}
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Membership Receipt - ${receipt.receiptNumber || 'REC'}`,
          Author: gym.name || 'FiftyFifty Gym',
          Subject: 'Official Membership Receipt & Acknowledgement',
          Keywords: 'gym, membership, receipt, invoice, fitness'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width; // 595.28
      const pageHeight = doc.page.height; // 841.89
      const margin = 36;
      const contentWidth = pageWidth - margin * 2; // 523.28

      // Palette
      const primaryOrange = '#FF6B00';
      const darkSlate = '#080B12';
      const charcoal = '#1E293B';
      const mutedGrey = '#64748B';
      const lightBg = '#F8FAFC';
      const borderGrey = '#E2E8F0';
      const successGreen = '#10B981';
      const warningAmber = '#F59E0B';

      // 1. Top Brand Accent Stripe
      doc.rect(0, 0, pageWidth, 6).fill(primaryOrange);

      let y = margin + 10;

      // 2. Top Header: Gym Information (Left) & Receipt Header (Right)
      const headerBoxHeight = 85;
      doc.rect(margin, y, contentWidth, headerBoxHeight).fill(lightBg);
      doc.rect(margin, y, contentWidth, headerBoxHeight).strokeColor(borderGrey).lineWidth(1).stroke();

      // Left: Gym Branding
      doc.fillColor(primaryOrange)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('FIFTYFIFTY GYM NETWORK', margin + 14, y + 12);

      const gymDisplayName = (gym.name || 'FiftyFifty Gym').toUpperCase();
      doc.fillColor(darkSlate)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(gymDisplayName, margin + 14, y + 24, { width: 280, ellipsis: true });

      const gymAddrSegments = [
        gym.address,
        [gym.city, gym.state, gym.postal_code].filter(Boolean).join(', ')
      ].filter(Boolean);
      const gymAddressStr = gymAddrSegments.join(' • ') || 'Official Fitness Facility';

      doc.fillColor(mutedGrey)
        .fontSize(8.5)
        .font('Helvetica')
        .text(gymAddressStr, margin + 14, y + 46, { width: 300, ellipsis: true });

      const gymContactStr = [
        gym.phone ? `Tel: ${gym.phone}` : null,
        gym.email ? `Email: ${gym.email}` : null
      ].filter(Boolean).join('  |  ');

      doc.fillColor(mutedGrey)
        .fontSize(8.5)
        .text(gymContactStr || 'Support: support@fiftyfiftygym.com', margin + 14, y + 60, { width: 300, ellipsis: true });

      // Right: Receipt Meta Box
      const rightColX = pageWidth - margin - 180;
      const isPaid = (receipt.paymentStatus || '').toUpperCase() === 'PAID';
      const statusLabel = isPaid ? 'PAYMENT VERIFIED' : 'PAYMENT PENDING';
      const statusColor = isPaid ? successGreen : warningAmber;

      doc.fillColor(charcoal)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(isPaid ? 'OFFICIAL RECEIPT' : 'REGISTRATION SLIP', rightColX, y + 12, { width: 166, align: 'right' });

      doc.fillColor(primaryOrange)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`NO: ${receipt.receiptNumber || 'REC-PENDING'}`, rightColX, y + 28, { width: 166, align: 'right' });

      doc.fillColor(mutedGrey)
        .fontSize(8)
        .font('Helvetica')
        .text(`Date: ${receipt.issuedDate || new Date().toISOString().split('T')[0]}`, rightColX, y + 42, { width: 166, align: 'right' });

      // Status Pill on top right
      const pillWidth = 120;
      const pillHeight = 18;
      const pillX = pageWidth - margin - pillWidth - 14;
      const pillY = y + 56;

      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 4).fill(statusColor);
      doc.fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(statusLabel, pillX, pillY + 4, { width: pillWidth, align: 'center' });

      y += headerBoxHeight + 16;

      // 3. Member Information & Membership Plan Cards (Two Columns)
      const colWidth = (contentWidth - 12) / 2;
      const cardHeight = 110;

      // Column 1: Member Profile Card
      doc.roundedRect(margin, y, colWidth, cardHeight, 6).fill('#FFFFFF');
      doc.roundedRect(margin, y, colWidth, cardHeight, 6).strokeColor(borderGrey).lineWidth(1).stroke();

      // Card Header
      doc.rect(margin, y, colWidth, 24).fill(charcoal);
      doc.fillColor('#FFFFFF')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('MEMBER IDENTIFICATION', margin + 10, y + 7);

      let cardY = y + 32;
      const printRow = (label, val, xOffset = margin + 10, maxW = colWidth - 20) => {
        doc.fillColor(mutedGrey).fontSize(8).font('Helvetica').text(label, xOffset, cardY);
        doc.fillColor(darkSlate).fontSize(8.5).font('Helvetica-Bold').text(val || 'N/A', xOffset + 75, cardY, { width: maxW - 75, ellipsis: true });
        cardY += 18;
      };

      printRow('Member Name:', member.name || member.full_name);
      printRow('Member ID:', member.id);
      printRow('Email Address:', member.email);
      printRow('Contact Phone:', member.phone);

      // Column 2: Membership Period Card
      const col2X = margin + colWidth + 12;
      doc.roundedRect(col2X, y, colWidth, cardHeight, 6).fill('#FFFFFF');
      doc.roundedRect(col2X, y, colWidth, cardHeight, 6).strokeColor(borderGrey).lineWidth(1).stroke();

      doc.rect(col2X, y, colWidth, 24).fill(charcoal);
      doc.fillColor('#FFFFFF')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('MEMBERSHIP VALIDITY', col2X + 10, y + 7);

      cardY = y + 32;
      const printRow2 = (label, val) => {
        doc.fillColor(mutedGrey).fontSize(8).font('Helvetica').text(label, col2X + 10, cardY);
        doc.fillColor(darkSlate).fontSize(8.5).font('Helvetica-Bold').text(val || 'N/A', col2X + 85, cardY, { width: colWidth - 95, ellipsis: true });
        cardY += 18;
      };

      printRow2('Selected Plan:', plan.name || receipt.plan_name || 'Standard Plan');
      printRow2('Plan Duration:', `${plan.durationDays || plan.duration_days || 30} Days`);
      printRow2('Joining Date:', receipt.joinDate || member.join_date || 'N/A');
      printRow2('Expiry Date:', receipt.expiryDate || member.expiry_date || 'N/A');

      y += cardHeight + 20;

      // 4. Financial Breakdown Table
      doc.fillColor(charcoal)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('FINANCIAL BREAKDOWN & FEE DETAILS', margin, y);

      y += 16;

      // Table Header Row
      const tableHeaderHeight = 22;
      doc.rect(margin, y, contentWidth, tableHeaderHeight).fill(primaryOrange);
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('ITEM DESCRIPTION', margin + 12, y + 6);
      doc.text('VALIDITY PERIOD', margin + 220, y + 6);
      doc.text('STATUS', margin + 340, y + 6);
      doc.text('AMOUNT (INR)', margin + 430, y + 6, { width: 80, align: 'right' });

      y += tableHeaderHeight;

      // Table Row
      const tableRowHeight = 36;
      doc.rect(margin, y, contentWidth, tableRowHeight).fill('#FFFFFF');
      doc.rect(margin, y, contentWidth, tableRowHeight).strokeColor(borderGrey).lineWidth(1).stroke();

      const planTitle = plan.name || receipt.plan_name || 'Gym Membership Subscription';
      doc.fillColor(darkSlate).fontSize(9).font('Helvetica-Bold').text(planTitle, margin + 12, y + 8, { width: 200, ellipsis: true });
      doc.fillColor(mutedGrey).fontSize(7.5).font('Helvetica').text(`Access: All gym floor equipment & facilities`, margin + 12, y + 21);

      const validityStr = `${receipt.joinDate || 'Start'} to ${receipt.expiryDate || 'End'}`;
      doc.fillColor(charcoal).fontSize(8).font('Helvetica').text(validityStr, margin + 220, y + 13);

      doc.fillColor(statusColor).fontSize(8.5).font('Helvetica-Bold').text(isPaid ? 'PAID' : 'PENDING', margin + 340, y + 13);

      const parsedAmount = parseFloat(receipt.amount || plan.price || 0).toFixed(2);
      doc.fillColor(darkSlate).fontSize(10).font('Helvetica-Bold').text(`Rs. ${parsedAmount}`, margin + 430, y + 13, { width: 80, align: 'right' });

      y += tableRowHeight;

      // Total Summary Box
      const summaryHeight = 44;
      doc.rect(margin, y, contentWidth, summaryHeight).fill(lightBg);
      doc.rect(margin, y, contentWidth, summaryHeight).strokeColor(borderGrey).lineWidth(1).stroke();

      doc.fillColor(mutedGrey).fontSize(8).font('Helvetica').text('Transaction / Settlement ID:', margin + 12, y + 10);
      const refText = receipt.paymentReference || (isPaid ? 'AUTO-SETTLED' : 'Pending payment settlement');
      doc.fillColor(charcoal).fontSize(8.5).font('Helvetica-Bold').text(refText, margin + 12, y + 22);

      doc.fillColor(mutedGrey).fontSize(8).font('Helvetica').text('Payment Method:', margin + 220, y + 10);
      doc.fillColor(charcoal).fontSize(8.5).font('Helvetica-Bold').text(receipt.paymentMode || (isPaid ? 'UPI / Direct' : 'Pending'), margin + 220, y + 22);

      doc.fillColor(charcoal).fontSize(9).font('Helvetica-Bold').text('Total Payable:', margin + 370, y + 14, { width: 70, align: 'right' });
      doc.fillColor(primaryOrange).fontSize(14).font('Helvetica-Bold').text(`Rs. ${parsedAmount}`, margin + 440, y + 12, { width: 70, align: 'right' });

      y += summaryHeight + 20;

      // 5. Terms & Verification Notice Box
      const termsHeight = 70;
      doc.roundedRect(margin, y, contentWidth, termsHeight, 4).fill('#FFFFFF');
      doc.roundedRect(margin, y, contentWidth, termsHeight, 4).strokeColor(borderGrey).lineWidth(1).stroke();

      doc.fillColor(charcoal).fontSize(8).font('Helvetica-Bold').text('TERMS & CONDITIONS & REGISTRATION POLICIES:', margin + 12, y + 8);
      const termsText = [
        '1. Memberships are non-transferable and valid strictly until the stated expiry date.',
        '2. Member must present their digital membership ID or registered phone number upon check-in.',
        '3. If payment is marked PAYMENT PENDING, access is contingent on timely fee clearance with the gym desk.',
        '4. All equipment usage is subject to the FiftyFifty Gym safety and facility rules.'
      ].join('\n');

      doc.fillColor(mutedGrey).fontSize(7).font('Helvetica').text(termsText, margin + 12, y + 22, { width: contentWidth - 24, lineGap: 1.5 });

      y += termsHeight + 25;

      // 6. Signature & Digital Seal Block
      const sigColWidth = (contentWidth - 20) / 2;

      // Verification seal on left
      doc.roundedRect(margin, y, sigColWidth, 52, 4).fill(lightBg);
      doc.roundedRect(margin, y, sigColWidth, 52, 4).strokeColor(borderGrey).lineWidth(1).stroke();

      doc.fillColor(primaryOrange).fontSize(8).font('Helvetica-Bold').text('ELECTRONIC DOCUMENT VERIFICATION', margin + 10, y + 8);
      doc.fillColor(mutedGrey).fontSize(7).font('Helvetica')
        .text(`System ID: ${receipt.id || 'N/A'}  |  Timestamp: ${new Date().toISOString()}`, margin + 10, y + 20);
      doc.fillColor(charcoal).fontSize(7).font('Helvetica')
        .text('Digitally generated by FiftyFifty Gym Management Software & Supabase Storage.', margin + 10, y + 32);

      // Signature line on right
      const sigX = margin + sigColWidth + 20;
      doc.moveTo(sigX + 20, y + 36).lineTo(sigX + sigColWidth - 20, y + 36).strokeColor('#94A3B8').lineWidth(1).stroke();
      doc.fillColor(charcoal).fontSize(8).font('Helvetica-Bold')
        .text('Authorized Gym Desk / Signatory', sigX + 20, y + 40, { width: sigColWidth - 40, align: 'center' });

      // 7. Bottom Page Footer
      doc.fillColor(mutedGrey)
        .fontSize(7)
        .font('Helvetica')
        .text(
          `© ${new Date().getFullYear()} ${gym.name || 'FiftyFifty Gym'} • Powered by FiftyFifty Gym Cloud SaaS Architecture • All Rights Reserved`,
          margin,
          pageHeight - 24,
          { width: contentWidth, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  generateMembershipReceiptPdf
};
