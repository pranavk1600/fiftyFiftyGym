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
  Award
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
  const { user, isAuthenticated, role, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [gymData, setGymData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dedicated member/owner login modal
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginRole, setLoginRole] = useState('MEMBER'); // 'MEMBER' or 'GYM_OWNER'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Inquiry modal
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

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

  // Handle member login on this gym page
  const handleGymLogin = async (e) => {
    e.preventDefault();
    setIsSubmittingLogin(true);
    try {
      const response = await apiClient.post('/auth/login', {
        email: loginEmail.trim(),
        password: loginPassword,
        portal: loginRole === 'GYM_OWNER' ? 'GYM_ADMIN' : 'MEMBER'
      });
      const data = response?.data || response;
      const { user: authedUser, token } = data;

      login(authedUser, token);
      showToast(`Welcome to ${gymData?.name || 'Gym'}, ${authedUser.fullName || 'Member'}!`, 'success');
      setIsLoginModalOpen(false);

      if ((authedUser.role || '').toUpperCase() === 'GYM_OWNER') {
        navigate('/owner/dashboard');
      } else {
        navigate('/member/dashboard');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Invalid email or password';
      showToast(errorMsg, 'danger');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

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
      showToast(`Thank you ${inquiryName}! The gym management will contact you shortly.`, 'success');
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
      <div className="gym-portal-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Dumbbell className="animate-spin" size={36} color="var(--brand-primary)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Connecting to Gym Portal...</h2>
        </div>
      </div>
    );
  }

  const gym = gymData || {
    name: 'FiftyFifty Fitness Hub',
    slug: slug,
    address: 'Fitness Center Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    opening_hours: '06:00 AM - 10:00 PM',
    description: 'Premier fitness arena with modern equipment and certified personal trainers.',
    phone: '+91 98000 00000',
    email: 'info@gym.com'
  };

  return (
    <div className="gym-portal-container">
      {/* Top Navbar */}
      <nav className="gym-portal-navbar">
        <div className="gym-portal-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
              <ChevronLeft size={16} />
              <span>LeopardxGyms Network</span>
            </Link>

            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />

            <div className="gym-portal-brand">
              {gym.logo_url ? (
                <img src={gym.logo_url} alt={gym.name} className="gym-portal-nav-logo" />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--brand-primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  {gym.name?.charAt(0) || 'G'}
                </div>
              )}
              <span className="gym-portal-nav-title">{gym.name}</span>
            </div>
          </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link
                  to={`/gym/${slug}/login`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <Shield size={13} color="var(--brand-primary)" />
                  <span>Owner Login</span>
                </Link>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <User size={14} />
                  <span>Member Login</span>
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => setIsInquiryModalOpen(true)}
                >
                  Join This Gym
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Gym Hero Banner */}
      <section className="gym-portal-hero">
        <div className="gym-hero-inner">
          {gym.logo_url ? (
            <img src={gym.logo_url} alt={gym.name} className="gym-hero-logo-large" />
          ) : (
            <div className="gym-hero-logo-fallback">
              {gym.name?.charAt(0) || 'G'}
            </div>
          )}

          <div className="gym-hero-details">
            <div className="gym-tenant-url-badge">
              <span>Dedicated Portal: leopardxgyms.com/gym/{gym.slug || slug}</span>
            </div>

            <h1 className="gym-hero-title">{gym.name}</h1>

            <p className="gym-hero-description">
              {gym.description || 'Welcome to our fitness community! We offer state-of-the-art strength equipment, certified coaches, steam recovery, and group conditioning classes.'}
            </p>

            <div className="gym-contact-chips">
              <div className="gym-contact-chip">
                <MapPin size={14} color="var(--brand-primary)" />
                <span>{gym.address ? `${gym.address}, ${gym.city || ''}` : `${gym.city || 'Mumbai'}, ${gym.state || ''}`}</span>
              </div>
              <div className="gym-contact-chip">
                <Clock size={14} color="var(--brand-primary)" />
                <span>{gym.opening_hours || '06:00 AM - 10:00 PM'}</span>
              </div>
              {gym.phone && (
                <div className="gym-contact-chip">
                  <Phone size={14} color="var(--brand-primary)" />
                  <span>{gym.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="gym-hero-ctas">
            <Button
              variant="primary"
              size="large"
              onClick={() => setIsInquiryModalOpen(true)}
            >
              <Flame size={18} />
              <span>Enroll / Inquire Now</span>
            </Button>
            <Button
              variant="outline"
              size="large"
              onClick={() => { setLoginRole('MEMBER'); setLoginEmail(''); setIsLoginModalOpen(true); }}
            >
              <User size={18} />
              <span>Member Sign In</span>
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={() => { setLoginRole('GYM_OWNER'); setLoginEmail(''); setIsLoginModalOpen(true); }}
            >
              <Shield size={14} />
              <span>Gym Admin Portal</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="gym-portal-main">
        {/* Facilities & Amenities */}
        <h2 className="gym-section-title">Club Facilities & Amenities</h2>
        <p className="gym-section-subtitle">
          Everything you need to elevate your strength, conditioning, and physique.
        </p>

        <div className="gym-amenities-row">
          <div className="gym-amenity-card">🏋️ Olympic Free Weights Area</div>
          <div className="gym-amenity-card">🏃 Cardio Theater & Treadmills</div>
          <div className="gym-amenity-card">🧖 Steam & Sauna Recovery</div>
          <div className="gym-amenity-card">🚿 Premium Showers & Lockers</div>
          <div className="gym-amenity-card">🥊 Functional HIIT & Boxing Zone</div>
          <div className="gym-amenity-card">📱 FiftyFifty QR Attendance App</div>
          <div className="gym-amenity-card">🥗 Nutrition Consultation</div>
        </div>

        {/* Membership Plans */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <h2 className="gym-section-title">Membership Plans & Pricing</h2>
            <p className="gym-section-subtitle" style={{ marginBottom: 20 }}>
              Choose the ideal plan for your training frequency. Transparent pricing with zero hidden charges.
            </p>
          </div>
        </div>

        <div className="gym-plans-grid">
          {plans.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              padding: '36px 24px',
              textAlign: 'center',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)'
            }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 6 }}>No Membership Plans Published Yet</h3>
              <p style={{ fontSize: '0.9rem' }}>Please contact the gym team directly to inquire about customized membership packages and pricing.</p>
            </div>
          ) : (
            plans.map((p) => {
              const isPop = p.is_popular || false;
              const features = Array.isArray(p.features) ? p.features : ['Full Gym Access', 'Locker Facility', 'App Check-in'];

              return (
                <div key={p.id} className={`gym-plan-card ${isPop ? 'popular' : ''}`}>
                  {isPop && <div className="gym-plan-badge">Most Popular</div>}
                  <h3 className="gym-plan-title">{p.name}</h3>

                  <div className="gym-plan-price-row">
                    <span className="gym-plan-price">₹{Number(p.price).toLocaleString()}</span>
                    <span className="gym-plan-duration">/ {p.duration_label || `${p.duration_days} Days`}</span>
                  </div>

                  <ul className="gym-plan-features">
                    {features.map((feat, idx) => (
                      <li key={idx} className="gym-plan-feature">
                        <CheckCircle2 size={16} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="gym-plan-action">
                    <Button
                      variant={isPop ? 'primary' : 'outline'}
                      fullWidth
                      onClick={() => {
                        setSelectedPlanId(p.name);
                        setIsInquiryModalOpen(true);
                      }}
                    >
                      Select {p.name}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Member / Owner Login Modal */}
      {/* Unified Common Login Modal */}
      <CommonLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialRole="MEMBER"
      />

      {/* Inquiry / Join Gym Modal */}
      {isInquiryModalOpen && (
        <Modal
          isOpen={isInquiryModalOpen}
          onClose={() => setIsInquiryModalOpen(false)}
          title={`Join ${gym.name}`}
          maxWidth="460px"
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Leave your contact details and our fitness team will arrange a complimentary gym tour and plan consultation.
          </p>

          <form onSubmit={handleInquirySubmit}>
            <Input
              label="Full Name *"
              value={inquiryName}
              onChange={(e) => setInquiryName(e.target.value)}
              placeholder="e.g. Full Name"
              required
            />
            <Input
              label="Mobile Number *"
              value={inquiryPhone}
              onChange={(e) => setInquiryPhone(e.target.value)}
              placeholder="+91 98765 00000"
              required
            />
            <Input
              label="Email Address (Optional)"
              type="email"
              value={inquiryEmail}
              onChange={(e) => setInquiryEmail(e.target.value)}
              placeholder="e.g. name@example.com"
            />
            {selectedPlanId && (
              <div style={{ padding: '8px 12px', background: 'var(--brand-primary-soft)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 600, marginBottom: 14 }}>
                Interested Plan: {selectedPlanId}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmittingInquiry}
              >
                Submit Inquiry
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default GymPortalScreen;
