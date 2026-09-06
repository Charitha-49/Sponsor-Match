import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { creatorApi } from '../services/api';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MapPin,
  TrendingUp,
  Users,
  DollarSign,
  Camera,
  Globe,
  ArrowRight,
  Check,
  Loader2,
  ShieldCheck,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  ExternalLink,
  Layers,
  Award,
  ChevronRight
} from 'lucide-react';

const CATEGORIES = [
  'Fashion',
  'Beauty',
  'Fitness',
  'Technology',
  'Gaming',
  'Travel',
  'Food',
  'Lifestyle',
  'Education',
  'Entertainment'
];

const PLATFORMS = [
  { id: 'Instagram', name: 'Instagram', icon: Instagram, color: '#E1306C' },
  { id: 'YouTube', name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'TikTok', name: 'TikTok', icon: Globe, color: '#00F2FE' },
  { id: 'LinkedIn', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'Twitter/X', name: 'Twitter / X', icon: Twitter, color: '#1DA1F2' }
];

export default function CreatorProfilePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [imgError, setImgError] = useState(false);

  const [formData, setFormData] = useState({
    bio: '',
    category: '',
    platform: '',
    followers: '',
    engagementRate: '',
    location: '',
    priceMin: '',
    priceMax: '',
    profileImage: ''
  });

  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Fetch creator profile on mount
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      setLoading(true);
      setServerError('');
      try {
        const res = await creatorApi.getProfile();
        if (isMounted && res.data) {
          const p = res.data;
          setFormData({
            bio: p.bio || '',
            category: p.category || '',
            platform: p.platform || '',
            followers: p.followers != null ? String(p.followers) : '',
            engagementRate: p.engagementRate != null ? String(p.engagementRate) : '',
            location: p.location || '',
            priceMin: p.priceMin != null ? String(p.priceMin) : '',
            priceMax: p.priceMax != null ? String(p.priceMax) : '',
            profileImage: p.profileImage || ''
          });
          setIsEdit(true);
        }
      } catch (err) {
        if (isMounted) {
          // A 404 is the expected response when no profile has been created yet
          if (err.response?.status === 404) {
            setIsEdit(false);
          } else {
            setServerError(err.response?.data?.message || 'Failed to load profile. Please check your connection.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Validation rules
  const errors = useMemo(() => {
    const errs = {};

    if (!formData.bio || !formData.bio.trim()) {
      errs.bio = 'Bio is required to introduce your style to brands.';
    } else if (formData.bio.trim().length < 15) {
      errs.bio = 'Bio should be at least 15 characters to provide meaningful context.';
    }

    if (!formData.category) {
      errs.category = 'Please select a content category.';
    }

    if (!formData.platform) {
      errs.platform = 'Please select your primary social platform.';
    }

    if (formData.followers === '' || formData.followers === null || formData.followers === undefined) {
      errs.followers = 'Follower count is required.';
    } else {
      const followersNum = Number(formData.followers);
      if (isNaN(followersNum) || followersNum < 0) {
        errs.followers = 'Follower count cannot be negative.';
      }
    }

    if (formData.engagementRate === '' || formData.engagementRate === null || formData.engagementRate === undefined) {
      errs.engagementRate = 'Engagement rate is required.';
    } else {
      const engNum = Number(formData.engagementRate);
      if (isNaN(engNum) || engNum < 0) {
        errs.engagementRate = 'Engagement rate cannot be negative.';
      } else if (engNum > 100) {
        errs.engagementRate = 'Engagement rate cannot exceed 100%.';
      }
    }

    if (!formData.location || !formData.location.trim()) {
      errs.location = 'Location is required for geographic matching.';
    }

    const minNum = Number(formData.priceMin);
    const maxNum = Number(formData.priceMax);

    if (formData.priceMin === '' || formData.priceMin === null || formData.priceMin === undefined) {
      errs.priceMin = 'Minimum price is required.';
    } else if (isNaN(minNum) || minNum < 0) {
      errs.priceMin = 'Minimum price cannot be negative.';
    }

    if (formData.priceMax === '' || formData.priceMax === null || formData.priceMax === undefined) {
      errs.priceMax = 'Maximum price is required.';
    } else if (isNaN(maxNum) || maxNum < 0) {
      errs.priceMax = 'Maximum price cannot be negative.';
    } else if (!isNaN(minNum) && minNum >= 0 && maxNum < minNum) {
      errs.priceMax = 'Maximum price cannot be lower than minimum price.';
    }

    if (formData.profileImage && formData.profileImage.trim()) {
      const url = formData.profileImage.trim();
      if (!/^https?:\/\/.+/i.test(url)) {
        errs.profileImage = 'Profile image URL must start with http:// or https://';
      }
    }

    return errs;
  }, [formData]);

  const isValid = Object.keys(errors).length === 0;

  // Completeness checklist tracking
  const completenessItems = useMemo(() => {
    return [
      { id: 'bio', label: 'Add a creator bio', done: !!formData.bio?.trim() && formData.bio.trim().length >= 15 },
      { id: 'category', label: 'Select content category', done: !!formData.category },
      { id: 'platform', label: 'Select primary platform', done: !!formData.platform },
      { id: 'followers', label: 'Enter follower count', done: formData.followers !== '' && Number(formData.followers) >= 0 },
      { id: 'engagementRate', label: 'Enter engagement rate', done: formData.engagementRate !== '' && Number(formData.engagementRate) >= 0 && Number(formData.engagementRate) <= 100 },
      { id: 'location', label: 'Add your location', done: !!formData.location?.trim() },
      {
        id: 'pricing',
        label: 'Set collaboration pricing',
        done:
          formData.priceMin !== '' &&
          formData.priceMax !== '' &&
          Number(formData.priceMin) >= 0 &&
          Number(formData.priceMax) >= Number(formData.priceMin)
      },
      { id: 'profileImage', label: 'Add profile image URL', done: !!formData.profileImage?.trim() && /^https?:\/\/.+/i.test(formData.profileImage.trim()) }
    ];
  }, [formData]);

  const completedCount = completenessItems.filter(item => item.done).length;
  const completenessPercentage = Math.round((completedCount / completenessItems.length) * 100);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'profileImage') {
      setImgError(false);
    }
  };

  const handleBlur = field => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const scrollToField = id => {
    const el = document.getElementById(`field-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus?.();
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    setSuccessToast('');

    if (!isValid) {
      // Find first error and scroll to it
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        scrollToField(firstErrorField);
      }
      return;
    }

    setSaving(true);

    const payload = {
      bio: formData.bio.trim(),
      category: formData.category.trim(),
      platform: formData.platform.trim(),
      followers: Math.round(Number(formData.followers)),
      engagementRate: Number(formData.engagementRate),
      location: formData.location.trim(),
      priceMin: Number(formData.priceMin),
      priceMax: Number(formData.priceMax),
      profileImage: formData.profileImage?.trim() || null
    };

    try {
      let res;
      if (isEdit) {
        res = await creatorApi.updateProfile(payload);
      } else {
        res = await creatorApi.createProfile(payload);
      }

      if (res?.data) {
        const saved = res.data;
        setFormData({
          bio: saved.bio || '',
          category: saved.category || '',
          platform: saved.platform || '',
          followers: saved.followers != null ? String(saved.followers) : '',
          engagementRate: saved.engagementRate != null ? String(saved.engagementRate) : '',
          location: saved.location || '',
          priceMin: saved.priceMin != null ? String(saved.priceMin) : '',
          priceMax: saved.priceMax != null ? String(saved.priceMax) : '',
          profileImage: saved.profileImage || ''
        });
        setIsEdit(true);
        setSuccessToast('Profile saved successfully');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save profile. Please verify your inputs and try again.';
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Helper for initials
  const initials = useMemo(() => {
    const name = user?.name || 'Creator';
    return name
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.name]);

  // Find platform icon
  const currentPlatformInfo = useMemo(() => {
    return PLATFORMS.find(p => p.id === formData.platform);
  }, [formData.platform]);

  const PlatformIcon = currentPlatformInfo?.icon || Globe;

  if (loading) {
    return (
      <div className="creator-profile-page">
        <div className="profile-skeleton-header">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-sub" />
        </div>
        <div className="creator-profile-grid">
          <div className="card profile-preview-skeleton">
            <div className="skeleton-avatar" />
            <div className="skeleton-line skeleton-name" />
            <div className="skeleton-line skeleton-bio" />
            <div className="skeleton-stats-grid">
              <div className="skeleton-stat" />
              <div className="skeleton-stat" />
            </div>
          </div>
          <div className="card profile-form-skeleton">
            <div className="skeleton-form-group" />
            <div className="skeleton-form-group" />
            <div className="skeleton-form-group" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="creator-profile-page">
      {/* Header section */}
      <header className="profile-header">
        <div className="profile-header-content">
          <span className="eyebrow">
            <Sparkles size={14} className="eyebrow-sparkle" />
            Creator Studio &middot; Smart Match Engine
          </span>
          <h1>{isEdit ? 'Edit your creator profile' : 'Build your creator profile'}</h1>
          <p className="profile-subtitle">Tell brands what makes your audience and content a great fit.</p>
        </div>

        {/* Global toast / feedback banners */}
        {successToast && (
          <div className="profile-alert success-alert" role="status">
            <div className="alert-content">
              <CheckCircle2 size={20} className="alert-icon" />
              <div>
                <strong>{successToast}</strong>
                <p>Your profile is ready to be discovered by brands.</p>
              </div>
            </div>
            <div className="alert-actions">
              <Link to="/creator/dashboard" className="button ghost small-btn">
                View Dashboard
              </Link>
              <button
                type="button"
                className="text-button dismiss-btn"
                onClick={() => setSuccessToast('')}
                aria-label="Dismiss notification"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {serverError && (
          <div className="profile-alert error-alert" role="alert">
            <div className="alert-content">
              <AlertCircle size={20} className="alert-icon" />
              <div>
                <strong>Unable to save profile</strong>
                <p>{serverError}</p>
              </div>
            </div>
            <button
              type="button"
              className="text-button dismiss-btn"
              onClick={() => setServerError('')}
              aria-label="Dismiss alert"
            >
              &times;
            </button>
          </div>
        )}
      </header>

      {/* Main two-column layout */}
      <div className="creator-profile-grid">
        {/* LEFT COLUMN: Live Profile Preview Card */}
        <aside className="profile-preview-column">
          <div className="card profile-preview-card">
            <div className="preview-card-banner">
              <span className="preview-live-badge">
                <span className="live-dot" /> Live Preview
              </span>
              <span className="preview-match-badge">
                <ShieldCheck size={13} /> Smart Match Ready
              </span>
            </div>

            <div className="preview-card-body">
              {/* Creator Avatar */}
              <div className="preview-avatar-wrapper">
                {formData.profileImage && !imgError ? (
                  <img
                    src={formData.profileImage}
                    alt={user?.name || 'Creator profile'}
                    className="preview-avatar-image"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="preview-avatar-fallback" aria-hidden="true">
                    <span>{initials}</span>
                  </div>
                )}
                <div className="avatar-verified-badge" title="Verified Creator Account">
                  <Award size={14} />
                </div>
              </div>

              {/* Creator Name and Primary Badges */}
              <div className="preview-identity">
                <h2 className="preview-name">{user?.name || 'Your Creator Name'}</h2>
                <div className="preview-badges">
                  {formData.category ? (
                    <span className="preview-badge category-badge">
                      <Layers size={12} /> {formData.category}
                    </span>
                  ) : (
                    <span className="preview-badge muted-badge">Category not set</span>
                  )}

                  {formData.platform ? (
                    <span className="preview-badge platform-badge">
                      <PlatformIcon size={12} /> {formData.platform}
                    </span>
                  ) : (
                    <span className="preview-badge muted-badge">Platform not set</span>
                  )}
                </div>

                {formData.location ? (
                  <p className="preview-location">
                    <MapPin size={13} /> {formData.location}
                  </p>
                ) : (
                  <p className="preview-location muted-text">
                    <MapPin size={13} /> Location not specified
                  </p>
                )}
              </div>

              {/* Bio Preview */}
              <div className="preview-bio-section">
                <p className="preview-bio-text">
                  {formData.bio?.trim() || (
                    <span className="bio-placeholder">
                      Tell brands about your content, audience, and style. Your bio will appear here to prospective sponsors...
                    </span>
                  )}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="preview-stats-grid">
                <div className="preview-stat-card">
                  <div className="stat-card-label">
                    <Users size={14} /> Followers
                  </div>
                  <b className="stat-card-value">
                    {formData.followers !== '' && !isNaN(Number(formData.followers))
                      ? Number(formData.followers).toLocaleString()
                      : '--'}
                  </b>
                </div>

                <div className="preview-stat-card">
                  <div className="stat-card-label">
                    <TrendingUp size={14} /> Engagement
                  </div>
                  <b className="stat-card-value">
                    {formData.engagementRate !== '' && !isNaN(Number(formData.engagementRate))
                      ? `${formData.engagementRate}%`
                      : '--'}
                  </b>
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="preview-pricing-card">
                <div className="pricing-label">
                  <DollarSign size={15} /> Expected Collaboration Fee
                </div>
                <div className="pricing-range">
                  {formData.priceMin !== '' && formData.priceMax !== '' ? (
                    <span>
                      ₹{Number(formData.priceMin).toLocaleString()} &ndash; ₹{Number(formData.priceMax).toLocaleString()}
                    </span>
                  ) : formData.priceMin !== '' ? (
                    <span>From ₹{Number(formData.priceMin).toLocaleString()}</span>
                  ) : (
                    <span className="pricing-placeholder">Pricing not set</span>
                  )}
                </div>
              </div>

              {/* Completeness Section */}
              <div className="preview-completeness-box">
                <div className="completeness-header">
                  <div className="completeness-title">
                    <span>Profile Completeness</span>
                    <b>{completenessPercentage}%</b>
                  </div>
                  <div className="completeness-track" role="progressbar" aria-valuenow={completenessPercentage} aria-valuemin="0" aria-valuemax="100">
                    <div
                      className="completeness-fill"
                      style={{ width: `${completenessPercentage}%` }}
                    />
                  </div>
                </div>

                {completenessPercentage < 100 && (
                  <div className="completeness-checklist">
                    <p className="checklist-heading">Complete your profile:</p>
                    <ul className="checklist-list">
                      {completenessItems
                        .filter(item => !item.done)
                        .slice(0, 3)
                        .map(item => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="checklist-link"
                              onClick={() => scrollToField(item.id)}
                            >
                              <ChevronRight size={13} /> {item.label}
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Profile Editing Form */}
        <section className="profile-form-column">
          <form className="card profile-form-card" onSubmit={handleSubmit} noValidate>
            <div className="form-section-title">
              <h3>Creator Identity & Brand Story</h3>
              <p>Provide the essential information that brands evaluate during Smart Match scoring.</p>
            </div>

            {/* Bio Field */}
            <div className="field-group" id="field-bio">
              <label htmlFor="bio-input" className="input-wrap">
                <div className="label-with-hint">
                  <span>Bio / Creator Story</span>
                  <span className="field-required">* Required</span>
                </div>
                <textarea
                  id="bio-input"
                  name="bio"
                  rows={4}
                  className={touched.bio && errors.bio ? 'has-error' : ''}
                  placeholder="Tell brands about your content, audience, and style..."
                  value={formData.bio}
                  onChange={e => handleFieldChange('bio', e.target.value)}
                  onBlur={() => handleBlur('bio')}
                  aria-invalid={!!(touched.bio && errors.bio)}
                  aria-describedby={touched.bio && errors.bio ? 'bio-error' : undefined}
                />
              </label>
              <div className="field-meta">
                <span className="field-helper">Describe your creative style, content format, and audience demographics.</span>
                <span className="char-count">{formData.bio.length} chars</span>
              </div>
              {(touched.bio || submitted) && errors.bio && (
                <p className="field-error-message" id="bio-error">
                  <AlertCircle size={14} /> {errors.bio}
                </p>
              )}
            </div>

            {/* Category and Platform (2 cols) */}
            <div className="fields-two-col">
              {/* Category */}
              <div className="field-group" id="field-category">
                <label htmlFor="category-select" className="input-wrap">
                  <div className="label-with-hint">
                    <span>Niche Category</span>
                    <span className="field-required">* Required</span>
                  </div>
                  <select
                    id="category-select"
                    name="category"
                    className={touched.category && errors.category ? 'has-error' : ''}
                    value={formData.category}
                    onChange={e => handleFieldChange('category', e.target.value)}
                    onBlur={() => handleBlur('category')}
                    aria-invalid={!!(touched.category && errors.category)}
                    aria-describedby={touched.category && errors.category ? 'category-error' : undefined}
                  >
                    <option value="">Select a category...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="field-helper">Primary vertical used by the Smart Match engine.</span>
                {(touched.category || submitted) && errors.category && (
                  <p className="field-error-message" id="category-error">
                    <AlertCircle size={14} /> {errors.category}
                  </p>
                )}
              </div>

              {/* Platform */}
              <div className="field-group" id="field-platform">
                <label htmlFor="platform-select" className="input-wrap">
                  <div className="label-with-hint">
                    <span>Primary Platform</span>
                    <span className="field-required">* Required</span>
                  </div>
                  <select
                    id="platform-select"
                    name="platform"
                    className={touched.platform && errors.platform ? 'has-error' : ''}
                    value={formData.platform}
                    onChange={e => handleFieldChange('platform', e.target.value)}
                    onBlur={() => handleBlur('platform')}
                    aria-invalid={!!(touched.platform && errors.platform)}
                    aria-describedby={touched.platform && errors.platform ? 'platform-error' : undefined}
                  >
                    <option value="">Select primary platform...</option>
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="field-helper">Where your largest or most engaged audience resides.</span>
                {(touched.platform || submitted) && errors.platform && (
                  <p className="field-error-message" id="platform-error">
                    <AlertCircle size={14} /> {errors.platform}
                  </p>
                )}
              </div>
            </div>

            {/* Followers and Engagement Rate (2 cols) */}
            <div className="fields-two-col">
              {/* Followers */}
              <div className="field-group" id="field-followers">
                <label htmlFor="followers-input" className="input-wrap">
                  <div className="label-with-hint">
                    <span>Followers / Audience</span>
                    <span className="field-required">* Required</span>
                  </div>
                  <div className="input-with-icon">
                    <Users size={16} className="input-adornment" />
                    <input
                      id="followers-input"
                      name="followers"
                      type="number"
                      min="0"
                      step="1"
                      className={touched.followers && errors.followers ? 'has-error' : ''}
                      placeholder="e.g. 25000"
                      value={formData.followers}
                      onChange={e => handleFieldChange('followers', e.target.value)}
                      onBlur={() => handleBlur('followers')}
                      aria-invalid={!!(touched.followers && errors.followers)}
                      aria-describedby={touched.followers && errors.followers ? 'followers-error' : undefined}
                    />
                  </div>
                </label>
                <span className="field-helper">Total subscriber or follower count.</span>
                {(touched.followers || submitted) && errors.followers && (
                  <p className="field-error-message" id="followers-error">
                    <AlertCircle size={14} /> {errors.followers}
                  </p>
                )}
              </div>

              {/* Engagement Rate */}
              <div className="field-group" id="field-engagementRate">
                <label htmlFor="engagement-input" className="input-wrap">
                  <div className="label-with-hint">
                    <span>Engagement Rate (%)</span>
                    <span className="field-required">* Required</span>
                  </div>
                  <div className="input-with-icon">
                    <TrendingUp size={16} className="input-adornment" />
                    <input
                      id="engagement-input"
                      name="engagementRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className={touched.engagementRate && errors.engagementRate ? 'has-error' : ''}
                      placeholder="e.g. 4.8"
                      value={formData.engagementRate}
                      onChange={e => handleFieldChange('engagementRate', e.target.value)}
                      onBlur={() => handleBlur('engagementRate')}
                      aria-invalid={!!(touched.engagementRate && errors.engagementRate)}
                      aria-describedby={touched.engagementRate && errors.engagementRate ? 'engagement-error' : undefined}
                    />
                  </div>
                </label>
                <span className="field-helper">Percentage (0–100%). E.g., enter 4.8 for 4.8%.</span>
                {(touched.engagementRate || submitted) && errors.engagementRate && (
                  <p className="field-error-message" id="engagement-error">
                    <AlertCircle size={14} /> {errors.engagementRate}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="field-group" id="field-location">
              <label htmlFor="location-input" className="input-wrap">
                <div className="label-with-hint">
                  <span>Location</span>
                  <span className="field-required">* Required</span>
                </div>
                <div className="input-with-icon">
                  <MapPin size={16} className="input-adornment" />
                  <input
                    id="location-input"
                    name="location"
                    type="text"
                    className={touched.location && errors.location ? 'has-error' : ''}
                    placeholder="e.g. Hyderabad, India"
                    value={formData.location}
                    onChange={e => handleFieldChange('location', e.target.value)}
                    onBlur={() => handleBlur('location')}
                    aria-invalid={!!(touched.location && errors.location)}
                    aria-describedby={touched.location && errors.location ? 'location-error' : undefined}
                  />
                </div>
              </label>
              <span className="field-helper">City, Country or Metro area for target location matching.</span>
              {(touched.location || submitted) && errors.location && (
                <p className="field-error-message" id="location-error">
                  <AlertCircle size={14} /> {errors.location}
                </p>
              )}
            </div>

            {/* Pricing Section (2 cols) */}
            <div className="fields-two-col" id="field-pricing">
              {/* Minimum Price */}
              <div className="field-group" id="field-priceMin">
                <label htmlFor="priceMin-input" className="input-wrap">
                  <div className="label-with-hint">
                    <span>Minimum Price (₹)</span>
                    <span className="field-required">* Required</span>
                  </div>
                  <div className="input-with-icon">
                    <DollarSign size={16} className="input-adornment" />
                    <input
                      id="priceMin-input"
                      name="priceMin"
                      type="number"
                      min="0"
                      step="500"
                      className={touched.priceMin && errors.priceMin ? 'has-error' : ''}
                      placeholder="e.g. 5000"
                      value={formData.priceMin}
                      onChange={e => handleFieldChange('priceMin', e.target.value)}
                      onBlur={() => handleBlur('priceMin')}
                      aria-invalid={!!(touched.priceMin && errors.priceMin)}
                      aria-describedby={touched.priceMin && errors.priceMin ? 'priceMin-error' : undefined}
                    />
                  </div>
                </label>
                <span className="field-helper">Starting rate for single deliverables.</span>
                {(touched.priceMin || submitted) && errors.priceMin && (
                  <p className="field-error-message" id="priceMin-error">
                    <AlertCircle size={14} /> {errors.priceMin}
                  </p>
                )}
              </div>

              {/* Maximum Price */}
              <div className="field-group" id="field-priceMax">
                <label htmlFor="priceMax-input" className="input-wrap">
                  <div className="label-with-hint">
                    <span>Maximum Price (₹)</span>
                    <span className="field-required">* Required</span>
                  </div>
                  <div className="input-with-icon">
                    <DollarSign size={16} className="input-adornment" />
                    <input
                      id="priceMax-input"
                      name="priceMax"
                      type="number"
                      min="0"
                      step="500"
                      className={touched.priceMax && errors.priceMax ? 'has-error' : ''}
                      placeholder="e.g. 25000"
                      value={formData.priceMax}
                      onChange={e => handleFieldChange('priceMax', e.target.value)}
                      onBlur={() => handleBlur('priceMax')}
                      aria-invalid={!!(touched.priceMax && errors.priceMax)}
                      aria-describedby={touched.priceMax && errors.priceMax ? 'priceMax-error' : undefined}
                    />
                  </div>
                </label>
                <span className="field-helper">Upper limit for comprehensive package deals.</span>
                {(touched.priceMax || submitted) && errors.priceMax && (
                  <p className="field-error-message" id="priceMax-error">
                    <AlertCircle size={14} /> {errors.priceMax}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Image URL */}
            <div className="field-group" id="field-profileImage">
              <label htmlFor="profileImage-input" className="input-wrap">
                <div className="label-with-hint">
                  <span>Profile Image URL</span>
                  <span className="field-optional">Optional</span>
                </div>
                <div className="input-with-icon">
                  <Camera size={16} className="input-adornment" />
                  <input
                    id="profileImage-input"
                    name="profileImage"
                    type="url"
                    className={touched.profileImage && errors.profileImage ? 'has-error' : ''}
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.profileImage}
                    onChange={e => handleFieldChange('profileImage', e.target.value)}
                    onBlur={() => handleBlur('profileImage')}
                    aria-invalid={!!(touched.profileImage && errors.profileImage)}
                    aria-describedby={touched.profileImage && errors.profileImage ? 'profileImage-error' : undefined}
                  />
                </div>
              </label>
              <span className="field-helper">Provide a publicly accessible image URL. Updates the preview card immediately.</span>
              {(touched.profileImage || submitted) && errors.profileImage && (
                <p className="field-error-message" id="profileImage-error">
                  <AlertCircle size={14} /> {errors.profileImage}
                </p>
              )}
            </div>

            {/* Smart Match Notice */}
            <div className="match-engine-notice">
              <Sparkles size={18} className="notice-icon" />
              <div>
                <strong>Smart Sponsor Match Integration</strong>
                <p>
                  Brand campaigns automatically match with your profile based on category alignment, platform relevance,
                  audience volume, engagement metrics, and budget suitability.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions-bar">
              <button
                type="submit"
                className="button primary-submit-btn"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="button-spinner" /> Saving profile...
                  </>
                ) : isEdit ? (
                  <>
                    <Check size={17} /> Save Changes
                  </>
                ) : (
                  <>
                    <Sparkles size={17} /> Create Profile
                  </>
                )}
              </button>

              {isEdit && (
                <Link to="/creator/dashboard" className="button ghost">
                  Return to Dashboard
                </Link>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
