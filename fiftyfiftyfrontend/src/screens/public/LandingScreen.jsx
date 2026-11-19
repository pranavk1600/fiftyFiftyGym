import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Dumbbell,
  Shield,
  User,
  Building2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Activity,
  Users,
  CreditCard,
  Clock,
  MapPin,
  Phone,
  Mail,
  FileText,
  Code2,
  Lock,
  ChevronDown,
  Layers,
  Zap,
  Star,
  LogOut,
  CalendarCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../shared/services/apiClient';
import { ThemeToggle } from '../../shared/components/ThemeToggle/ThemeToggle';
import { Button } from '../../shared/components/Button/Button';
import '../../styles/screens/public/landingScreen.css';

export const LandingScreen = () => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Interactive documentation state
  const [activeDocsTab, setActiveDocsTab] = useState('quickstart');
  const [copiedSnippet, setCopiedSnippet] = useState(null);

  // Live preview mockup tab
  const [activePreviewTab, setActivePreviewTab] = useState('owner');

  // Live gym showcase data
  const [gyms, setGyms] = useState([]);
  const [isLoadingGyms, setIsLoadingGyms] = useState(true);

  // Fetch registered gyms for showcase
  useEffect(() => {
    let isMounted = true;
    const fetchShowcaseGyms = async () => {
      try {
        const response = await apiClient.get('/public/gyms');
        const data = response?.data || response;
        if (isMounted && Array.isArray(data)) {
          setGyms(data);
        }
      } catch (err) {
        console.warn('Could not fetch public gyms showcase:', err.message);
      } finally {
        if (isMounted) setIsLoadingGyms(false);
      }
    };
    fetchShowcaseGyms();
    return () => { isMounted = false; };
  }, []);

  // Copy code helper
  const handleCopyCode = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    showToast('Code snippet copied to clipboard!', 'success');
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  // Redirect to user dashboard based on role
  const handleGoToDashboard = () => {
    const normRole = (role || user?.role || '').toUpperCase();
    if (normRole === 'SUPER_ADMIN' || normRole === 'PLATFORM_ADMIN') {
      navigate('/admin/dashboard');
    } else if (normRole === 'GYM_OWNER') {
      navigate('/owner/dashboard');
    } else {
      navigate('/member/dashboard');
    }
  };

  return (
    <div className="landing-container">
      {/* ====================================================================
          STICKY TOP NAVBAR WITH LOGO & DIRECT SIGN IN BUTTON
          ==================================================================== */}
      <nav className="landing-navbar" aria-label="Main Navigation">
        <div className="landing-nav-inner">
          {/* Left: Brand Logo & Title */}
          <Link to="/" className="landing-brand">
            <div className="landing-logo-badge">
              <Dumbbell size={22} />
            </div>
            <div className="landing-brand-text">
              <span className="landing-brand-title">LeopardxGyms</span>
              <span className="landing-brand-tagline">Multi-Tenant Gym OS</span>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#architecture" className="landing-nav-link">Architecture</a>
            <a href="#docs" className="landing-nav-link">Documentation</a>
            <a href="#gyms" className="landing-nav-link">Gym Showcase</a>
            <a href="#pricing" className="landing-nav-link">Plans</a>
          </div>

          {/* Right: Theme Toggle & Direct Sign In Option */}
          <div className="landing-nav-actions">
            <ThemeToggle showLabel={false} />

            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  id="landing-navbar-dashboard-btn"
                  onClick={handleGoToDashboard}
                  className="nav-auth-trigger"
                  title="Go to My Dashboard"
                >
                  <div className="nav-auth-avatar logged-in">
                    {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span>{user?.fullName?.split(' ')[0] || 'Dashboard'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { logout(); showToast('Signed out successfully', 'info'); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 20,
                    padding: '6px 12px',
                    fontSize: '0.785rem',
                    color: 'var(--color-danger, #DC2626)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="landing-navbar-signin-btn"
                onClick={() => navigate('/admin/login')}
                className="btn-hero-primary"
                style={{
                  padding: '8px 22px',
                  borderRadius: '40px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(255, 107, 0, 0.25)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Sign In to LeopardxGyms"
              >
                <User size={15} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ====================================================================
          HERO SECTION
          ==================================================================== */}
      <header className="landing-hero">
        <div className="landing-hero-backdrop" />
        <div className="landing-hero-content">
          <div className="hero-pill-badge">
            <Sparkles size={15} />
            <span>Next-Generation Multi-Tenant Gym Management OS</span>
          </div>

          <h1 className="hero-title">
            Empower Every Gym With Its <br />
            <span className="hero-title-highlight">Own Dedicated Digital Platform.</span>
          </h1>

          <p className="hero-subtitle">
            LeopardxGyms is the modern multi-tenant operating system that equips fitness centers with
            individual branded portals, automated member subscriptions, instant QR check-ins, and
            deep operational revenue analytics.
          </p>

          <div className="hero-actions">
            <a href="#gyms" className="btn-hero-primary">
              <Building2 size={18} />
              <span>Explore Gym Showcase</span>
            </a>
            <a href="#docs" className="btn-hero-secondary">
              <FileText size={18} />
              <span>Interactive Documentation</span>
            </a>
            <button
              type="button"
              id="landing-hero-launch-signin-btn"
              onClick={() => navigate('/admin/login')}
              className="btn-hero-secondary"
            >
              <Zap size={18} color="var(--brand-primary)" />
              <span>Launch Sign In</span>
            </button>
          </div>

          {/* Stats Ticker */}
          <div className="landing-stats-grid">
            <div className="landing-stat-card">
              <div className="landing-stat-value">99.98%</div>
              <div className="landing-stat-label">Cloud Platform Uptime</div>
            </div>
            <div className="landing-stat-card">
              <div className="landing-stat-value">100%</div>
              <div className="landing-stat-label">Isolated Gym Tenants</div>
            </div>
            <div className="landing-stat-card">
              <div className="landing-stat-value">&lt; 150ms</div>
              <div className="landing-stat-label">QR Attendance Verification</div>
            </div>
            <div className="landing-stat-card">
              <div className="landing-stat-value">Automated</div>
              <div className="landing-stat-label">Email & Credential Onboarding</div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            INTERACTIVE SYSTEM PREVIEW DECK
            ==================================================================== */}
        <div className="preview-mockup-wrapper">
          <div className="preview-mockup-bar">
            <div className="browser-dots">
              <div className="browser-dot" style={{ background: '#EF4444' }} />
              <div className="browser-dot" style={{ background: '#F59E0B' }} />
              <div className="browser-dot" style={{ background: '#10B981' }} />
            </div>

            <div className="browser-url-pill">
              <Lock size={12} color="#10B981" />
              <span>
                {activePreviewTab === 'owner'
                  ? 'leopardxgyms.com/owner/dashboard'
                  : activePreviewTab === 'member'
                  ? 'leopardxgyms.com/gym/downtown-fitness'
                  : 'leopardxgyms.com/admin/gyms'}
              </span>
            </div>

            <div className="preview-tabs">
              <button
                type="button"
                onClick={() => setActivePreviewTab('owner')}
                className={`preview-tab-btn ${activePreviewTab === 'owner' ? 'active' : ''}`}
              >
                Owner Portal
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('member')}
                className={`preview-tab-btn ${activePreviewTab === 'member' ? 'active' : ''}`}
              >
                Gym Dedicated URL
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('superadmin')}
                className={`preview-tab-btn ${activePreviewTab === 'superadmin' ? 'active' : ''}`}
              >
                Super Admin
              </button>
            </div>
          </div>

          <div className="preview-mockup-body">
            {activePreviewTab === 'owner' && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>FiftyFifty Downtown Fitness</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                      Owner Operations Dashboard • Tenant ID: gym_alpha_1
                    </p>
                  </div>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    background: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}>
                    ● Live Operations
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <div style={{ padding: 16, background: 'var(--bg-surface-elevated)', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Members</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>248</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg-surface-elevated)', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Today Attendance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: 4 }}>74 Check-ins</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg-surface-elevated)', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Monthly Revenue</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>₹ 4,82,000</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg-surface-elevated)', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Plan Renewals Pending</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>12 Members</div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'member' && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--brand-primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    FF
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>FiftyFifty Downtown Fitness</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', margin: 0 }}>
                      URL: /gym/fiftyfifty-downtown-fitness
                    </p>
                  </div>
                </div>

                <div style={{ padding: 16, background: 'var(--bg-surface-elevated)', borderRadius: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Quarterly Pro Transformation Plan</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valid through: 15 Dec 2026 • 48 Days Remaining</div>
                    </div>
                    <span style={{ padding: '4px 10px', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                      ACTIVE
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Button variant="primary" size="small" onClick={() => navigate('/gym/fiftyfifty-downtown-fitness')}>
                    Visit Full Gym Portal Page
                  </Button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Each gym gets separate branding and membership options</span>
                </div>
              </div>
            )}

            {activePreviewTab === 'superadmin' && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Platform Tenant Registry</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Super Admin Multi-Tenant Gym Provisioning Console
                    </p>
                  </div>
                  <span style={{ padding: '4px 10px', background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                    Auto-Slug Enabled
                  </span>
                </div>

                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '10px 14px', background: 'var(--bg-surface-elevated)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <span>GYM NAME</span>
                    <span>DEDICATED URL (SLUG)</span>
                    <span>LOCATION</span>
                    <span>STATUS</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '12px 14px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>FiftyFifty Downtown Fitness</span>
                    <span style={{ color: 'var(--brand-primary)', fontFamily: 'monospace' }}>/gym/fiftyfifty-downtown-fitness</span>
                    <span>Mumbai</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ====================================================================
          CORE FEATURES GRID
          ==================================================================== */}
      <section id="features" className="landing-section">
        <div className="section-header">
          <span className="section-tag">Enterprise Capabilities</span>
          <h2 className="section-title">Built For Gyms of Any Scale</h2>
          <p className="section-subtitle">
            From single boutique studios to multi-city fitness chains, LeopardxGyms provides the exact
            operating modules needed to streamline gym management.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Building2 size={26} />
            </div>
            <h3 className="feature-title">Multi-Tenant Gym Isolation</h3>
            <p className="feature-desc">
              Every gym registered on the platform gets its own dedicated URL (`/gym/:slug`), custom
              logo, operating hours, and fully isolated member database.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <CalendarCheck size={26} />
            </div>
            <h3 className="feature-title">QR & Digital Attendance</h3>
            <p className="feature-desc">
              Instant attendance logging with automatic duplicate check-in prevention, live daily logs,
              and hourly traffic distribution graphs.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <CreditCard size={26} />
            </div>
            <h3 className="feature-title">Automated Membership Billing</h3>
            <p className="feature-desc">
              Configure flexible membership plans (Monthly, Quarterly, Annual), monitor expiry countdowns,
              and track payment records with instant status badges.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Mail size={26} />
            </div>
            <h3 className="feature-title">Automated Email Onboarding</h3>
            <p className="feature-desc">
              Integrated with Brevo SMTP to immediately email generated temporary credentials and
              password-setup tokens to newly created gym owners and members.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Shield size={26} />
            </div>
            <h3 className="feature-title">Strict Role-Based Security</h3>
            <p className="feature-desc">
              Three segregated tiers: Platform Super Admins, Gym Owners & Admins, and Gym Members,
              enforced at the database and JWT middleware levels.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Activity size={26} />
            </div>
            <h3 className="feature-title">Live Revenue & Member Analytics</h3>
            <p className="feature-desc">
              Instant financial rollups, monthly revenue comparisons, active versus inactive retention ratios,
              and operational audit feeds.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          INTERACTIVE DOCUMENTATION SECTION ("DOCS FIRST")
          ==================================================================== */}
      <section id="docs" className="landing-section" style={{ background: 'var(--bg-surface-elevated)', borderRadius: 28, margin: '20px auto 80px', padding: '60px 24px' }}>
        <div className="section-header">
          <span className="section-tag">Documentation & Guides</span>
          <h2 className="section-title">Developer & Operator Documentation</h2>
          <p className="section-subtitle">
            Explore the multi-tenant architecture, operator workflows, and member portal mechanics
            before logging into your workspace.
          </p>
        </div>

        <div className="docs-wrapper">
          {/* Docs Sidebar */}
          <div className="docs-sidebar">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 14px' }}>
              Guides & Reference
            </div>

            <button
              type="button"
              onClick={() => setActiveDocsTab('quickstart')}
              className={`docs-tab-item ${activeDocsTab === 'quickstart' ? 'active' : ''}`}
            >
              <Zap size={16} />
              <span>Platform Quickstart</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDocsTab('owner')}
              className={`docs-tab-item ${activeDocsTab === 'owner' ? 'active' : ''}`}
            >
              <Dumbbell size={16} />
              <span>Gym Owner Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDocsTab('member')}
              className={`docs-tab-item ${activeDocsTab === 'member' ? 'active' : ''}`}
            >
              <User size={16} />
              <span>Member Dedicated Portal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDocsTab('api')}
              className={`docs-tab-item ${activeDocsTab === 'api' ? 'active' : ''}`}
            >
              <Code2 size={16} />
              <span>API & Multi-Tenant Specs</span>
            </button>
          </div>

          {/* Docs Main Content */}
          <div className="docs-main-content">
            {activeDocsTab === 'quickstart' && (
              <div>
                <h3 className="docs-title">Platform Quickstart & Architecture</h3>
                <p className="docs-lead">
                  LeopardxGyms operates on a modern multi-tenant schema where individual fitness centers
                  enjoy an independent identity, personalized web link, and separate operational records.
                </p>

                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '20px 0 10px' }}>1. Provisioning Flow</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  A Platform Super Admin creates a new gym in the console. The system auto-generates a
                  unique slug (e.g. <code>/gym/powerhouse-fitness</code>), provisions the Gym Owner's
                  account, and dispatches temporary credentials.
                </p>

                <div className="docs-code-block">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('quickstart_code', `// Auto-generated Gym Tenant URL Schema\nconst gymUrl = "https://leopardxgyms.com/gym/" + gym.slug;\n// Sample: https://leopardxgyms.com/gym/fiftyfifty-downtown-fitness`)}
                    className="docs-copy-btn"
                  >
                    {copiedSnippet === 'quickstart_code' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSnippet === 'quickstart_code' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <code>{`// Auto-generated Gym Tenant URL Schema\nconst gymUrl = "https://leopardxgyms.com/gym/" + gym.slug;\n// Sample: https://leopardxgyms.com/gym/fiftyfifty-downtown-fitness`}</code>
                </div>

                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '20px 0 10px' }}>2. Role Segregation Matrix</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
                  <div style={{ padding: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Super Admin</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Manages all gym accounts, system health, and logo uploads.</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Gym Owner</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Configures plans, admits members, logs attendance, monitors revenue.</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Member</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Checks attendance history, active subscription validity, receipts.</div>
                  </div>
                </div>
              </div>
            )}

            {activeDocsTab === 'owner' && (
              <div>
                <h3 className="docs-title">Gym Owner & Administrator Workflow</h3>
                <p className="docs-lead">
                  Once your gym is provisioned, you can access your Owner Operations Dashboard at <code>/admin/login</code> or directly from your gym's dedicated page.
                </p>

                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '20px 0 10px' }}>Key Daily Tasks</h4>
                <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                  <li><strong>Setup Plans:</strong> Create membership tiers with custom durations, prices, and feature checklists.</li>
                  <li><strong>Member Check-in:</strong> Use the real-time attendance screen to quickly check in members via search or QR code.</li>
                  <li><strong>Manage Renewals:</strong> Receive instant notification flags for members whose plans are expiring in the next 7 days.</li>
                  <li><strong>Revenue Reports:</strong> View daily, monthly, and yearly cashflow charts on your dashboard.</li>
                </ul>

                <div className="docs-code-block">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('owner_code', `// Gym Owner Authentication\nPOST /api/auth/admin/login\n{\n  "email": "owner@yourgym.com",\n  "password": "your_secure_password",\n  "portal": "GYM_ADMIN"\n}`)}
                    className="docs-copy-btn"
                  >
                    {copiedSnippet === 'owner_code' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSnippet === 'owner_code' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <code>{`// Gym Owner Authentication\nPOST /api/auth/admin/login\n{\n  "email": "owner@yourgym.com",\n  "password": "your_secure_password",\n  "portal": "GYM_ADMIN"\n}`}</code>
                </div>
              </div>
            )}

            {activeDocsTab === 'member' && (
              <div>
                <h3 className="docs-title">Gym Member Experience & Dedicated URLs</h3>
                <p className="docs-lead">
                  Every gym on LeopardxGyms provides its members with a dedicated portal (e.g. <code>/gym/:slug</code>).
                  Members can review plans, verify gym operational hours, and log in to track their fitness milestones.
                </p>

                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '20px 0 10px' }}>What Members Can Do</h4>
                <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                  <li><strong>Dedicated Gym Hub:</strong> Direct access to their gym's location, facilities, and contact info.</li>
                  <li><strong>Personal Attendance History:</strong> Detailed calendar breakdown of workout check-ins and streaks.</li>
                  <li><strong>Payment & Invoices:</strong> Download receipts and verify remaining days on active membership plans.</li>
                  <li><strong>Profile Settings:</strong> Update personal contact information and change password securely.</li>
                </ul>

                <div className="docs-code-block">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('member_code', `// Visiting a Dedicated Gym URL\nGET /gym/fiftyfifty-downtown-fitness\n// Automatically loads the gym's specific logo, address, and membership options.`)}
                    className="docs-copy-btn"
                  >
                    {copiedSnippet === 'member_code' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSnippet === 'member_code' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <code>{`// Visiting a Dedicated Gym URL\nGET /gym/fiftyfifty-downtown-fitness\n// Automatically loads the gym's specific logo, address, and membership options.`}</code>
                </div>
              </div>
            )}

            {activeDocsTab === 'api' && (
              <div>
                <h3 className="docs-title">API & Multi-Tenant Routing Specs</h3>
                <p className="docs-lead">
                  The LeopardxGyms platform uses tenant context resolution via HTTP headers and route slugs
                  to safely partition tenant data across all API requests.
                </p>

                <div className="docs-code-block">
                  <button
                    type="button"
                    onClick={() => handleCopyCode('api_code', `// Public Gym Profile Endpoint\nGET /api/public/gyms/:slug\nResponse 200 OK:\n{\n  "success": true,\n  "data": {\n    "gym": {\n      "id": "gym_1793194259833_26bcef",\n      "slug": "fiftyfifty-downtown-fitness",\n      "name": "FiftyFifty Downtown Fitness",\n      "city": "Mumbai",\n      "opening_hours": "06:00 AM - 10:00 PM"\n    },\n    "plans": [ ... ]\n  }\n}`)}
                    className="docs-copy-btn"
                  >
                    {copiedSnippet === 'api_code' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSnippet === 'api_code' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <code>{`// Public Gym Profile Endpoint\nGET /api/public/gyms/:slug\nResponse 200 OK:\n{\n  "success": true,\n  "data": {\n    "gym": {\n      "id": "gym_1793194259833_26bcef",\n      "slug": "fiftyfifty-downtown-fitness",\n      "name": "FiftyFifty Downtown Fitness",\n      "city": "Mumbai",\n      "opening_hours": "06:00 AM - 10:00 PM"\n    },\n    "plans": [ ... ]\n  }\n}`}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ====================================================================
          LIVE GYM DIRECTORY / SHOWCASE SECTION
          ==================================================================== */}
      <section id="gyms" className="landing-section">
        <div className="section-header">
          <span className="section-tag">Tenant Ecosystem</span>
          <h2 className="section-title">Explore Active Gym Portals</h2>
          <p className="section-subtitle">
            Every gym below has its own dedicated portal URL with custom branding, membership plans,
            and member login. Click any gym to see its distinct public page!
          </p>
        </div>

        {isLoadingGyms ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <Activity className="animate-spin" size={28} color="var(--brand-primary)" style={{ margin: '0 auto 12px' }} />
            <div>Loading registered gym portals...</div>
          </div>
        ) : (
          <div className="gyms-showcase-grid">
            {gyms.map((gym) => {
              const gymSlug = gym.slug || gym.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
              const dedicatedPath = `/gym/${gymSlug}`;

              return (
                <div key={gym.id || gymSlug} className="gym-showcase-card">
                  <div className="gym-card-banner">
                    {gym.logo_url ? (
                      <img src={gym.logo_url} alt={gym.name} className="gym-card-logo" />
                    ) : (
                      <div className="gym-card-logo-placeholder">
                        {gym.name?.charAt(0) || 'G'}
                      </div>
                    )}
                  </div>

                  <div className="gym-card-body">
                    <h3 className="gym-card-title">{gym.name}</h3>
                    <div className="gym-card-url-pill">
                      <span>fiftyfiftygym.com/gym/{gymSlug}</span>
                    </div>

                    <p className="gym-card-desc">
                      {gym.description || 'Premier fitness facility with modern equipment, functional training, and dedicated personal coaches.'}
                    </p>

                    <div className="gym-card-meta">
                      <div className="gym-meta-row">
                        <MapPin size={14} color="var(--brand-primary)" />
                        <span>{gym.city ? `${gym.city}, ${gym.state || 'India'}` : 'Mumbai, Maharashtra'}</span>
                      </div>
                      <div className="gym-meta-row">
                        <Clock size={14} color="var(--text-secondary)" />
                        <span>{gym.opening_hours || '06:00 AM - 10:00 PM'}</span>
                      </div>
                    </div>

                    <Link to={dedicatedPath} className="btn-visit-gym">
                      <span>Visit Gym Portal</span>
                      <ExternalLink size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ====================================================================
          PRICING & TIERS SECTION
          ==================================================================== */}
      <section id="pricing" className="landing-section" style={{ background: 'var(--bg-surface-elevated)', borderRadius: 28, padding: '60px 24px', margin: '20px auto 80px' }}>
        <div className="section-header">
          <span className="section-tag">Flexible Subscriptions</span>
          <h2 className="section-title">Transparent Platform Pricing</h2>
          <p className="section-subtitle">
            Scale your gym without hidden fees. Pick the tier that matches your facility size.
          </p>
        </div>

        <div className="pricing-grid">
          {/* Starter Plan */}
          <div className="pricing-card">
            <h3 className="pricing-plan-name">Studio Starter</h3>
            <p className="pricing-plan-desc">For local gyms and boutique fitness centers.</p>
            <div className="pricing-price-box">
              <span className="pricing-currency">₹</span>
              <span className="pricing-amount">1,499</span>
              <span className="pricing-period">/ month</span>
            </div>
            <ul className="pricing-feature-list">
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Dedicated Gym URL (/gym/:slug)</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Up to 150 Active Members</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> QR-Based Attendance Tracking</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Membership Expiry Alerts</li>
            </ul>
            <button type="button" onClick={() => navigate('/admin/login')} className="btn-visit-gym">
              Get Started
            </button>
          </div>

          {/* Pro Athlete - Popular */}
          <div className="pricing-card featured">
            <div className="pricing-popular-badge">Most Popular</div>
            <h3 className="pricing-plan-name">Pro Fitness Hub</h3>
            <p className="pricing-plan-desc">Comprehensive toolkit for high-traffic fitness clubs.</p>
            <div className="pricing-price-box">
              <span className="pricing-currency">₹</span>
              <span className="pricing-amount">3,499</span>
              <span className="pricing-period">/ month</span>
            </div>
            <ul className="pricing-feature-list">
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--brand-primary)" /> Everything in Starter</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--brand-primary)" /> Unlimited Active Members</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--brand-primary)" /> Custom Logo & Branding</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--brand-primary)" /> Brevo Automated Email Credentials</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--brand-primary)" /> Advanced Financial Analytics</li>
            </ul>
            <button type="button" onClick={() => navigate('/admin/login')} className="btn-visit-gym">
              Start Free 14-Day Trial
            </button>
          </div>

          {/* Enterprise */}
          <div className="pricing-card">
            <h3 className="pricing-plan-name">Multi-Branch Enterprise</h3>
            <p className="pricing-plan-desc">For gym chains with multi-branch governance.</p>
            <div className="pricing-price-box">
              <span className="pricing-currency">₹</span>
              <span className="pricing-amount">8,999</span>
              <span className="pricing-period">/ month</span>
            </div>
            <ul className="pricing-feature-list">
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Unlimited Gym Tenants</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Super Admin Governance Dashboard</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Dedicated Cloud Database Instance</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> 24/7 Priority SLA Support</li>
            </ul>
            <button type="button" onClick={() => navigate('/admin/login')} className="btn-visit-gym">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          FOOTER
          ==================================================================== */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand-side">
            <div className="landing-logo-badge" style={{ width: 34, height: 34 }}>
              <Dumbbell size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>LeopardxGyms</div>
              <div className="footer-copy">© 2026 LeopardxGyms Multi-Tenant Platform. All rights reserved.</div>
            </div>
          </div>

          <div className="footer-links">
            <a href="#features" className="footer-link">Features</a>
            <a href="#architecture" className="footer-link">Architecture</a>
            <a href="#docs" className="footer-link">Docs</a>
            <a href="#gyms" className="footer-link">Gym Showcase</a>
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="footer-link"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'var(--brand-primary)',
                fontWeight: 700
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingScreen;
