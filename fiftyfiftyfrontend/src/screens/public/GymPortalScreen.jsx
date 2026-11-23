import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Dumbbell,
  MapPin,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  Shield,
  User,
  ExternalLink,
  ChevronLeft,
  Sparkles,
  Zap,
  Flame,
  Award,
  Activity,
  HeartPulse,
  Users,
  Compass,
  Check,
  Calendar,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../shared/services/apiClient';
import { ThemeToggle } from '../../shared/components/ThemeToggle/ThemeToggle';
import { Button } from '../../shared/components/Button/Button';
import { Modal } from '../../shared/components/Modal/Modal';
import { Input } from '../../shared/components/Input/Input';
import { CommonLoginModal } from '../../shared/components/CommonLoginModal/CommonLoginModal';
import '../../styles/screens/public/gymPortalScreen.css';

export const GymPortalScreen = () => {
  const { slug } = useParams();
  const { user, isAuthenticated, role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [gymData, setGymData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Common Login Modal for Members and Gym Admins
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginInitialRole, setLoginInitialRole] = useState('MEMBER');

  // Inquiry / Enrollment Modal
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  // Fetch dynamic gym details and membership plans from database
  useEffect(() => {
    let isMounted = true;
    const fetchGymDetails = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/public/gyms/${slug}`);
        const data = response?.data || response;
        if (isMounted && data?.gym) {
          setGymData(data.gym);
          setPlans(data.plans || []);
        }
      } catch (err) {
        console.warn('Error fetching gym portal:', err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (slug) {
      fetchGymDetails();
    }
    return () => { isMounted = false; };
  }, [slug]);

  // Handle inquiry submit
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryPhone.trim()) {
      showToast('Please provide your name and phone number', 'warning');
      return;
    }
    setIsSubmittingInquiry(true);
    try {
      await apiClient.post(`/public/gyms/${slug}/inquire`, {
        name: inquiryName,
        phone: inquiryPhone,
        email: inquiryEmail,
        planId: selectedPlanId
      });
      showToast(`Thank you ${inquiryName}! The ${gymData?.name || 'gym'} team will contact you shortly.`, 'success');
      setIsInquiryModalOpen(false);
      setInquiryName('');
      setInquiryPhone('');
      setInquiryEmail('');
    } catch (err) {
      showToast(err.message || 'Could not submit inquiry. Please call the gym directly.', 'danger');
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  if (isLoading) {
    return (
      <div className="gym-portal-loader-container">
        <div className="gym-portal-loader-box">
          <Dumbbell className="animate-spin" size={40} color="var(--brand-primary)" style={{ margin: '0 auto 16px' }} />
          <h2>Connecting to Gym Portal...</h2>
          <p>Loading real-time member records, plans, and facility profile</p>
        </div>
      </div>
    );
  }

  // Fallback gym data with dynamic slug if gym record is not returned
  const gym = gymData || {
    name: 'FiftyFifty Fitness Club',
    slug: slug,
    address: 'Fitness Center Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    opening_hours: '06:00 AM - 10:00 PM',
    description: 'Premier fitness arena with state-of-the-art strength equipment, cardio conditioning, and certified coaches.',
    phone: '+91 98000 00000',
    email: 'info@gym.com'
  };

  // Professional facilities list with Lucide icons (no childish emojis)
  const clubFacilities = [
    {
      icon: Dumbbell,
      name: 'Olympic Free Weights & Racks',
      desc: 'Commercial power racks, calibrated plates, Olympic barbells, and dumbells up to 50kg.'
    },
    {
      icon: Activity,
      name: 'Cardio Conditioning Zone',
      desc: 'High-end treadmills, rowing ergs, curved runners, stairmasters, and cross-trainers.'
    },
    {
      icon: Flame,
      name: 'Functional & HIIT Arena',
      desc: 'Sprint turf track, battle ropes, plyo boxes, sled pushes, and core conditioning zones.'
    },
    {
      icon: Award,
      name: 'Certified Personal Trainers',
      desc: 'Elite form coaching, personalized transformation regimens, and goal tracking.'
    },
    {
      icon: Zap,
      name: 'Instant QR Attendance Check-In',
      desc: 'Seamless sub-second attendance verification via the LeopardxGyms member network.'
    },
    {
      icon: Shield,
      name: 'Private Lockers & Luxury Suites',
      desc: 'Sanitized digital locker storage, changing suites, and hygienic shower facilities.'
    }
  ];

  return (
    <div className="gym-portal-container">
      {/* ====================================================================
          STICKY TOP GYM NAVBAR
          ==================================================================== */}
      <nav className="gym-portal-navbar" aria-label="Gym Portal Navigation">
        <div className="gym-portal-nav-inner">
          {/* Left Side: Leopardx Network Link & Dynamic Gym Branding */}
          <div className="gym-portal-nav-left">
            <Link to="/#gyms" className="gym-nav-network-link" title="Explore LeopardxGyms Network">
              <ChevronLeft size={16} />
              <span>LeopardxGyms Network</span>
            </Link>

            <div className="gym-nav-divider" />

            <div className="gym-portal-brand">
              {gym.logo_url ? (
                <img src={gym.logo_url} alt={gym.name} className="gym-portal-nav-logo" />
              ) : (
                <div className="gym-portal-nav-logo-fallback">
                  {gym.name?.charAt(0) || 'G'}
                </div>
              )}
              <span className="gym-portal-nav-title">{gym.name}</span>
            </div>
          </div>

          {/* Right Side: Theme Toggle & Authentication CTAs */}
          <div className="gym-portal-nav-actions">
            <ThemeToggle showLabel={false} />

            {isAuthenticated ? (
              <Button
                variant="primary"
                size="small"
                onClick={() => {
                  const norm = (role || user?.role || '').toUpperCase();
                  if (norm === 'GYM_OWNER') navigate('/owner/dashboard');
                  else if (norm === 'SUPER_ADMIN' || norm === 'PLATFORM_ADMIN') navigate('/admin/dashboard');
                  else navigate('/member/dashboard');
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <div className="gym-nav-btn-group">
                <Link
                  to={`/gym/${slug}/login`}
                  className="btn-gym-nav-owner"
                  title="Gym Owner Admin Access"
                >
                  <Shield size={14} />
                  <span>Owner Login</span>
                </Link>

                <button
                  type="button"
                  className="btn-gym-nav-member"
                  onClick={() => {
                    setLoginInitialRole('MEMBER');
                    setIsLoginModalOpen(true);
                  }}
                  title="Member Sign In"
                >
                  <User size={14} />
                  <span>Member Login</span>
                </button>

                <button
                  type="button"
                  className="btn-gym-nav-join"
                  onClick={() => setIsInquiryModalOpen(true)}
                  title="Join This Gym"
                >
                  <span>Join This Gym</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ====================================================================
          PREMIUM GYM HERO SECTION (DARK NAVY GRADIENT & FITNESS ATMOSPHERE)
          ==================================================================== */}
      <section className="gym-portal-hero">
        <div className="gym-hero-backdrop-pattern" />
        <div className="gym-hero-glow-accent" />

        <div className="gym-hero-inner">
          {/* Gym Logo Badge */}
          <div className="gym-hero-logo-box">
            {gym.logo_url ? (
              <img src={gym.logo_url} alt={gym.name} className="gym-hero-logo-img" />
            ) : (
              <div className="gym-hero-logo-placeholder">
                <Dumbbell size={44} strokeWidth={2.2} />
              </div>
            )}
            <span className="gym-badge-verified">
              <CheckCircle2 size={13} />
              <span>Verified Gym</span>
            </span>
          </div>

          {/* Gym Details & Metadata */}
          <div className="gym-hero-info">
            <div className="gym-hero-portal-badge">
              <Compass size={13} color="var(--brand-primary)" />
              <span>Official Dedicated Portal • leopardxgyms.vercel.app/gym/{gym.slug || slug}</span>
            </div>

            <h1 className="gym-hero-title">{gym.name}</h1>

            <p className="gym-hero-desc">
              {gym.description ||
                'Welcome to our premier fitness facility! We offer modern strength equipment, functional conditioning, steam recovery, and certified coaches dedicated to your personal health and physique transformation.'}
            </p>

            {/* Quick Contact & Location Chips */}
            <div className="gym-hero-chips">
              <div className="gym-hero-chip">
                <MapPin size={15} color="var(--brand-primary)" />
                <span>
                  {gym.address
                    ? `${gym.address}, ${gym.city || ''} ${gym.state ? `, ${gym.state}` : ''}`
                    : `${gym.city || 'Mumbai'}, ${gym.state || 'Maharashtra'}`}
                </span>
              </div>

              <div className="gym-hero-chip">
                <Clock size={15} color="var(--brand-primary)" />
                <span>Operating Hours: {gym.opening_hours || '06:00 AM - 10:00 PM'}</span>
              </div>

              {gym.phone && (
                <div className="gym-hero-chip">
                  <Phone size={15} color="var(--brand-primary)" />
                  <span>{gym.phone}</span>
                </div>
              )}
            </div>

            {/* Hero Action CTA Buttons */}
            <div className="gym-hero-actions">
              <button
                type="button"
                className="btn-gym-cta-primary"
                onClick={() => setIsInquiryModalOpen(true)}
              >
                <Flame size={18} />
                <span>Enroll / Inquire Now</span>
              </button>

              <button
                type="button"
                className="btn-gym-cta-secondary"
                onClick={() => {
                  setLoginInitialRole('MEMBER');
                  setIsLoginModalOpen(true);
                }}
              >
                <User size={18} />
                <span>Member Sign In</span>
              </button>

              <Link
                to={`/gym/${slug}/login`}
                className="btn-gym-cta-outline"
                title="Gym Owner Admin Dashboard"
              >
                <Shield size={16} />
                <span>Gym Admin Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          MAIN GYM CONTENT: FACILITIES & MEMBERSHIP TIERS
          ==================================================================== */}
      <main className="gym-portal-main">
        {/* Facilities & Amenities Section */}
        <section className="gym-facilities-section">
          <div className="gym-section-header">
            <span className="gym-section-tag">Premium Training Environment</span>
            <h2 className="gym-section-title">Club Facilities & Amenities</h2>
            <p className="gym-section-subtitle">
              Engineered with world-class fitness equipment, specialized recovery zones, and sanitary amenities.
            </p>
          </div>

          <div className="gym-facilities-grid">
            {clubFacilities.map((fac, idx) => {
              const Icon = fac.icon;
              return (
                <div key={idx} className="gym-facility-card">
                  <div className="gym-facility-icon-box">
                    <Icon size={24} />
                  </div>
                  <h3 className="gym-facility-title">{fac.name}</h3>
                  <p className="gym-facility-desc">{fac.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Membership Plans & Pricing Section */}
        <section id="plans" className="gym-plans-section">
          <div className="gym-section-header">
            <span className="gym-section-tag">Transparent Memberships</span>
            <h2 className="gym-section-title">Membership Plans & Pricing</h2>
            <p className="gym-section-subtitle">
              Select the training plan that matches your fitness goals. Transparent pricing with zero hidden fees.
            </p>
          </div>

          <div className="gym-plans-grid">
            {plans.length === 0 ? (
              <div className="gym-no-plans-box">
                <Dumbbell size={36} color="var(--brand-primary)" style={{ margin: '0 auto 12px' }} />
                <h3>No Public Membership Plans Published Yet</h3>
                <p>
                  Please contact the <strong>{gym.name}</strong> front desk directly or submit an inquiry to receive a customized pricing quote.
                </p>
                <button
                  type="button"
                  className="btn-gym-cta-primary"
                  style={{ marginTop: 20 }}
                  onClick={() => setIsInquiryModalOpen(true)}
                >
                  <Flame size={16} />
                  <span>Inquire for Custom Pricing</span>
                </button>
              </div>
            ) : (
              plans.map((p) => {
                const isPop = p.is_popular || false;
                const features = Array.isArray(p.features) && p.features.length > 0
                  ? p.features
                  : ['Full Gym Access', 'Strength & Free Weights', 'Locker Room & Showers', 'App Attendance Verification'];

                return (
                  <div key={p.id} className={`gym-pricing-card ${isPop ? 'featured-card' : ''}`}>
                    {isPop && (
                      <div className="gym-pricing-popular-pill">
                        <Sparkles size={12} />
                        <span>Recommended Plan</span>
                      </div>
                    )}

                    <h3 className="gym-pricing-plan-title">{p.name}</h3>
                    <p className="gym-pricing-plan-desc">
                      Full access membership designed for consistent strength and conditioning progress.
                    </p>

                    <div className="gym-pricing-price-box">
                      <span className="gym-pricing-currency">₹</span>
                      <span className="gym-pricing-amount">{Number(p.price).toLocaleString()}</span>
                      <span className="gym-pricing-duration">
                        / {p.duration_label || `${p.duration_days} Days`}
                      </span>
                    </div>

                    <div className="gym-pricing-features-title">Plan Inclusions:</div>
                    <ul className="gym-pricing-features-list">
                      {features.map((feat, fIdx) => (
                        <li key={fIdx} className="gym-pricing-feature-item">
                          <CheckCircle2 size={16} color="var(--brand-primary)" className="feat-check-icon" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className={`btn-gym-plan-select ${isPop ? 'btn-select-popular' : ''}`}
                      onClick={() => {
                        setSelectedPlanId(p.name);
                        setIsInquiryModalOpen(true);
                      }}
                    >
                      <span>Join Now with {p.name}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* ====================================================================
          GYM PORTAL FOOTER
          ==================================================================== */}
      <footer className="gym-portal-footer">
        <div className="gym-portal-footer-inner">
          <div className="gym-footer-brand">
            <div className="gym-footer-logo-badge">
              <Dumbbell size={20} color="#FFFFFF" />
            </div>
            <div>
              <div className="gym-footer-title">{gym.name}</div>
              <div className="gym-footer-sub">
                Powered by LeopardxGyms Multi-Tenant Operating System • {gym.city || 'India'}
              </div>
            </div>
          </div>

          <div className="gym-footer-links">
            <Link to="/#gyms" className="gym-footer-link">Other Gym Portals</Link>
            <Link to={`/gym/${slug}/login`} className="gym-footer-link">Owner Admin</Link>
            <button
              type="button"
              onClick={() => {
                setLoginInitialRole('MEMBER');
                setIsLoginModalOpen(true);
              }}
              className="gym-footer-link-btn"
            >
              Member Login
            </button>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          MODALS: UNIFIED COMMON LOGIN MODAL & INQUIRY ENROLLMENT MODAL
          ==================================================================== */}
      <CommonLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialRole={loginInitialRole}
      />

      {isInquiryModalOpen && (
        <Modal
          isOpen={isInquiryModalOpen}
          onClose={() => setIsInquiryModalOpen(false)}
          title={`Join ${gym.name}`}
          maxWidth="480px"
        >
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: '0.885rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Leave your details below and the <strong>{gym.name}</strong> team will arrange your complimentary club walkthrough and membership confirmation.
            </p>
          </div>

          <form onSubmit={handleInquirySubmit}>
            <Input
              label="Full Name *"
              value={inquiryName}
              onChange={(e) => setInquiryName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
            <Input
              label="Mobile Number *"
              value={inquiryPhone}
              onChange={(e) => setInquiryPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
            />
            <Input
              label="Email Address (Optional)"
              type="email"
              value={inquiryEmail}
              onChange={(e) => setInquiryEmail(e.target.value)}
              placeholder="name@example.com"
            />

            {selectedPlanId && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'var(--brand-primary-soft)',
                border: '1px solid var(--brand-primary-soft-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--brand-primary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: 16
              }}>
                <Sparkles size={16} />
                <span>Selected Membership Tier: {selectedPlanId}</span>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmittingInquiry}
              >
                Submit Membership Inquiry
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default GymPortalScreen;
