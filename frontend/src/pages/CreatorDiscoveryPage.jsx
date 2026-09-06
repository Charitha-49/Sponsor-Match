import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  Users,
  TrendingUp,
  MapPin,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Send,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Video,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { creatorApi, campaignApi, shortlistApi, collaborationApi, messageApi } from '../services/api';

const CATEGORIES = [
  'All',
  'Technology',
  'Beauty',
  'Fashion',
  'Gaming',
  'Fitness',
  'Lifestyle',
  'Travel',
  'Food & Cooking',
  'Business & Finance',
  'Entertainment',
  'Education'
];

const PLATFORMS = ['All', 'Instagram', 'YouTube', 'TikTok', 'X/Twitter', 'LinkedIn', 'Twitch'];

export default function CreatorDiscoveryPage() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [shortlistedMap, setShortlistedMap] = useState({}); // { [creatorId]: shortlistId }
  const [shortlistBusy, setShortlistBusy] = useState({});

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [locationFilter, setLocationFilter] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [maxFollowers, setMaxFollowers] = useState('');
  const [minEngagement, setMinEngagement] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Active modal state
  const [activeProfile, setActiveProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'collab' | 'inquiry'

  // Modal forms state
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [collabMessage, setCollabMessage] = useState('');
  const [sendingCollab, setSendingCollab] = useState(false);
  const [collabSuccess, setCollabSuccess] = useState('');
  const [collabError, setCollabError] = useState('');

  const [inquiryMessage, setInquiryMessage] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState('');
  const [inquiryError, setInquiryError] = useState('');

  // Initial load
  useEffect(() => {
    loadCampaignsAndShortlist();
    fetchCreators();
  }, []);

  const loadCampaignsAndShortlist = async () => {
    try {
      const [campRes, shortRes] = await Promise.all([
        campaignApi.mine().catch(() => ({ data: [] })),
        shortlistApi.list().catch(() => ({ data: [] }))
      ]);
      setCampaigns(campRes.data || []);
      if (campRes.data?.length > 0) {
        setSelectedCampaignId(campRes.data[0].id);
      }
      const map = {};
      (shortRes.data || []).forEach(item => {
        map[item.creatorId] = item.id;
      });
      setShortlistedMap(map);
    } catch (_) {}
  };

  const fetchCreators = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedPlatform && selectedPlatform !== 'All') params.platform = selectedPlatform;
      if (locationFilter.trim()) params.location = locationFilter.trim();
      if (minFollowers) params.minFollowers = Number(minFollowers);
      if (maxFollowers) params.maxFollowers = Number(maxFollowers);
      if (minEngagement) params.minEngagement = Number(minEngagement);
      if (maxBudget) params.maxPrice = Number(maxBudget);

      const res = await creatorApi.search(params);
      setCreators(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load creators. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = e => {
    e?.preventDefault();
    fetchCreators();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedPlatform('All');
    setLocationFilter('');
    setMinFollowers('');
    setMaxFollowers('');
    setMinEngagement('');
    setMaxBudget('');
    setTimeout(() => {
      creatorApi.search({}).then(res => setCreators(res.data || [])).catch(() => {});
    }, 0);
  };

  const activeFilterCount = [
    selectedCategory !== 'All',
    selectedPlatform !== 'All',
    locationFilter.trim() !== '',
    minFollowers !== '',
    maxFollowers !== '',
    minEngagement !== '',
    maxBudget !== ''
  ].filter(Boolean).length;

  const handleToggleShortlist = async (creatorId, e) => {
    e?.stopPropagation();
    if (shortlistBusy[creatorId]) return;

    const existingShortlistId = shortlistedMap[creatorId];
    setShortlistBusy(prev => ({ ...prev, [creatorId]: true }));

    try {
      if (existingShortlistId) {
        await shortlistApi.remove(existingShortlistId);
        setShortlistedMap(prev => {
          const next = { ...prev };
          delete next[creatorId];
          return next;
        });
      } else {
        const campId = selectedCampaignId || (campaigns[0] ? campaigns[0].id : null);
        if (!campId) {
          alert('Please create a campaign first to shortlist creators.');
          return;
        }
        const res = await shortlistApi.add({ campaignId: campId, creatorId });
        setShortlistedMap(prev => ({ ...prev, [creatorId]: res.data.id }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update shortlist.');
    } finally {
      setShortlistBusy(prev => ({ ...prev, [creatorId]: false }));
    }
  };

  const openProfileModal = async (creatorId, defaultTab = 'overview') => {
    if (!creatorId) return;
    setActiveTab(defaultTab);
    setCollabSuccess('');
    setCollabError('');
    setInquirySuccess('');
    setInquiryError('');

    // Pre-populate activeProfile from local list if available so modal opens immediately
    const existing = (creators || []).find(c => (c.creatorId || c.id) === creatorId);
    if (existing) {
      const pData = {
        creatorId: creatorId,
        id: creatorId,
        name: existing.name || 'Creator',
        bio: existing.bio || '',
        category: existing.category || '',
        platform: existing.platform || '',
        followers: existing.followers || 0,
        engagementRate: existing.engagementRate || 0,
        location: existing.location || '',
        priceMin: existing.priceMin || 0,
        priceMax: existing.priceMax || 0,
        profileImage: existing.profileImage || ''
      };
      setActiveProfile(pData);
      setCollabMessage(`Hi ${existing.name}! We love your content and would like to collaborate on our campaign.`);
      setInquiryMessage(`Hi ${existing.name}, I'm interested in collaborating with you. Could you share your current availability?`);
    }

    setProfileLoading(true);
    try {
      const res = await creatorApi.get(creatorId);
      if (res.data) {
        setActiveProfile(prev => ({ ...prev, ...res.data, creatorId: res.data.creatorId || creatorId }));
        setCollabMessage(`Hi ${res.data.name}! We love your content and would like to collaborate on our campaign.`);
        setInquiryMessage(`Hi ${res.data.name}, I'm interested in collaborating with you. Could you share your current availability?`);
      }
    } catch (err) {
      console.warn('API fetch for profile details failed, using card data:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSendCollaboration = async e => {
    e?.preventDefault();
    if (!activeProfile || sendingCollab) return;
    if (!selectedCampaignId) {
      setCollabError('Please select an active campaign for this collaboration.');
      return;
    }
    if (!collabMessage.trim()) {
      setCollabError('Please enter a message for the creator.');
      return;
    }

    setSendingCollab(true);
    setCollabError('');
    setCollabSuccess('');
    try {
      await collaborationApi.send({
        campaignId: Number(selectedCampaignId),
        creatorId: activeProfile.creatorId,
        message: collabMessage.trim()
      });
      setCollabSuccess(`Collaboration proposal sent to ${activeProfile.name}!`);
    } catch (err) {
      setCollabError(err.response?.data?.message || 'Failed to send collaboration request.');
    } finally {
      setSendingCollab(false);
    }
  };

  const handleSendInquiry = async e => {
    e?.preventDefault();
    if (!activeProfile || sendingInquiry) return;
    if (!inquiryMessage.trim()) {
      setInquiryError('Please enter an inquiry message.');
      return;
    }

    setSendingInquiry(true);
    setInquiryError('');
    setInquirySuccess('');
    try {
      await messageApi.initiate({
        creatorId: activeProfile.creatorId,
        campaignId: selectedCampaignId ? Number(selectedCampaignId) : null,
        message: inquiryMessage.trim()
      });
      setInquirySuccess(`Inquiry sent to ${activeProfile.name}! They will receive your message.`);
    } catch (err) {
      setInquiryError(err.response?.data?.message || 'Failed to send inquiry.');
    } finally {
      setSendingInquiry(false);
    }
  };

  const formatFollowers = count => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return count.toLocaleString();
  };

  const formatCurrency = amount => {
    if (amount == null) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const getPlatformIcon = platform => {
    const p = (platform || '').toLowerCase();
    if (p.includes('instagram')) return <Instagram size={14} />;
    if (p.includes('youtube')) return <Youtube size={14} />;
    if (p.includes('twitter') || p.includes('x')) return <Twitter size={14} />;
    if (p.includes('linkedin')) return <Linkedin size={14} />;
    return <Video size={14} />;
  };

  const getInitials = name => {
    return (name || 'Creator')
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="discovery-container">
      {/* Header Banner */}
      <header className="discovery-header">
        <div className="discovery-header-top">
          <div>
            <div className="discovery-eyebrow">
              <span>Manual Creator Discovery &middot; Real Profiles</span>
            </div>
            <h1>Find &amp; Discover Creators</h1>
            <p className="discovery-subtitle">
              Browse, search, and filter authentic creator profiles across Instagram, YouTube, and more. Shortlist talent, send collaboration proposals, or send direct inquiries.
            </p>
          </div>
          {campaigns.length > 0 && (
            <Link to={`/brand/campaigns/${campaigns[0].id}/matches`} className="button ghost ai-switch-btn">
              <Sparkles size={16} /> Try AI Smart Match
            </Link>
          )}
        </div>

        {/* Search Bar & Filter Toggle */}
        <form className="discovery-search-bar" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by creator name, niche, bio keywords, or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            className={`button ghost filter-toggle-btn ${showFilters || activeFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setShowFilters(prev => !prev)}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </button>
          <button type="submit" className="button search-submit-btn">
            Search
          </button>
        </form>

        {/* Category Quick Chips */}
        <div className="category-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(cat);
                setTimeout(() => fetchCreators(), 0);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Expanded Filter Drawer */}
        {showFilters && (
          <div className="discovery-filters-panel card">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value)}
                >
                  {PLATFORMS.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Target Location / City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Bengaluru, India"
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Min Followers</label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={minFollowers}
                  onChange={e => setMinFollowers(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Max Followers</label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={maxFollowers}
                  onChange={e => setMaxFollowers(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Min Engagement Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 3.5"
                  value={minEngagement}
                  onChange={e => setMinEngagement(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Max Budget / Price (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={maxBudget}
                  onChange={e => setMaxBudget(e.target.value)}
                />
              </div>
            </div>

            <div className="filters-actions">
              <button type="button" className="button ghost" onClick={handleResetFilters}>
                Clear All Filters
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  fetchCreators();
                  setShowFilters(false);
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Results Grid */}
      <section className="discovery-results-section">
        <div className="results-meta-bar">
          <h2>
            {loading ? 'Searching creators...' : `${creators.length} Creator${creators.length === 1 ? '' : 's'} Found`}
          </h2>
          {activeFilterCount > 0 && (
            <button className="text-button" onClick={handleResetFilters}>
              Reset {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
            </button>
          )}
        </div>

        {error && (
          <div className="discovery-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="creators-loading-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card creator-skeleton-card">
                <div className="skeleton-avatar" />
                <div className="skeleton-line title" />
                <div className="skeleton-line subtitle" />
                <div className="skeleton-grid" />
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="card discovery-empty-state">
            <Users size={48} className="empty-icon" />
            <h3>No Creators Matched Your Filters</h3>
            <p>Try broadening your search keywords, clearing specific filters, or searching all categories.</p>
            <button className="button" onClick={handleResetFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="creators-cards-grid">
            {creators.map(creator => {
              const isShortlisted = Boolean(shortlistedMap[creator.creatorId]);
              return (
                <div key={creator.creatorId} className="card creator-discovery-card">
                  {/* Card Header with Avatar & Platform */}
                  <div className="card-top-row">
                    <div className="creator-avatar-wrap">
                      {creator.profileImage ? (
                        <img
                          src={creator.profileImage}
                          alt={creator.name}
                          className="creator-avatar-img"
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="creator-avatar-fallback"
                        style={{ display: creator.profileImage ? 'none' : 'flex' }}
                      >
                        {getInitials(creator.name)}
                      </div>
                    </div>
                    <div className="creator-badges-row">
                      <span className="creator-category-badge">{creator.category || 'General'}</span>
                      <span className="creator-platform-pill">
                        {getPlatformIcon(creator.platform)}
                        <span>{creator.platform || 'Social'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Name & Location */}
                  <div className="creator-identity-wrap">
                    <h3 className="creator-card-name">{creator.name}</h3>
                    <div className="creator-location-text">
                      <MapPin size={13} />
                      <span>{creator.location || 'Location Not Specified'}</span>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="creator-card-bio">
                    {creator.bio || 'Professional creator partnering with premium brands for sponsored campaigns and activations.'}
                  </p>

                  {/* Key Stats Bar */}
                  <div className="creator-stats-bar">
                    <div className="stat-col">
                      <span className="stat-label">Followers</span>
                      <span className="stat-val">{formatFollowers(creator.followers)}</span>
                    </div>
                    <div className="stat-col">
                      <span className="stat-label">Engagement</span>
                      <span className="stat-val highlight">{creator.engagementRate || 0}%</span>
                    </div>
                    <div className="stat-col">
                      <span className="stat-label">Fee Range</span>
                      <span className="stat-val">{formatCurrency(creator.priceMin)}–{formatCurrency(creator.priceMax)}</span>
                    </div>
                  </div>

                  {/* Action Buttons - CLEAN DESIGN RESTORED */}
                  <div className="creator-card-actions">
                    <button
                      type="button"
                      className={`shortlist-btn ${isShortlisted ? 'shortlisted' : ''}`}
                      onClick={e => handleToggleShortlist(creator.creatorId, e)}
                      disabled={shortlistBusy[creator.creatorId]}
                      title={isShortlisted ? 'Remove from shortlist' : 'Save to shortlist'}
                    >
                      {isShortlisted ? (
                        <>
                          <BookmarkCheck size={16} /> Shortlisted
                        </>
                      ) : (
                        <>
                          <Bookmark size={16} /> Shortlist
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="button ghost view-profile-btn"
                      onClick={() => openProfileModal(creator.creatorId, 'overview')}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Creator Profile Details Modal - Portaled to document.body */}
      {activeProfile && createPortal(
        <div
          className="modal-backdrop modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(18, 17, 34, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px',
            overflowY: 'auto'
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setActiveProfile(null);
            }
          }}
        >
          <div
            className="modal-card discovery-profile-modal card"
            style={{
              position: 'relative',
              zIndex: 1000000,
              maxWidth: '680px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button className="modal-close-btn" onClick={() => setActiveProfile(null)}>
              <X size={18} />
            </button>

            {/* Profile Header */}
            <div className="profile-modal-header">
              <div className="profile-modal-avatar-wrap">
                {activeProfile.profileImage ? (
                  <img
                    src={activeProfile.profileImage}
                    alt={activeProfile.name}
                    className="profile-modal-avatar-img"
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="profile-modal-avatar-fallback"
                  style={{ display: activeProfile.profileImage ? 'none' : 'flex' }}
                >
                  {getInitials(activeProfile.name)}
                </div>
              </div>

              <div className="profile-modal-info">
                <div className="profile-badges-row">
                  <span className="creator-category-badge">{activeProfile.category}</span>
                  <span className="creator-platform-pill">
                    {getPlatformIcon(activeProfile.platform)}
                    <span>{activeProfile.platform}</span>
                  </span>
                  <span className="profile-verified-badge">
                    <CheckCircle2 size={13} /> Active Portfolio
                  </span>
                </div>
                <h2>{activeProfile.name}</h2>
                <p className="profile-location-sub">
                  <MapPin size={14} /> {activeProfile.location || 'Location Not Specified'}
                </p>
              </div>
            </div>

            {/* Modal Nav Tabs */}
            <div className="modal-tabs-nav">
              <button
                className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Portfolio &amp; Metrics
              </button>
              <button
                className={`tab-item ${activeTab === 'collab' ? 'active' : ''}`}
                onClick={() => setActiveTab('collab')}
              >
                Send Collaboration Proposal
              </button>
              <button
                className={`tab-item ${activeTab === 'inquiry' ? 'active' : ''}`}
                onClick={() => setActiveTab('inquiry')}
              >
                Send Direct Message / Inquiry
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-tab-content">
              {activeTab === 'overview' && (
                <div className="profile-overview-tab">
                  {/* Bio */}
                  <div className="overview-section">
                    <h4>Creator Bio</h4>
                    <p className="bio-paragraph">{activeProfile.bio}</p>
                  </div>

                  {/* Stat Cards */}
                  <div className="overview-stats-grid">
                    <div className="overview-stat-card">
                      <span className="label">Total Followers</span>
                      <span className="val">{formatFollowers(activeProfile.followers)}</span>
                      <span className="sub">{activeProfile.platform} Audience</span>
                    </div>
                    <div className="overview-stat-card">
                      <span className="label">Engagement Rate</span>
                      <span className="val color-accent">{activeProfile.engagementRate}%</span>
                      <span className="sub">Audience Interaction</span>
                    </div>
                    <div className="overview-stat-card">
                      <span className="label">Collaboration Fee</span>
                      <span className="val">{formatCurrency(activeProfile.priceMin)} &ndash; {formatCurrency(activeProfile.priceMax)}</span>
                      <span className="sub">Per Sponsored Deliverable</span>
                    </div>
                  </div>

                  {/* Audience & Deliverables Overview */}
                  <div className="overview-section deliverables-box card">
                    <h4>Audience &amp; Deliverables</h4>
                    <ul className="audience-points-list">
                      <li>Verified account actively accepting commercial brand sponsorships.</li>
                      <li>Geographic audience centered in <strong>{activeProfile.location || 'India'}</strong>.</li>
                      <li>Niche content focus: <strong>{activeProfile.category}</strong>.</li>
                      <li>Standard deliverables include sponsored posts, video integrations, stories, and product reviews.</li>
                    </ul>
                  </div>

                  <div className="modal-bottom-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                      type="button"
                      className={`button ghost ${shortlistedMap[activeProfile.creatorId] ? 'shortlisted' : ''}`}
                      onClick={e => handleToggleShortlist(activeProfile.creatorId, e)}
                    >
                      {shortlistedMap[activeProfile.creatorId] ? (
                        <>
                          <BookmarkCheck size={16} /> Shortlisted
                        </>
                      ) : (
                        <>
                          <Bookmark size={16} /> Save to Shortlist
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={() => setActiveTab('collab')}
                    >
                      <Send size={15} /> Send Request
                    </button>
                    <Link
                      to={`/brand/messages?creatorId=${activeProfile.creatorId}`}
                      className="button ghost"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <MessageSquare size={15} /> Send Message
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'collab' && (
                <form className="profile-collab-tab" onSubmit={handleSendCollaboration}>
                  {collabSuccess && (
                    <div className="discovery-alert success">
                      <CheckCircle2 size={18} />
                      <span>{collabSuccess}</span>
                    </div>
                  )}

                  {collabError && (
                    <div className="discovery-alert error">
                      <AlertCircle size={18} />
                      <span>{collabError}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Select Associated Campaign *</label>
                    {campaigns.length === 0 ? (
                      <div className="no-campaigns-prompt">
                        <p>You don't have any active campaigns created yet.</p>
                        <Link to="/brand/campaigns/new" className="button ghost">
                          Create Campaign First
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={selectedCampaignId}
                        onChange={e => setSelectedCampaignId(e.target.value)}
                        required
                      >
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.category} · {c.platform})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Proposal Message *</label>
                    <textarea
                      rows={5}
                      value={collabMessage}
                      onChange={e => setCollabMessage(e.target.value)}
                      placeholder="Describe your brand, campaign deliverables, timelines, and offer..."
                      required
                    />
                  </div>

                  <div className="modal-bottom-actions">
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => setActiveTab('overview')}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="button"
                      disabled={sendingCollab || campaigns.length === 0}
                    >
                      {sendingCollab ? 'Sending...' : 'Send Collaboration Proposal'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'inquiry' && (
                <form className="profile-inquiry-tab" onSubmit={handleSendInquiry}>
                  {inquirySuccess && (
                    <div className="discovery-alert success">
                      <CheckCircle2 size={18} />
                      <span>{inquirySuccess}</span>
                    </div>
                  )}

                  {inquiryError && (
                    <div className="discovery-alert error">
                      <AlertCircle size={18} />
                      <span>{inquiryError}</span>
                    </div>
                  )}

                  <p className="inquiry-intro-text">
                    Send a direct message or preliminary inquiry to {activeProfile.name}. They will receive your inquiry directly in their Messages inbox.
                  </p>

                  <div className="form-group">
                    <label>Inquiry Message *</label>
                    <textarea
                      rows={5}
                      value={inquiryMessage}
                      onChange={e => setInquiryMessage(e.target.value)}
                      placeholder="Ask about availability, custom rates, or specific creative concepts..."
                      required
                    />
                  </div>

                  <div className="modal-bottom-actions">
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => setActiveTab('overview')}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="button"
                      disabled={sendingInquiry}
                    >
                      {sendingInquiry ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
