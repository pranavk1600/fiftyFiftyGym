import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Dumbbell,
  Shield,
  User,
  Building2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Activity,
  Users,
  CreditCard,
  Clock,
  MapPin,
  Lock,
  ChevronDown,
  ChevronUp,
  Zap,
  Star,
  LogOut,
  CalendarCheck,
  Receipt,
  BarChart3,
  Upload,
  Check,
  HelpCircle,
  Menu,
  X,
  Smartphone,
  Server,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../shared/services/apiClient';
import { ThemeToggle } from '../../shared/components/ThemeToggle/ThemeToggle';
import { CommonLoginModal } from '../../shared/components/CommonLoginModal/CommonLoginModal';
import '../../styles/screens/public/landingScreen.css';

export const LandingScreen = () => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile navigation drawer toggle
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // FAQ Accordion toggle state (index of currently open FAQ, or null)
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Modal login state for seamless on-page sign in (initializes to true if ?signin=true is in URL on page refresh/direct hit)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const params = new URLSearchParams(search);
      return params.get('signin') === 'true' || params.get('login') === 'true';
    }
    return false;
  });

  // Auto-open Sign In modal if navigated with ?signin=true or state.openSignIn (e.g. after Gym Owner logout)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('signin') === 'true' || params.get('login') === 'true' || location.state?.openSignIn) {
      setIsLoginModalOpen(true);
    }
  }, [location.search, location.state]);

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
    const params = new URLSearchParams(location.search);
    if (params.get('signin') === 'true' || params.get('login') === 'true' || location.state?.openSignIn) {
      navigate('/', { replace: true, state: {} });
    }
  };

  // Switchable demo preview tabs
  const [activePreviewTab, setActivePreviewTab] = useState('dashboard');

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

  const toggleFaq = (idx) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
  };

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  // FAQ data
  const faqList = [
    {
      q: "Can I import our existing members from our Excel spreadsheet?",
      a: "Yes! LeopardxGyms includes an intelligent Bulk Import engine. Simply save your Excel spreadsheet as a .csv file and upload it. The system automatically preserves member names, custom IDs, payment dates, membership duration, total/received/balance amounts, and receipt numbers."
    },
    {
      q: "Does our gym get its own dedicated web address and branding?",
      a: "Absolutely. Every registered gym receives an isolated URL (e.g. leopardxgyms.vercel.app/gym/pranav-gym), complete with your custom gym logo, facility photos, operating hours, and dedicated member login portal."
    },
    {
      q: "How does daily attendance tracking work?",
      a: "Gym owners can check in members in under 2 seconds using real-time instant search by name, member ID, or phone number. The platform automatically blocks duplicate check-ins on the same day and tracks hourly traffic patterns."
    },
    {
      q: "How are automated payment receipts sent?",
      a: "Whenever a payment is recorded or renewed, a PDF receipt is auto-generated with custom receipt numbering and payment breakdown. Receipts can be downloaded immediately or sent via automated email powered by Brevo."
    },
    {
      q: "Is our gym data completely isolated and secure?",
      a: "Yes. LeopardxGyms utilizes an enterprise-grade multi-tenant architecture with tenant isolation. Gym Owners and Admins only have access to their own facility's members, payments, and metrics."
    }
  ];

  return (
    <div className="landing-container">
      {/* ====================================================================
          STICKY TOP NAVBAR WITH BACKDROP BLUR & MOBILE DRAWER
          ==================================================================== */}
      <nav className="landing-navbar" aria-label="Main Navigation">
        <div className="landing-nav-inner">
          {/* Brand Logo & Title */}
          <Link to="/" className="landing-brand">
            <div className="landing-logo-badge">
              <Dumbbell size={20} strokeWidth={2.5} />
            </div>
            <div className="landing-brand-text">
              <span className="landing-brand-title">Leopardx<span className="brand-accent">Gyms</span></span>
              <span className="landing-brand-tagline">Multi-Tenant Gym OS</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#preview" className="landing-nav-link">Platform Preview</a>
            <a href="#why-us" className="landing-nav-link">Why Leopardx</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="#gyms" className="landing-nav-link">Gym Showcase</a>
            <a href="#pricing" className="landing-nav-link">Plans</a>
            <a href="#faq" className="landing-nav-link">FAQ</a>
          </div>

          {/* Desktop Actions */}
          <div className="landing-nav-actions">
            <ThemeToggle showLabel={false} />

            {isAuthenticated ? (
              <div className="nav-auth-group">
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
                  className="nav-logout-btn"
                  title="Sign Out"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="landing-navbar-signin-btn"
                onClick={() => setIsLoginModalOpen(true)}
                className="btn-nav-signin"
                title="Sign In to LeopardxGyms"
              >
                <User size={15} />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              className="landing-hamburger-btn"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-label={isMobileNavOpen ? 'Close Navigation' : 'Open Navigation'}
            >
              {isMobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileNavOpen && (
          <div className="landing-mobile-drawer animate-fade-in">
            <div className="landing-mobile-links">
              <a href="#features" className="mobile-nav-link" onClick={closeMobileNav}>Features</a>
              <a href="#preview" className="mobile-nav-link" onClick={closeMobileNav}>Platform Preview</a>
              <a href="#why-us" className="mobile-nav-link" onClick={closeMobileNav}>Why Leopardx</a>
              <a href="#how-it-works" className="mobile-nav-link" onClick={closeMobileNav}>How It Works</a>
              <a href="#gyms" className="mobile-nav-link" onClick={closeMobileNav}>Gym Showcase</a>
              <a href="#pricing" className="mobile-nav-link" onClick={closeMobileNav}>Plans</a>
              <a href="#faq" className="mobile-nav-link" onClick={closeMobileNav}>FAQ</a>
            </div>
            <div className="mobile-drawer-footer">
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => { closeMobileNav(); setIsLoginModalOpen(true); }}
                  className="btn-hero-primary w-full"
                  style={{ justifyContent: 'center' }}
                >
                  <User size={16} />
                  <span>Sign In to Your Workspace</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ====================================================================
          HERO SECTION
          ==================================================================== */}
      <header className="landing-hero">
        <div className="landing-hero-backdrop" />
        <div className="landing-hero-glow" />

        <div className="landing-hero-content animate-fade-in-up">
          <div className="hero-pill-badge">
            <Sparkles size={14} className="badge-sparkle" />
            <span>The Enterprise OS for Independent & Multi-Branch Fitness Centers</span>
          </div>

          <h1 className="hero-title">
            Run Your Gym. <br />
            <span className="hero-title-highlight">Own Your Growth.</span>
          </h1>

          <p className="hero-subtitle">
            One powerful platform to manage members, memberships, attendance, payments and gym operations — all in one place.
          </p>

          <div className="hero-actions">
            <a href="#gyms" className="btn-hero-primary">
              <Building2 size={18} />
              <span>Explore Gym Showcase</span>
            </a>
            <button
              type="button"
              id="landing-hero-launch-signin-btn"
              onClick={() => setIsLoginModalOpen(true)}
              className="btn-hero-secondary"
            >
              <span>Get Started / Sign In</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Stats Ticker */}
          <div className="landing-stats-grid">
            <div className="landing-stat-card">
              <div className="landing-stat-value">99.9%</div>
              <div className="landing-stat-label">Cloud Platform Uptime</div>
            </div>
            <div className="landing-stat-card">
              <div className="landing-stat-value">100%</div>
              <div className="landing-stat-label">Isolated Multi-Tenant Security</div>
            </div>
            <div className="landing-stat-card">
              <div className="landing-stat-value">&lt; 150ms</div>
              <div className="landing-stat-label">Instant Check-In Speed</div>
            </div>
            <div className="landing-stat-card">
              <div className="landing-stat-value">2,000+</div>
              <div className="landing-stat-label">Members Imported in One Click</div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            DASHBOARD PREVIEW SECTION (ACTUAL GYM OWNER DEMO)
            ==================================================================== */}
        <div id="preview" className="preview-mockup-wrapper animate-fade-in">
          <div className="preview-mockup-bar">
            <div className="browser-dots">
              <div className="browser-dot dot-red" />
              <div className="browser-dot dot-amber" />
              <div className="browser-dot dot-green" />
            </div>

            <div className="browser-url-pill">
              <Lock size={12} color="#16A34A" />
              <span className="browser-url-text">
                {activePreviewTab === 'dashboard' && 'leopardxgyms.vercel.app/owner/dashboard'}
                {activePreviewTab === 'members' && 'leopardxgyms.vercel.app/owner/members'}
                {activePreviewTab === 'attendance' && 'leopardxgyms.vercel.app/owner/attendance'}
              </span>
            </div>

            <div className="preview-tabs">
              <button
                type="button"
                onClick={() => setActivePreviewTab('dashboard')}
                className={`preview-tab-btn ${activePreviewTab === 'dashboard' ? 'active' : ''}`}
              >
                Owner Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('members')}
                className={`preview-tab-btn ${activePreviewTab === 'members' ? 'active' : ''}`}
              >
                Member Management
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('attendance')}
                className={`preview-tab-btn ${activePreviewTab === 'attendance' ? 'active' : ''}`}
              >
                Attendance Ledger
              </button>
            </div>
          </div>

          <div className="preview-mockup-body">
            {/* Demo Notice Banner */}
            <div className="preview-demo-badge">
              <span className="demo-dot" />
              <span>Interactive Live Preview • Pranav Gym Operational Workspace (Demo)</span>
            </div>

            {activePreviewTab === 'dashboard' && (
              <div className="preview-content-fade">
                <div className="preview-header-row">
                  <div>
                    <h3 className="preview-gym-title">Pranav Gym & Fitness Center</h3>
                    <p className="preview-gym-subtitle">
                      Owner Operations Dashboard • Tenant Slug: <code>/gym/pranav-gym</code>
                    </p>
                  </div>
                  <span className="status-live-pill">
                    ● Real-Time System Active
                  </span>
                </div>

                <div className="preview-kpi-grid">
                  <div className="preview-kpi-card">
                    <div className="kpi-label">Total Registered Members</div>
                    <div className="kpi-value">2,116</div>
                    <div className="kpi-sub">1,840 Active • 276 Inactive</div>
                  </div>
                  <div className="preview-kpi-card highlight-orange">
                    <div className="kpi-label">Today's Attendance</div>
                    <div className="kpi-value">84 Check-ins</div>
                    <div className="kpi-sub">Peak hours: 6:00 AM - 9:30 AM</div>
                  </div>
                  <div className="preview-kpi-card">
                    <div className="kpi-label">Monthly Collections</div>
                    <div className="kpi-value">₹ 3,48,000</div>
                    <div className="kpi-sub">100% Cash/UPI reconciliations</div>
                  </div>
                  <div className="preview-kpi-card">
                    <div className="kpi-label">Expiring Within 7 Days</div>
                    <div className="kpi-value warning-text">14 Members</div>
                    <div className="kpi-sub">Automated renewal notices queued</div>
                  </div>
                </div>

                {/* Mini Live Ledger Demo */}
                <div className="preview-mini-ledger">
                  <div className="ledger-header">
                    <span>Recent Daily Check-Ins</span>
                    <span className="ledger-badge">Live Feed</span>
                  </div>
                  <div className="ledger-row">
                    <div className="ledger-member">
                      <div className="member-avatar">YJ</div>
                      <div>
                        <strong>Yash Jadhav</strong>
                        <div className="member-meta">Member ID #2106 • Gym + Cardio</div>
                      </div>
                    </div>
                    <span className="time-pill">07:15 AM</span>
                  </div>
                  <div className="ledger-row">
                    <div className="ledger-member">
                      <div className="member-avatar">AP</div>
                      <div>
                        <strong>Ashwini Patil</strong>
                        <div className="member-meta">Member ID #2107 • Annual Fitness</div>
                      </div>
                    </div>
                    <span className="time-pill">07:22 AM</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'members' && (
              <div className="preview-content-fade">
                <div className="preview-header-row">
                  <div>
                    <h3 className="preview-gym-title">Member Directory & Excel Alignment</h3>
                    <p className="preview-gym-subtitle">
                      2,000+ Records synced with Excel CSV import fields
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge-preview-tag"><Upload size={12} /> Excel CSV Compatible</span>
                  </div>
                </div>

                <div className="preview-table-wrapper">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>NAME</th>
                        <th>M TYPE</th>
                        <th>TOTAL AM</th>
                        <th>RECEIVED AM</th>
                        <th>BAL. AM</th>
                        <th>RC N</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="pill-mono">#2106</span></td>
                        <td><strong>Yash Jadhav</strong></td>
                        <td><span className="badge-plan">Gym + Cardio</span></td>
                        <td>₹1,200</td>
                        <td>₹1,200</td>
                        <td><span className="balance-cleared">₹0</span></td>
                        <td><span className="pill-mono">#4372</span></td>
                        <td><span className="pill-active">Active</span></td>
                      </tr>
                      <tr>
                        <td><span className="pill-mono">#2110</span></td>
                        <td><strong>Yash Sorak</strong></td>
                        <td><span className="badge-plan">Gym + Cardio</span></td>
                        <td>₹3,000</td>
                        <td>₹1,000</td>
                        <td><span className="balance-due">₹2,000</span></td>
                        <td><span className="pill-mono">#4379</span></td>
                        <td><span className="pill-active">Active</span></td>
                      </tr>
                      <tr>
                        <td><span className="pill-mono">#2114</span></td>
                        <td><strong>Aditya Verma</strong></td>
                        <td><span className="badge-plan">Annual Pro</span></td>
                        <td>₹6,000</td>
                        <td>₹4,000</td>
                        <td><span className="balance-due">₹2,000</span></td>
                        <td><span className="pill-mono">#4387</span></td>
                        <td><span className="pill-active">Active</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activePreviewTab === 'attendance' && (
              <div className="preview-content-fade">
                <div className="preview-header-row">
                  <div>
                    <h3 className="preview-gym-title">Smart Attendance System</h3>
                    <p className="preview-gym-subtitle">
                      Instant single-click check-ins with anti-duplicate validation
                    </p>
                  </div>
                </div>

                <div className="preview-attendance-deck">
                  <div className="attendance-search-box">
                    <input
                      type="text"
                      readOnly
                      value="Search Yash Jadhav (#2106)..."
                      className="attendance-fake-input"
                    />
                    <button type="button" className="btn-attendance-mark">Check In</button>
                  </div>
                  <div className="attendance-verified-banner">
                    <CheckCircle2 size={18} color="#16A34A" />
                    <span>Member Yash Jadhav (#2106) Checked In at 07:15 AM • Plan Active</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ====================================================================
          PRODUCT HIGHLIGHTS - 6 CORE ENTERPRISE FEATURE CARDS
          ==================================================================== */}
      <section id="features" className="landing-section">
        <div className="section-header">
          <span className="section-tag">Enterprise Capabilities</span>
          <h2 className="section-title">Built For Gyms of Any Scale</h2>
          <p className="section-subtitle">
            From single boutique studios to multi-city fitness chains, LeopardxGyms provides the exact operating modules needed to streamline gym management.
          </p>
        </div>

        <div className="features-grid">
          {/* 1. Member Management */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Users size={24} />
            </div>
            <h3 className="feature-title">Member Management</h3>
            <p className="feature-desc">
              Comprehensive member profiles, Excel CSV bulk import for 2,000+ members, photo records, and renewal histories.
            </p>
          </div>

          {/* 2. Membership Management */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Layers size={24} />
            </div>
            <h3 className="feature-title">Membership Management</h3>
            <p className="feature-desc">
              Flexible membership tiers (Monthly, Quarterly, Annual), automated expiry calculations, and renewal reminders.
            </p>
          </div>

          {/* 3. Smart Attendance */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <CalendarCheck size={24} />
            </div>
            <h3 className="feature-title">Smart Attendance</h3>
            <p className="feature-desc">
              Sub-second daily check-ins, automatic duplicate check-in prevention, and hourly traffic distribution logs.
            </p>
          </div>

          {/* 4. Payment Tracking */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <CreditCard size={24} />
            </div>
            <h3 className="feature-title">Payment Tracking</h3>
            <p className="feature-desc">
              Complete tracking of total amounts, received payments, and pending balances with instant status badges.
            </p>
          </div>

          {/* 5. Digital Receipts */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Receipt size={24} />
            </div>
            <h3 className="feature-title">Digital Receipts</h3>
            <p className="feature-desc">
              Instant automated PDF receipts, Brevo email dispatches, and member portal self-service download links.
            </p>
          </div>

          {/* 6. Business Analytics */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <BarChart3 size={24} />
            </div>
            <h3 className="feature-title">Business Analytics</h3>
            <p className="feature-desc">
              Actionable cashflow graphs, active-to-inactive retention curves, and daily attendance throughput trends.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          WHY CHOOSE LEOPARDXGYMS
          ==================================================================== */}
      <section id="why-us" className="landing-section" style={{ background: 'var(--bg-surface-elevated)', borderRadius: 28, padding: '70px 24px', margin: '20px auto 80px' }}>
        <div className="section-header">
          <span className="section-tag">The Leopardx Advantage</span>
          <h2 className="section-title">Why Fitness Leaders Choose LeopardxGyms</h2>
          <p className="section-subtitle">
            Traditional gym tools are clunky, desktop-bound, or charge huge percentages. LeopardxGyms gives you total ownership.
          </p>
        </div>

        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon-box">
              <Building2 size={24} />
            </div>
            <h3 className="why-title">Dedicated Gym Subdomains & Branding</h3>
            <p className="why-desc">
              Your gym gets its own dedicated web address (e.g. <code>/gym/pranav-gym</code>) featuring your custom logo and plans. No generic shared interface.
            </p>
          </div>

          <div className="why-card">
            <div className="why-icon-box">
              <Shield size={24} />
            </div>
            <h3 className="why-title">Strict Multi-Tenant Isolation</h3>
            <p className="why-desc">
              Your member data, financial numbers, and operational records are securely partitioned at the database and JWT middleware levels.
            </p>
          </div>

          <div className="why-card">
            <div className="why-icon-box">
              <Smartphone size={24} />
            </div>
            <h3 className="why-title">Zero Proprietary Hardware Needed</h3>
            <p className="why-desc">
              Operates effortlessly on any phone, tablet, laptop, or desktop. No expensive proprietary biometric terminals or maintenance fees.
            </p>
          </div>

          <div className="why-card">
            <div className="why-icon-box">
              <Zap size={24} />
            </div>
            <h3 className="why-title">Brevo Automated Email Invoicing</h3>
            <p className="why-desc">
              Dispatches member welcome credentials, password setups, and digital PDF payment receipts automatically with zero manual effort.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          HOW IT WORKS (3-STEP TIMELINE)
          ==================================================================== */}
      <section id="how-it-works" className="landing-section">
        <div className="section-header">
          <span className="section-tag">Quick Onboarding</span>
          <h2 className="section-title">Get Running In Less Than 5 Minutes</h2>
          <p className="section-subtitle">
            Transitioning from paper or Excel to LeopardxGyms is fast, smooth, and painless.
          </p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3 className="step-title">Provision Your Gym Workspace</h3>
            <p className="step-desc">
              Your gym tenant is provisioned with a custom slug (e.g. <code>/gym/your-gym</code>). Upload your logo, specify opening hours, and set contact details.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>
            <h3 className="step-title">Import Members & Setup Plans</h3>
            <p className="step-desc">
              Upload your existing member spreadsheet directly via CSV bulk import. Define your monthly, quarterly, or annual membership tiers.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <h3 className="step-title">Automate Daily Operations</h3>
            <p className="step-desc">
              Record rapid attendance check-ins, log payments with auto-calculated dues, and let the system handle expiry notifications and receipts.
            </p>
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
            Every fitness center registered on LeopardxGyms has its own dedicated portal URL with custom branding, membership plans, and member access.
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
                      <span>leopardxgyms.vercel.app/gym/{gymSlug}</span>
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
      <section id="pricing" className="landing-section" style={{ background: 'var(--bg-surface-elevated)', borderRadius: 28, padding: '70px 24px', margin: '20px auto 80px' }}>
        <div className="section-header">
          <span className="section-tag">Transparent Subscriptions</span>
          <h2 className="section-title">Straightforward Platform Pricing</h2>
          <p className="section-subtitle">
            Scale your gym without hidden percentage cuts or device lock-ins. Pick the tier that matches your facility size.
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
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Smart Attendance Logging</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Membership Expiry Alerts</li>
            </ul>
            <button type="button" onClick={() => setIsLoginModalOpen(true)} className="btn-visit-gym">
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
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--brand-primary)" /> Excel/CSV Bulk Import (2,000+ members)</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--brand-primary)" /> Automated Brevo Email Receipts</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--brand-primary)" /> Financial & Revenue Analytics</li>
            </ul>
            <button type="button" onClick={() => setIsLoginModalOpen(true)} className="btn-visit-gym">
              Start Free 14-Day Trial
            </button>
          </div>

          {/* Enterprise */}
          <div className="pricing-card">
            <h3 className="pricing-plan-name">Multi-Branch Enterprise</h3>
            <p className="pricing-plan-desc">For fitness chains with multi-location management.</p>
            <div className="pricing-price-box">
              <span className="pricing-currency">₹</span>
              <span className="pricing-amount">8,999</span>
              <span className="pricing-period">/ month</span>
            </div>
            <ul className="pricing-feature-list">
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Multiple Gym Tenant Portals</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Super Admin Centralized Governance</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> Dedicated Cloud Database Instance</li>
              <li className="pricing-feature-item"><CheckCircle2 size={16} color="var(--color-success)" /> 24/7 Priority SLA Support</li>
            </ul>
            <button type="button" onClick={() => setIsLoginModalOpen(true)} className="btn-visit-gym">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          FAQ SECTION
          ==================================================================== */}
      <section id="faq" className="landing-section">
        <div className="section-header">
          <span className="section-tag">Frequently Asked Questions</span>
          <h2 className="section-title">Got Questions? We've Got Answers.</h2>
          <p className="section-subtitle">
            Learn more about how LeopardxGyms manages multi-tenant gyms, CSV imports, and automated operations.
          </p>
        </div>

        <div className="faq-grid">
          {faqList.map((item, idx) => (
            <div
              key={idx}
              className={`faq-card ${openFaqIndex === idx ? 'open' : ''}`}
              onClick={() => toggleFaq(idx)}
            >
              <div className="faq-question-row">
                <span className="faq-question-text">{item.q}</span>
                <button
                  type="button"
                  className="faq-toggle-btn"
                  aria-label={openFaqIndex === idx ? 'Collapse answer' : 'Expand answer'}
                >
                  {openFaqIndex === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
              {openFaqIndex === idx && (
                <div className="faq-answer-text animate-fade-in">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          FOOTER
          ==================================================================== */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand-side">
            <div className="landing-logo-badge" style={{ width: 36, height: 36 }}>
              <Dumbbell size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>LeopardxGyms</div>
              <div className="footer-copy">© 2026 LeopardxGyms Multi-Tenant Platform. All rights reserved.</div>
            </div>
          </div>

          <div className="footer-links">
            <a href="#features" className="footer-link">Features</a>
            <a href="#preview" className="footer-link">Platform Preview</a>
            <a href="#why-us" className="footer-link">Why Us</a>
            <a href="#gyms" className="footer-link">Gym Showcase</a>
            <a href="#pricing" className="footer-link">Plans</a>
            <a href="#faq" className="footer-link">FAQ</a>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="footer-link footer-signin-link"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>

      {/* On-Page Universal Login Modal */}
      <CommonLoginModal
        isOpen={isLoginModalOpen}
        onClose={handleCloseLoginModal}
      />
    </div>
  );
};

export default LandingScreen;
