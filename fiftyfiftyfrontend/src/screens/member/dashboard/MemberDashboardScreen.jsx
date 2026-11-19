import React, { useState, useEffect } from 'react';
import { Dumbbell, FileText, Download, ExternalLink, Receipt, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '../../../shared/components/Badge/Badge';
import { formatDate } from '../../../shared/utils/formatters';
import { useAuth } from '../../../context/AuthContext';
import { apiClient } from '../../../shared/services/apiClient';

export const MemberDashboardScreen = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(true);

  const membershipInfo = {
    planName: user?.planName || user?.plan || 'No Active Membership',
    startDate: user?.startDate || null,
    expiryDate: user?.expiryDate || null,
    status: user?.membershipStatus || user?.status || 'inactive',
    visitsThisMonth: user?.visitsThisMonth || 0,
    totalVisits: user?.totalVisits || 0,
    daysLeft: user?.daysLeft || 0
  };

  const gymName = user?.gymName || user?.gym?.name || 'FiftyFifty Gym';

  useEffect(() => {
    const fetchReceipts = async () => {
      const memberId = user?.memberId || user?.id;
      if (!memberId) {
        setIsLoadingReceipts(false);
        return;
      }

      try {
        let data = [];
        try {
          const res = await apiClient.get(`/receipts/member/${memberId}`);
          data = res.data?.data || res.data || [];
        } catch (_err) {
          const fbRes = await apiClient.get(`/members/${memberId}/receipts`);
          data = fbRes.data?.data || fbRes.data || [];
        }
        setReceipts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load member receipts:', err);
      } finally {
        setIsLoadingReceipts(false);
      }
    };

    fetchReceipts();
  }, [user]);

  return (
    <div className="animate-fade-in">
      {/* Current Membership Hero Card */}
      <div className="member-card-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              CURRENT MEMBERSHIP
            </span>
            <div className="member-plan-name">{membershipInfo.planName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <Badge status={membershipInfo.status}>{membershipInfo.status === 'active' ? 'Active Member' : 'No Active Plan'}</Badge>
              {membershipInfo.daysLeft > 0 ? (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {membershipInfo.daysLeft} days remaining
                </span>
              ) : (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Renew or subscribe to a plan to start
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gym Location</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{gymName}</div>
          </div>
        </div>

        <div className="member-hero-grid">
          <div className="member-hero-stat-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start Date</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {membershipInfo.startDate ? formatDate(membershipInfo.startDate) : '—'}
            </div>
          </div>

          <div className="member-hero-stat-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valid Until (Expiry)</div>
            <div style={{ fontWeight: 600, color: 'var(--brand-accent)', marginTop: 2 }}>
              {membershipInfo.expiryDate ? formatDate(membershipInfo.expiryDate) : '—'}
            </div>
          </div>

          <div className="member-hero-stat-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visits This Month</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {membershipInfo.visitsThisMonth} Sessions
            </div>
          </div>

          <div className="member-hero-stat-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Check-ins</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {membershipInfo.totalVisits} Workouts
            </div>
          </div>
        </div>
      </div>

      {/* Motivational Card */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: 24,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-md)',
          background: 'var(--brand-primary-soft)',
          color: 'var(--brand-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Dumbbell size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 4, color: 'var(--text-primary)' }}>Workout Motivation</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.5 }}>
            {membershipInfo.totalVisits > 0
              ? `"Consistency is what transforms average into excellence. ${membershipInfo.visitsThisMonth} workouts completed this month — keep pushing your limits!"`
              : '"Welcome to your fitness portal! Check in at the gym reception desk to log your workouts and track your fitness progress."'}
          </p>
        </div>
      </div>

      {/* Membership & Receipts Section */}
      <div style={{
        marginTop: 24,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        padding: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Receipt size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                Membership & Receipts
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Official invoices, receipts, and registration acknowledgements
              </p>
            </div>
          </div>
          {receipts.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {receipts.length} {receipts.length === 1 ? 'receipt' : 'receipts'} recorded
            </span>
          )}
        </div>

        {isLoadingReceipts ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            Loading receipts...
          </div>
        ) : receipts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '36px 16px',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)'
          }}>
            <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 4 }}>No Receipts Yet</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Receipts issued by {gymName} will appear here with instant PDF preview and download.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Receipt #</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Plan</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((rcp) => (
                  <tr key={rcp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {rcp.receiptNumber}
                    </td>
                    <td style={{ padding: '14px 12px', color: 'var(--brand-primary)', fontWeight: 500 }}>
                      {rcp.planName}
                    </td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{parseFloat(rcp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      {rcp.paymentStatus === 'PAID' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10B981',
                          border: '1px solid rgba(16, 185, 129, 0.25)'
                        }}>
                          <CheckCircle2 size={12} /> PAID
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: 'rgba(255, 107, 0, 0.12)',
                          color: '#FF6B00',
                          border: '1px solid rgba(255, 107, 0, 0.25)'
                        }}>
                          <Clock size={12} /> PENDING
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                      {formatDate(rcp.issuedDate || rcp.createdAt)}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        {rcp.previewUrl && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => window.open(rcp.previewUrl, '_blank', 'noopener,noreferrer')}
                            title="Preview PDF"
                          >
                            <ExternalLink size={13} />
                            <span>View</span>
                          </button>
                        )}
                        {rcp.downloadUrl && (
                          <a
                            href={rcp.downloadUrl}
                            download={`${rcp.receiptNumber}.pdf`}
                            className="btn btn-primary btn-sm"
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="Download PDF"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDashboardScreen;
