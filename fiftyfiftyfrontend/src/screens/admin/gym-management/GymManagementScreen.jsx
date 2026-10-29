import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  Save,
  RotateCcw,
  MapPin,
  AlertCircle,
  Shield,
  PlusCircle,
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  Phone,
  List,
  Edit3,
  UploadCloud,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Modal } from '../../../shared/components/Modal/Modal';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';

/**
 * Cloudinary Logo Uploader Component
 * Supports PNG, JPG, JPEG, and WebP up to 5 MB with instant preview, progress, and remove/replace.
 */
const LogoUploadField = ({
  label = 'Gym Logo',
  value = '',
  onChange,
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid format. Only PNG, JPG, JPEG, and WebP images are allowed.');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      setUploadError('File exceeds 5 MB. Please select an image under 5 MB.');
      return;
    }

    setUploadError('');
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);

    setIsUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await apiClient.post('/admin/gyms/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = response.data?.data || response.data || response;
      const uploadedUrl = data.secure_url || data.url;
      if (uploadedUrl) {
        onChange(uploadedUrl);
      } else {
        throw new Error('No image URL returned by upload server');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      // Fallback endpoint attempt
      try {
        const fallbackRes = await apiClient.post('/admin/upload-logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const fallbackData = fallbackRes.data?.data || fallbackRes.data || fallbackRes;
        const uploadedUrl = fallbackData.secure_url || fallbackData.url;
        if (uploadedUrl) {
          onChange(uploadedUrl);
          return;
        }
      } catch (fbErr) {
        // preserve original error
      }
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload logo to Cloudinary');
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setLocalPreview(null);
    setUploadError('');
    onChange('');
  };

  const currentDisplayUrl = localPreview || value;

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
        {label}
      </label>

      {currentDisplayUrl ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: 12,
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)'
        }}>
          <img
            src={currentDisplayUrl}
            alt="Gym Logo"
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              objectFit: 'cover',
              border: '1px solid var(--border-subtle)',
              background: '#FFFFFF',
              flexShrink: 0
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isUploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" color="var(--brand-primary)" />
                  <span>Uploading to Cloudinary...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} color="var(--color-success, #16A34A)" />
                  <span>Logo Ready</span>
                </>
              )}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {isUploading ? 'Streaming buffer to cloud...' : currentDisplayUrl}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRemove}
              disabled={isUploading || disabled}
              style={{ fontSize: '0.8rem', padding: '6px 10px', color: 'var(--color-danger)' }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 16px',
            textAlign: 'center',
            cursor: isUploading || disabled ? 'not-allowed' : 'pointer',
            background: 'var(--bg-surface-elevated)',
            transition: 'border-color 0.2s ease, background 0.2s ease'
          }}
        >
          {isUploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={24} className="animate-spin" color="var(--brand-primary)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Uploading to Cloudinary...
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <UploadCloud size={28} color="var(--brand-primary)" />
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Upload Gym Logo to Cloudinary
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                PNG, JPG, JPEG, or WebP (max 5 MB)
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={isUploading || disabled}
      />

      {uploadError && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-danger, #DC2626)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
};

export const GymManagementScreen = () => {
  const { showToast } = useToast();

  // Active view: 'list' (Network & Owners) or 'editor' (Profile & Settings)
  const [activeTab, setActiveTab] = useState('list');

  // Gyms listing & selection state
  const [gyms, setGyms] = useState([]);
  const [isLoadingGyms, setIsLoadingGyms] = useState(true);
  const [selectedGymId, setSelectedGymId] = useState(null);

  // Profile Editor state
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [initialGymData, setInitialGymData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    email: '',
    phone: '',
    logo_url: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    opening_hours: '06:00 AM - 10:00 PM',
    description: '',
    business_contact: '',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState({});

  // Create Gym Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    logo_url: '',
    opening_hours: '06:00 AM - 10:00 PM',
    description: '',
    slug: ''
  });
  const [createErrors, setCreateErrors] = useState({});

  // Resend invitation state (stores gymId being resent)
  const [resendingGymId, setResendingGymId] = useState(null);

  /**
   * Fetch all gyms from database
   */
  const fetchGyms = useCallback(async () => {
    setIsLoadingGyms(true);
    try {
      const response = await apiClient.get('/admin/gyms');
      const list = response.data || response || [];
      const safeList = Array.isArray(list) ? list : [];
      setGyms(safeList);

      if (safeList.length > 0 && !selectedGymId) {
        setSelectedGymId(safeList[0].id);
      }
    } catch (err) {
      console.error('Failed to load gyms list:', err);
      showToast(err.message || 'Could not load gyms list from database', 'danger');
    } finally {
      setIsLoadingGyms(false);
    }
  }, [selectedGymId, showToast]);

  /**
   * Fetch specific gym profile for editing
   */
  const fetchGymProfile = useCallback(async (gymId) => {
    if (!gymId) return;
    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const response = await apiClient.get(`/admin/gyms/${gymId}`);
      const gym = response.data || response;
      const loaded = {
        name: gym.name || '',
        owner_name: gym.owner_name || gym.owner || '',
        email: gym.email || gym.owner_email || '',
        phone: gym.phone || '',
        logo_url: gym.logo_url || '',
        address: gym.address || '',
        city: gym.city || '',
        state: gym.state || '',
        postal_code: gym.postal_code || '',
        opening_hours: gym.opening_hours || '06:00 AM - 10:00 PM',
        description: gym.description || '',
        business_contact: gym.business_contact || gym.phone || '',
        status: gym.status || 'active'
      };
      setFormData(loaded);
      setInitialGymData(loaded);
    } catch (err) {
      console.error('Failed to load gym profile:', err);
      // Fallback to general /admin/gym endpoint if specific id endpoint fails
      try {
        const fallbackRes = await apiClient.get('/admin/gym');
        const gym = fallbackRes.data || fallbackRes;
        const loaded = {
          name: gym.name || '',
          owner_name: gym.owner_name || '',
          email: gym.email || '',
          phone: gym.phone || '',
          logo_url: gym.logo_url || '',
          address: gym.address || '',
          city: gym.city || '',
          state: gym.state || '',
          postal_code: gym.postal_code || '',
          opening_hours: gym.opening_hours || '06:00 AM - 10:00 PM',
          description: gym.description || '',
          business_contact: gym.business_contact || gym.phone || '',
          status: gym.status || 'active'
        };
        setFormData(loaded);
        setInitialGymData(loaded);
      } catch (fallbackErr) {
        setProfileError(fallbackErr.message || 'Could not load gym profile.');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  useEffect(() => {
    if (selectedGymId) {
      fetchGymProfile(selectedGymId);
    }
  }, [selectedGymId, fetchGymProfile]);

  // Handle Form Change in Profile Editor
  const handleEditChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateEditForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Gym name is required';
    if (!formData.email.trim()) {
      errors.email = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }
    if (!formData.phone.trim()) errors.phone = 'Contact phone number is required';
    if (!formData.opening_hours.trim()) errors.opening_hours = 'Operating hours are required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!validateEditForm()) {
      showToast('Please fix the validation errors before saving', 'warning');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleSaveConfirmed = async () => {
    setIsConfirmModalOpen(false);
    setIsSaving(true);

    try {
      const url = selectedGymId ? `/admin/gyms/${selectedGymId}` : '/admin/gym';
      await apiClient.put(url, formData);
      showToast('Gym profile and settings saved successfully to Supabase!', 'success');
      setInitialGymData({ ...formData });
      fetchGyms();
    } catch (err) {
      console.error('Failed to update gym:', err);
      showToast(err.message || 'Failed to save gym settings', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetEdit = () => {
    if (initialGymData) {
      setFormData({ ...initialGymData });
      setFormErrors({});
      showToast('Form reset to last saved state', 'info');
    }
  };

  // Create Gym Form Handlers
  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'name') {
        const autoSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        // Auto update slug if slug was empty or matching previous name
        if (!prev.slug || prev.slug === (prev.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) {
          updated.slug = autoSlug;
        }
      }
      return updated;
    });
    if (createErrors[field]) {
      setCreateErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateCreateForm = () => {
    const errors = {};
    if (!createForm.name.trim()) errors.name = 'Gym name is required';
    if (!createForm.owner_name.trim()) errors.owner_name = 'Owner full name is required';
    if (!createForm.email.trim()) {
      errors.email = 'Owner email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!createForm.phone.trim()) errors.phone = 'Owner phone number is required';

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateGymSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) {
      showToast('Please complete all required fields correctly', 'warning');
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiClient.post('/admin/gyms', createForm);
      const data = response.data || response;

      showToast(
        data.message || `Gym "${createForm.name}" created successfully!`,
        data.emailDelivered ? 'success' : 'warning'
      );

      // Reset form and close modal
      setCreateForm({
        name: '',
        owner_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        logo_url: '',
        opening_hours: '06:00 AM - 10:00 PM',
        description: '',
        slug: ''
      });
      setCreateErrors({});
      setIsCreateModalOpen(false);

      // Refresh gyms list and select the newly created gym
      await fetchGyms();
      if (data.gym?.id) {
        setSelectedGymId(data.gym.id);
      }
    } catch (err) {
      console.error('Failed to create gym:', err);
      showToast(err.message || 'Failed to create gym and owner account', 'danger');
    } finally {
      setIsCreating(false);
    }
  };

  // Resend Invitation Email Handler
  const handleResendInvitation = async (gymId, ownerEmail) => {
    setResendingGymId(gymId);
    try {
      const response = await apiClient.post(`/admin/gyms/${gymId}/resend-invitation`);
      const data = response.data || response;
      showToast(
        data.message || `Invitation successfully resent to ${ownerEmail}`,
        data.emailDelivered ? 'success' : 'warning'
      );
      fetchGyms();
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      showToast(err.message || 'Could not resend invitation email', 'danger');
    } finally {
      setResendingGymId(null);
    }
  };

  const hasUnsavedChanges = initialGymData && JSON.stringify(formData) !== JSON.stringify(initialGymData);

  // Helper for Invitation Status Badge
  const renderInvitationBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: '0.785rem',
            fontWeight: 600,
            background: 'var(--color-success-light, #DCFCE7)',
            color: 'var(--color-success, #16A34A)'
          }}>
            <CheckCircle2 size={13} />
            <span>Active</span>
          </span>
        );
      case 'password_setup_pending':
      case 'invitation_sent':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: '0.785rem',
            fontWeight: 600,
            background: 'var(--brand-primary-light, #FFF7ED)',
            color: 'var(--brand-primary, #EA580C)',
            border: '1px solid rgba(255, 107, 0, 0.2)'
          }}>
            <Clock size={13} />
            <span>Password Setup Pending</span>
          </span>
        );
      case 'invitation_failed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: '0.785rem',
            fontWeight: 600,
            background: 'var(--color-danger-light, #FEE2E2)',
            color: 'var(--color-danger, #DC2626)'
          }}>
            <AlertCircle size={13} />
            <span>Invitation Failed</span>
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: '0.785rem',
            fontWeight: 600,
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)'
          }}>
            <Clock size={13} />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Gym Management & Network
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', margin: 0 }}>
            Create new gyms, provision Gym Owner accounts with Brevo invitations, and configure operational settings
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
          >
            <PlusCircle size={18} />
            <span>Create New Gym</span>
          </Button>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 24,
        paddingBottom: 2
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'list' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            color: activeTab === 'list' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'list' ? 700 : 500,
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <List size={18} />
          <span>Gym Network & Owners ({gyms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'editor' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            color: activeTab === 'editor' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'editor' ? 700 : 500,
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <Edit3 size={18} />
          <span>Gym Profile Editor</span>
        </button>
      </div>

      {/* TAB 1: GYM NETWORK & OWNERS LIST */}
      {activeTab === 'list' && (
        <div>
          {isLoadingGyms ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ height: 60, background: 'var(--bg-surface)', borderRadius: 12 }} />
              <div style={{ height: 60, background: 'var(--bg-surface)', borderRadius: 12 }} />
              <div style={{ height: 60, background: 'var(--bg-surface)', borderRadius: 12 }} />
            </div>
          ) : gyms.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 16,
              padding: 48,
              textAlign: 'center'
            }}>
              <Building2 size={48} color="var(--brand-primary)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                No Gyms Created Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 20px', fontSize: '0.9rem' }}>
                Start by creating your first gym. An owner account will be created automatically and an invitation email with login credentials will be dispatched via Brevo.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusCircle size={16} style={{ marginRight: 6 }} />
                <span>Create First Gym</span>
              </Button>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{
                      background: 'var(--bg-surface-elevated)',
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      <th style={{ padding: '14px 20px' }}>Gym & Location</th>
                      <th style={{ padding: '14px 20px' }}>Dedicated Portal URL</th>
                      <th style={{ padding: '14px 20px' }}>Owner Details</th>
                      <th style={{ padding: '14px 20px' }}>Account Status</th>
                      <th style={{ padding: '14px 20px' }}>Invitation Status</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gyms.map((gym) => {
                      const isSelected = gym.id === selectedGymId;
                      const isResending = resendingGymId === gym.id;
                      const ownerEmail = gym.owner_email || gym.email;
                      const ownerName = gym.owner_full_name || gym.owner_name || gym.owner || 'Gym Owner';
                      const gymSlug = gym.slug || (gym.name ? gym.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : gym.id);

                      return (
                        <tr
                          key={gym.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          {/* Gym Column */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {gym.logo_url ? (
                                <img
                                  src={gym.logo_url}
                                  alt={gym.name}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    objectFit: 'cover',
                                    border: '1px solid var(--border-subtle)',
                                    background: '#FFFFFF',
                                    flexShrink: 0
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  background: 'var(--brand-primary-light, #FFF7ED)',
                                  color: 'var(--brand-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  border: '1px solid rgba(255, 107, 0, 0.2)'
                                }}>
                                  <Building2 size={20} />
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                  {gym.name}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <MapPin size={12} />
                                  <span>{[gym.city, gym.state].filter(Boolean).join(', ') || 'No location set'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Dedicated Gym URL Column */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <a
                                href={`/gym/${gymSlug}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Open Dedicated Gym Portal"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontFamily: 'monospace',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: 'var(--brand-primary)',
                                  textDecoration: 'none',
                                  background: 'var(--brand-primary-soft)',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--brand-primary-soft-border)'
                                }}
                              >
                                <span>/gym/{gymSlug}</span>
                                <ExternalLink size={12} />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  const fullUrl = `${window.location.origin}/gym/${gymSlug}`;
                                  navigator.clipboard.writeText(fullUrl);
                                  showToast('Dedicated gym URL copied to clipboard!', 'success');
                                }}
                                title="Copy Dedicated Gym URL"
                                style={{
                                  background: 'var(--bg-surface-elevated)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  padding: '5px 7px',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </td>

                          {/* Owner Details Column */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {ownerName}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Mail size={12} />
                              <span>{ownerEmail}</span>
                            </div>
                            {gym.phone && (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.785rem', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Phone size={12} />
                                <span>{gym.phone}</span>
                              </div>
                            )}
                          </td>

                          {/* Account Status Column */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            <Badge status={gym.status || 'active'} />
                          </td>

                          {/* Invitation Status Column */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            {renderInvitationBadge(gym.displayInvitationStatus || gym.invitation_status)}
                          </td>

                          {/* Actions Column */}
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedGymId(gym.id);
                                  setActiveTab('editor');
                                }}
                                style={{ fontSize: '0.825rem', padding: '6px 12px' }}
                              >
                                Edit Profile
                              </Button>

                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={isResending}
                                onClick={() => handleResendInvitation(gym.id, ownerEmail)}
                                title="Regenerates temporary credentials and resends the Brevo invitation email"
                                style={{
                                  fontSize: '0.825rem',
                                  padding: '6px 12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                {isResending ? (
                                  <>
                                    <RefreshCw size={13} className="animate-spin" />
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send size={13} />
                                    <span>Resend Invite</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GYM PROFILE EDITOR */}
      {activeTab === 'editor' && (
        <div>
          {isLoadingProfile ? (
            <div style={{ height: 400, background: 'var(--bg-surface)', borderRadius: 16 }} />
          ) : profileError ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              maxWidth: 540,
              margin: '32px auto'
            }}>
              <AlertCircle size={44} color="var(--color-danger)" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                Failed to Load Gym Configuration
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.9rem' }}>
                {profileError}
              </p>
              <Button onClick={() => fetchGymProfile(selectedGymId)}>Retry</Button>
            </div>
          ) : (
            <div>
              {/* Gym Selector Bar */}
              {gyms.length > 1 && (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: '12px 18px',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Building2 size={18} color="var(--brand-primary)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Currently Editing:
                    </span>
                  </div>
                  <select
                    value={selectedGymId || ''}
                    onChange={(e) => setSelectedGymId(e.target.value)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      padding: '8px 14px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {gyms.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.city || 'Primary'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {formData.name || 'Edit Gym Profile'}
                  </h2>
                  {hasUnsavedChanges && (
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--brand-primary)',
                      background: 'var(--brand-primary-light, #FFF7ED)',
                      padding: '4px 10px',
                      borderRadius: 20,
                      border: '1px solid var(--brand-primary)'
                    }}>
                      Unsaved Changes
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleResetEdit}
                    disabled={!hasUnsavedChanges || isSaving}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <RotateCcw size={15} />
                    <span>Reset</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleOpenConfirm}
                    disabled={isSaving}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Save size={15} />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </Button>
                </div>
              </div>

              {/* Main Settings Form */}
              <form onSubmit={handleOpenConfirm}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 24 }}>
                  {/* Section 1: General & Branding */}
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 16,
                    padding: 24
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'var(--brand-primary-light, #FFF7ED)',
                        color: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          Gym Identity & Branding
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Public name, logo, and operational status
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <Input
                          label="Gym Name *"
                          name="name"
                          value={formData.name}
                          onChange={(e) => handleEditChange('name', e.target.value)}
                          placeholder="e.g. FiftyFifty Downtown Fitness"
                          required
                        />
                        {formErrors.name && (
                          <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                            {formErrors.name}
                          </span>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Owner / Managing Director Name"
                          name="owner_name"
                          value={formData.owner_name}
                          onChange={(e) => handleEditChange('owner_name', e.target.value)}
                          placeholder="e.g. Om Kolekar"
                        />
                      </div>

                      <div>
                        <LogoUploadField
                          label="Gym Logo"
                          value={formData.logo_url}
                          onChange={(url) => handleEditChange('logo_url', url)}
                          disabled={isSaving}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                          Operational Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => handleEditChange('status', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.95rem'
                          }}
                        >
                          <option value="active">Active (Full Operation)</option>
                          <option value="maintenance">Maintenance Mode</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                          Gym Description / About
                        </label>
                        <textarea
                          rows={3}
                          value={formData.description}
                          onChange={(e) => handleEditChange('description', e.target.value)}
                          placeholder="Brief description of the facility and features..."
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.95rem',
                            resize: 'vertical',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact & Operating Hours */}
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 16,
                    padding: 24
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'var(--brand-primary-light, #FFF7ED)',
                        color: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          Contact, Location & Hours
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Official address and member operating hours
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <Input
                            label="Contact Email *"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleEditChange('email', e.target.value)}
                            placeholder="gym@fiftyfifty.com"
                            required
                          />
                          {formErrors.email && (
                            <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                              {formErrors.email}
                            </span>
                          )}
                        </div>

                        <div>
                          <Input
                            label="Primary Phone *"
                            name="phone"
                            value={formData.phone}
                            onChange={(e) => handleEditChange('phone', e.target.value)}
                            placeholder="+91 98765 00001"
                            required
                          />
                          {formErrors.phone && (
                            <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                              {formErrors.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <Input
                          label="Operating Hours *"
                          name="opening_hours"
                          value={formData.opening_hours}
                          onChange={(e) => handleEditChange('opening_hours', e.target.value)}
                          placeholder="06:00 AM - 10:00 PM"
                          required
                        />
                      </div>

                      <div>
                        <Input
                          label="Street Address"
                          name="address"
                          value={formData.address}
                          onChange={(e) => handleEditChange('address', e.target.value)}
                          placeholder="101 Fitness Boulevard"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 12 }}>
                        <Input
                          label="City"
                          name="city"
                          value={formData.city}
                          onChange={(e) => handleEditChange('city', e.target.value)}
                          placeholder="Mumbai"
                        />
                        <Input
                          label="State"
                          name="state"
                          value={formData.state}
                          onChange={(e) => handleEditChange('state', e.target.value)}
                          placeholder="Maharashtra"
                        />
                        <Input
                          label="Postal Code"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={(e) => handleEditChange('postal_code', e.target.value)}
                          placeholder="400001"
                        />
                      </div>

                      <div style={{
                        background: 'var(--bg-surface-elevated)',
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: '1px solid var(--border-subtle)',
                        marginTop: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Shield size={16} color="var(--brand-primary)" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Supabase PostgreSQL Multi-Gym Storage
                          </span>
                        </div>
                        <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: 0 }}>
                          Changes to this form directly update the selected gym record in Supabase.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Bottom Action Bar */}
                <div style={{
                  marginTop: 24,
                  padding: '16px 24px',
                  borderRadius: 16,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {hasUnsavedChanges ? (
                      <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
                        ● You have unsaved changes in this form.
                      </span>
                    ) : (
                      <span>All changes are synchronized with Supabase.</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleResetEdit}
                      disabled={!hasUnsavedChanges || isSaving}
                    >
                      Discard Changes
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      style={{ minWidth: 140 }}
                    >
                      {isSaving ? 'Saving...' : 'Save Gym Profile'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW GYM MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isCreating) setIsCreateModalOpen(false);
        }}
        title="Create New Gym & Invite Owner"
      >
        <form onSubmit={handleCreateGymSubmit} style={{ padding: '4px 0' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            Register a new gym branch on FiftyFifty Gym. An owner account will be created automatically and an invitation email containing login credentials will be dispatched via <strong>Brevo</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Required Group */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 16
            }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Required Gym & Owner Info
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Input
                    label="Gym Name"
                    name="create_name"
                    value={createForm.name}
                    onChange={(e) => handleCreateChange('name', e.target.value)}
                    placeholder="e.g. FiftyFifty Westend Arena"
                    required
                  />
                  {createErrors.name && (
                    <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: -10, marginBottom: 8, display: 'block' }}>
                      {createErrors.name}
                    </span>
                  )}
                </div>

                <div>
                  <Input
                    label="Dedicated Gym Portal URL Slug"
                    name="create_slug"
                    value={createForm.slug || ''}
                    onChange={(e) => handleCreateChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="e.g. westend-arena"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginTop: -6, marginBottom: 8, fontFamily: 'monospace' }}>
                    Portal Preview: {window.location.origin}/gym/{createForm.slug || 'your-gym-slug'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <Input
                      label="Owner Full Name"
                      name="create_owner_name"
                      value={createForm.owner_name}
                      onChange={(e) => handleCreateChange('owner_name', e.target.value)}
                      placeholder="e.g. Sameer Varma"
                      required
                    />
                    {createErrors.owner_name && (
                      <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: -10, marginBottom: 8, display: 'block' }}>
                        {createErrors.owner_name}
                      </span>
                    )}
                  </div>

                  <div>
                    <Input
                      label="Owner Phone Number"
                      name="create_phone"
                      value={createForm.phone}
                      onChange={(e) => handleCreateChange('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      required
                    />
                    {createErrors.phone && (
                      <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: -10, marginBottom: 8, display: 'block' }}>
                        {createErrors.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Input
                    label="Owner Email Address (Brevo Invitation Recipient)"
                    name="create_email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => handleCreateChange('email', e.target.value)}
                    placeholder="owner@domain.com"
                    required
                  />
                  {createErrors.email && (
                    <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: -10, marginBottom: 8, display: 'block' }}>
                      {createErrors.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Location & Hours Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <Input
                  label="Gym Street Address"
                  name="create_address"
                  value={createForm.address}
                  onChange={(e) => handleCreateChange('address', e.target.value)}
                  placeholder="Plot 42, Sector 15"
                />
                <Input
                  label="Operating Hours"
                  name="create_hours"
                  value={createForm.opening_hours}
                  onChange={(e) => handleCreateChange('opening_hours', e.target.value)}
                  placeholder="06:00 AM - 10:00 PM"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Input
                  label="City"
                  name="create_city"
                  value={createForm.city}
                  onChange={(e) => handleCreateChange('city', e.target.value)}
                  placeholder="Pune"
                />
                <Input
                  label="State"
                  name="create_state"
                  value={createForm.state}
                  onChange={(e) => handleCreateChange('state', e.target.value)}
                  placeholder="Maharashtra"
                />
                <Input
                  label="Postal Code"
                  name="create_postal_code"
                  value={createForm.postal_code}
                  onChange={(e) => handleCreateChange('postal_code', e.target.value)}
                  placeholder="411001"
                />
              </div>

              <LogoUploadField
                label="Gym Logo (Optional)"
                value={createForm.logo_url}
                onChange={(url) => handleCreateChange('logo_url', url)}
                disabled={isCreating}
              />

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Gym Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => handleCreateChange('description', e.target.value)}
                  placeholder="Brief description of the gym..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {isCreating ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Creating & Sending via Brevo...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Create Gym & Send Invitation</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Edit Save */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Gym Profile Update"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem', marginBottom: 14 }}>
            Are you sure you want to save these updates for <strong>{formData.name}</strong> to the Supabase database?
          </p>

          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            marginBottom: 20,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            <div>• Gym Name: <strong>{formData.name}</strong></div>
            <div>• Primary Email: <strong>{formData.email}</strong></div>
            <div>• Hours: <strong>{formData.opening_hours}</strong></div>
            <div>• Status: <Badge status={formData.status} /></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfirmed} disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Yes, Save to Supabase'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GymManagementScreen;
