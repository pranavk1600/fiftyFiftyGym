import React from 'react';
import { RefreshCw, FileText, Send, ExternalLink, Download, CheckCircle2, Clock } from 'lucide-react';
import { Modal } from '../../../../shared/components/Modal/Modal';
import { Button } from '../../../../shared/components/Button/Button';
import { formatDate } from '../../../../shared/utils/formatters';

export const ReceiptViewerModal = ({
  isOpen,
  onClose,
  receiptMember,
  memberReceipts = [],
  selectedReceipt,
  setSelectedReceipt,
  receiptLoading,
  isResendingReceipt,
  onResendReceiptEmail
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedReceipt ? `Receipt: #${selectedReceipt.receiptNumber}` : 'Membership Receipt'}
      maxWidth={680}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 10, flexWrap: 'wrap' }}>
          <div>
            {selectedReceipt && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onResendReceiptEmail(selectedReceipt.id)}
                disabled={isResendingReceipt}
                title="Resend receipt with PDF via Brevo"
                style={{ color: 'var(--brand-primary)', borderColor: 'rgba(255, 107, 0, 0.3)' }}
              >
                {isResendingReceipt ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                <span>Resend Receipt Email</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {selectedReceipt?.previewUrl && (
              <Button
                variant="secondary"
                onClick={() => window.open(selectedReceipt.previewUrl, '_blank', 'noopener,noreferrer')}
                title="Preview PDF in new tab"
              >
                <ExternalLink size={15} />
                <span>Preview PDF</span>
              </Button>
            )}
            {selectedReceipt?.downloadUrl && (
              <a
                href={selectedReceipt.downloadUrl}
                download={`${selectedReceipt.receiptNumber || 'receipt'}.pdf`}
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="Download Official PDF Receipt"
              >
                <Download size={15} />
                <span>Download PDF</span>
              </a>
            )}
          </div>
        </div>
      }
    >
      {receiptLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <RefreshCw size={28} className="spin" style={{ color: 'var(--brand-primary)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Retrieving official receipt and generating signed access links...
          </p>
        </div>
      ) : memberReceipts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 16px' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12
          }}>
            <FileText size={26} />
          </div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>No Receipt Available</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 380, margin: '0 auto' }}>
            No official receipt has been issued yet for <strong>{receiptMember?.name}</strong>. A receipt is automatically generated upon member registration or when recording a membership payment.
          </p>
        </div>
      ) : (
        <div>
          {/* Multiple Receipts Selector */}
          {memberReceipts.length > 1 && (
            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 12,
              marginBottom: 16,
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              {memberReceipts.map((rcp) => {
                const isSel = selectedReceipt?.id === rcp.id;
                return (
                  <button
                    key={rcp.id}
                    type="button"
                    onClick={() => setSelectedReceipt(rcp)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: isSel ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                      background: isSel ? 'var(--brand-primary-light, #FFF7ED)' : 'var(--bg-surface-elevated)',
                      color: isSel ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    #{rcp.receiptNumber} ({rcp.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'})
                  </button>
                );
              })}
            </div>
          )}

          {/* Receipt Summary Card */}
          {selectedReceipt && (
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              {/* Header Banner */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 14,
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--brand-primary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                    {selectedReceipt.receiptType === 'PAYMENT_RECEIPT' ? 'Official Payment Receipt' : 'Registration Acknowledgement'}
                  </span>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: 2, fontWeight: 700 }}>
                    #{selectedReceipt.receiptNumber}
                  </h3>
                </div>
                <div>
                  {selectedReceipt.paymentStatus === 'PAID' ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      <CheckCircle2 size={14} /> PAID
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: 'rgba(255, 107, 0, 0.12)',
                      color: '#FF6B00',
                      border: '1px solid rgba(255, 107, 0, 0.3)'
                    }}>
                      <Clock size={14} /> PAYMENT PENDING
                    </span>
                  )}
                </div>
              </div>

              {/* Grid of metadata */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px 20px',
                fontSize: '0.875rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Member Name</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {receiptMember?.name || selectedReceipt.memberName}
                  </div>
                  {receiptMember?.email && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{receiptMember.email}</div>
                  )}
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Gym Facility</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedReceipt.gymName || 'FiftyFifty Gym'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Membership Plan</span>
                  <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginTop: 2 }}>
                    {selectedReceipt.planName}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Membership Amount</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem', marginTop: 2 }}>
                    ₹{parseFloat(selectedReceipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Membership Validity</span>
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatDate(receiptMember?.joinDate || selectedReceipt.issuedDate)} → {formatDate(receiptMember?.expiryDate || '—')}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Issue Date</span>
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatDate(selectedReceipt.issuedDate || selectedReceipt.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
