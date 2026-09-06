import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Award,
  Users,
  TrendingUp,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Globe,
  Layers,
  Info,
  MessageSquare
} from 'lucide-react';
import { matchApi, creatorApi, collaborationApi, shortlistApi, campaignApi } from '../services/api';

const PLATFORM_ICONS = {
  Instagram: Instagram,
  YouTube: Youtube,
  LinkedIn: Linkedin,
  'Twitter/X': Twitter,
  TikTok: Globe
};

const LOADING_MESSAGES = [
  'Analyzing campaign requirements...',
  'Evaluating creator compatibility with NVIDIA Nemotron AI...',
  'Scoring semantic alignment and content synergy...',
  'Finding your strongest creator matches...'
];

export default function SmartMatchPage() {
  const { id } = useParams();

  const [matches, setMatches] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Shortlist tracking state
  const [shortlistedIds, setShortlistedIds] = useState(new Set());
  const [shortlistBusy, setShortlistBusy] = useState({});

  // Profile modal state
  const [activeProfile, setActiveProfile] = useState(null);
  const [activeMatchData, setActiveMatchData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Request modal state
  const [requestModalCreator, setRequestModalCreator] = useState(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSentIds, setRequestSentIds] = useState(new Set());
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestError, setRequestError] = useState('');

  // Rotating loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [loading]);

  const fetchedCampaignRef = React.useRef(null);
  const matchRequestRef = React.useRef(null);

  // Load campaign and matches
  useEffect(() => {
    let isMounted = true;
    if (fetchedCampaignRef.current !== id) {
      fetchedCampaignRef.current = id;
      setLoading(true);
      setError('');

      // Fetch campaign details
      campaignApi.get(id)
        .then(res => {
          if (isMounted) setCampaign(res.data);
        })
        .catch(() => {});

      // Fetch existing shortlists to mark cards
      shortlistApi.list()
        .then(res => {
          if (isMounted && res.data) {
            const sIds = new Set(res.data.filter(s => String(s.campaignId) === String(id)).map(s => s.creatorId));
            setShortlistedIds(sIds);
          }
        })
        .catch(() => {});

      // Keep one matching request across React StrictMode's development effect replay.
      matchRequestRef.current = matchApi(id);
    }

    matchRequestRef.current
      .then(res => {
        if (isMounted) {
          setMatches(res.data || []);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Unable to retrieve AI matches. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // View creator profile
  const handleViewProfile = async (matchItem, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    console.log('handleViewProfile called', matchItem);
    if (!matchItem) return;
    const cid = matchItem.creatorId || matchItem.id;
    console.log('cid', cid);
    setActiveMatchData(matchItem);
    
    // Set activeProfile immediately with matchItem data so modal opens instantly
    const profileData = {
      creatorId: cid,
      id: cid,
      name: matchItem.name || 'Creator',
      bio: matchItem.bio || '',
      category: matchItem.category || '',
      platform: matchItem.platform || '',
      followers: matchItem.followers || 0,
      engagementRate: matchItem.engagementRate || 0,
      location: matchItem.location || '',
      priceMin: matchItem.priceMin || 0,
      priceMax: matchItem.priceMax || 0,
      profileImage: matchItem.profileImage || ''
    };
    console.log('activeProfile data', profileData);
    setActiveProfile(profileData);
    setLoadingProfile(false);

    // Fetch fresh profile from backend API in background
    if (cid) {
      try {
        const res = await creatorApi.get(cid);
        console.log('res.data', res.data);
        if (res.data) {
          setActiveProfile(prev => ({
            ...prev,
            ...res.data,
            creatorId: res.data.creatorId || cid,
            id: res.data.creatorId || cid
          }));
        }
      } catch (err) {
        console.warn('Backend API fetch for creator profile details failed, displaying matchItem profile:', err);
      }
    }
  };

  // Open Request Modal
  const handleOpenRequestModal = (matchItem) => {
    setRequestModalCreator(matchItem);
    setRequestSuccess('');
    setRequestError('');
    const defaultMsg = campaign
      ? `Hi ${matchItem.name}, we would love to collaborate with you on our upcoming "${campaign.title}" campaign.`
      : `Hi ${matchItem.name}, we would love to collaborate with you on our campaign.`;
    setRequestMsg(defaultMsg);
  };

  // Toggle shortlist
  const handleToggleShortlist = async (creatorId, e) => {
    e?.stopPropagation();
    if (shortlistBusy[creatorId]) return;

    setShortlistBusy(prev => ({ ...prev, [creatorId]: true }));
    try {
      if (shortlistedIds.has(creatorId)) {
        // Find shortlist item to remove
        const listRes = await shortlistApi.list();
        const item = listRes.data.find(s => String(s.campaignId) === String(id) && s.creatorId === creatorId);
        if (item) {
          await shortlistApi.remove(item.id);
          setShortlistedIds(prev => {
            const next = new Set(prev);
            next.delete(creatorId);
            return next;
          });
          setNotice('Creator removed from shortlist.');
        }
      } else {
        await shortlistApi.add({ campaignId: Number(id), creatorId });
        setShortlistedIds(prev => new Set(prev).add(creatorId));
        setNotice('Creator added to shortlist.');
      }
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to update shortlist.');
    } finally {
      setShortlistBusy(prev => ({ ...prev, [creatorId]: false }));
    }
  };

  // Send collaboration request
  const handleSendRequest = async e => {
    e?.preventDefault();
    if (!requestModalCreator || sendingRequest) return;

    setSendingRequest(true);
    setRequestSuccess('');
    setRequestError('');

    try {
      await collaborationApi.send({
        campaignId: Number(id),
        creatorId: requestModalCreator.creatorId,
        message: requestMsg.trim() || `We would love to collaborate with you on our campaign.`
      });

      setRequestSentIds(prev => new Set(prev).add(requestModalCreator.creatorId));
      setRequestSuccess(`Collaboration request sent successfully to ${requestModalCreator.name}!`);
      
      setTimeout(() => {
        setRequestModalCreator(null);
        setRequestSuccess('');
      }, 1500);
    } catch (err) {
      setRequestError(err.response?.data?.message || 'Failed to send collaboration request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  // Helpers
  const getInitials = name => {
    return (name || 'Creator')
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getCompatibilityStyle = comp => {
    const c = (comp || '').toLowerCase();
    if (c.includes('exceptional') || c.includes('excellent')) {
      return { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' };
    }
    if (c.includes('strong')) {
      return { background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' };
    }
    if (c.includes('moderate')) {
      return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
    }
    return { background: '#f9fafb', color: '#4b5563', border: '1px solid #e5e7eb' };
  };

  return (
    <div className="smart-match-page">
      {/* Top back navigation */}
      <div className="match-back-nav">
        <Link to="/brand/campaigns" className="back-link">
          <ArrowLeft size={16} /> Back to Campaigns
        </Link>
      </div>

      {/* Hero Header */}
      <header className="smart-match-header">
        <div className="smart-match-eyebrow">
          <Sparkles size={14} className="sparkle-icon" />
          <span>AI-Powered Discovery &middot; NVIDIA Nemotron 3 Super</span>
        </div>
        <h1>AI-Powered Creator Matches</h1>
        <p className="smart-match-subtitle">
          Matches are ranked using structured campaign requirements, creator profile data, and AI semantic compatibility.
        </p>

        {campaign && (
          <div className="matched-campaign-pill">
            <span className="pill-label">Active Campaign:</span>
            <strong>{campaign.title}</strong>
            <span className="pill-tag">{campaign.category}</span>
            <span className="pill-tag">{campaign.platform}</span>
            {campaign.targetLocation && <span className="pill-tag"><MapPin size={11} /> {campaign.targetLocation}</span>}
          </div>
        )}

        {notice && (
          <div className="match-toast-notice" role="status">
            <span>{notice}</span>
            <button type="button" className="toast-close" onClick={() => setNotice('')}>&times;</button>
          </div>
        )}
      </header>

      {/* Loading state with rotating AI hints */}
      {loading && (
        <div className="ai-loading-container" role="status">
          <div className="ai-radar-pulse">
            <div className="pulse-ring" />
            <div className="pulse-ring delay-1" />
            <div className="pulse-center">
              <Sparkles size={26} />
            </div>
          </div>
          <h3 className="loading-headline">{LOADING_MESSAGES[loadingMsgIndex]}</h3>
          <p className="loading-subtext">Evaluating niche alignment, audience credibility, and semantic synergy...</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="card match-error-card" role="alert">
          <AlertCircle size={28} className="error-icon" />
          <h3>Unable to evaluate matches</h3>
          <p>{error}</p>
          <button className="button ghost" onClick={() => window.location.reload()}>
            Retry Match Analysis
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && (!matches || matches.length === 0) && (
        <div className="card match-empty-card">
          <Info size={32} className="empty-icon" />
          <h3>No high-confidence matches found yet</h3>
          <p>
            No creator profiles met the campaign criteria threshold. Try broadening your campaign follower range,
            target location, or budget requirements.
          </p>
          <Link to={`/brand/campaigns`} className="button">
            View All Campaigns
          </Link>
        </div>
      )}

      {/* Ranked Match Cards */}
      {!loading && !error && matches && matches.length > 0 && (
        <div className="matches-list-container">
          <div className="matches-meta-bar">
            <span>Showing <b>{matches.length}</b> AI-evaluated creator {matches.length === 1 ? 'match' : 'matches'}</span>
            <span className="ranking-badge">
              <ShieldCheck size={13} /> 70% Rule Requirements + 30% AI Semantic Synergy
            </span>
          </div>

          <div className="matches-grid">
            {matches.map((creator, index) => {
              const PlatformIcon = PLATFORM_ICONS[creator.platform] || Globe;
              const isShortlisted = shortlistedIds.has(creator.creatorId);
              const isRequested = requestSentIds.has(creator.creatorId);

              return (
                <div className="card match-card" key={creator.creatorId}>
                  {/* Card Header with Rank and Score */}
                  <div className="match-card-top">
                    <div className="rank-and-compat">
                      <span className={`rank-chip ${index === 0 ? 'top-rank' : ''}`}>
                        {index === 0 ? '★ Top Match' : `#${index + 1} Match`}
                      </span>
                      {creator.aiCompatibility && (
                        <span
                          className="compat-pill"
                          style={getCompatibilityStyle(creator.aiCompatibility)}
                        >
                          {creator.aiCompatibility}
                        </span>
                      )}
                    </div>

                    {/* Circular Score Badge */}
                    <div className="score-badge-circle" title={`Final Match Score: ${creator.matchScore}%`}>
                      <span className="score-number">{creator.matchScore}%</span>
                      <span className="score-label">MATCH</span>
                    </div>
                  </div>

                  {/* Creator Info Row */}
                  <div className="creator-identity-row">
                    {creator.profileImage ? (
                      <img
                        src={creator.profileImage}
                        alt={creator.name}
                        className="match-avatar-img"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="match-avatar-fallback">
                        {getInitials(creator.name)}
                      </div>
                    )}

                    <div className="creator-text-details">
                      <h3 className="creator-title">{creator.name}</h3>
                      <div className="creator-chips-row">
                        <span className="info-chip category-chip">
                          <Layers size={12} /> {creator.category}
                        </span>
                        <span className="info-chip platform-chip">
                          <PlatformIcon size={12} /> {creator.platform}
                        </span>
                        {creator.location && (
                          <span className="info-chip location-chip">
                            <MapPin size={12} /> {creator.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Insight Box */}
                  {creator.aiInsight && (
                    <div className="ai-insight-box">
                      <div className="ai-insight-head">
                        <Sparkles size={13} className="insight-sparkle" />
                        <span>AI Executive Insight</span>
                      </div>
                      <p className="ai-insight-quote">"{creator.aiInsight}"</p>
                    </div>
                  )}

                  {/* Score Breakdown Bar */}
                  <div className="score-breakdown-row">
                    <div className="breakdown-item">
                      <span className="bd-label">Rule Score:</span>
                      <b className="bd-val">{creator.ruleBasedScore ?? creator.matchScore}%</b>
                    </div>
                    <div className="breakdown-divider">&middot;</div>
                    <div className="breakdown-item">
                      <span className="bd-label">AI Semantic:</span>
                      <b className="bd-val">{creator.aiSemanticScore != null ? `${creator.aiSemanticScore}%` : 'Standard'}</b>
                    </div>
                    <div className="breakdown-divider">&middot;</div>
                    <div className="breakdown-item">
                      <span className="bd-label">Audience:</span>
                      <b className="bd-val">{creator.followers?.toLocaleString()}</b>
                    </div>
                    <div className="breakdown-divider">&middot;</div>
                    <div className="breakdown-item">
                      <span className="bd-label">Rates:</span>
                      <b className="bd-val">₹{creator.priceMin?.toLocaleString()}–₹{creator.priceMax?.toLocaleString()}</b>
                    </div>
                  </div>

                  {/* Reasons / Match Strengths */}
                  <div className="reasons-section">
                    <div className="reasons-wrap">
                      {(creator.matchReasons || []).slice(0, 4).map((r, i) => (
                        <span className="reason-tag" key={i}>
                          <CheckCircle2 size={12} className="check-icon" /> {r}
                        </span>
                      ))}
                    </div>

                    {/* AI Concerns if present */}
                    {creator.aiConcerns && creator.aiConcerns.length > 0 && (
                      <div className="concerns-wrap">
                        {creator.aiConcerns.map((c, i) => (
                          <span className="concern-tag" key={i}>
                            <AlertCircle size={12} className="alert-icon" /> {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons - CLEAN DESIGN RESTORED */}
                  <div className="match-card-actions">
                    <button
                      type="button"
                      className="button primary-action-btn"
                      onClick={e => handleViewProfile(creator, e)}
                    >
                      View Profile
                    </button>

                    <button
                      type="button"
                      className={`button ghost shortlist-btn ${isShortlisted ? 'is-shortlisted' : ''}`}
                      onClick={e => handleToggleShortlist(creator.creatorId, e)}
                      disabled={shortlistBusy[creator.creatorId]}
                    >
                      {isShortlisted ? (
                        <>
                          <BookmarkCheck size={16} className="saved-icon" /> Shortlisted
                        </>
                      ) : (
                        <>
                          <Bookmark size={16} /> Shortlist
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Creator Profile & Collaboration Request Modal - Portaled to document.body */}
      {(activeProfile || loadingProfile) && createPortal(
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
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
              setActiveMatchData(null);
            }
          }}
        >
          <div
            className="profile-detail-modal card"
            style={{
              position: 'relative',
              zIndex: 1000000,
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => {
                setActiveProfile(null);
                setActiveMatchData(null);
              }}
              aria-label="Close profile modal"
            >
              &times;
            </button>

            {loadingProfile ? (
              <div className="modal-loading-state">
                <Loader2 size={32} className="modal-spinner" />
                <p>Loading creator profile portfolio...</p>
              </div>
            ) : activeProfile ? (
              <div className="modal-content-grid">
                {/* Creator Header Banner */}
                <div className="modal-creator-header">
                  <div className="modal-avatar-wrapper">
                    {activeProfile.profileImage ? (
                      <img
                        src={activeProfile.profileImage}
                        alt={activeProfile.name}
                        className="modal-avatar-img"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="modal-avatar-fallback">
                        {getInitials(activeProfile.name)}
                      </div>
                    )}
                  </div>

                  <div className="modal-creator-meta">
                    <h2>{activeProfile.name}</h2>
                    <div className="modal-badges">
                      <span className="preview-badge category-badge">
                        <Layers size={12} /> {activeProfile.category}
                      </span>
                      <span className="preview-badge platform-badge">
                        <Globe size={12} /> {activeProfile.platform}
                      </span>
                      <span className="preview-badge location-badge">
                        <MapPin size={12} /> {activeProfile.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Match Banner in Modal */}
                {activeMatchData && (
                  <div className="modal-ai-banner">
                    <div className="ai-banner-score">
                      <b>{activeMatchData.matchScore}%</b>
                      <span>Match</span>
                    </div>
                    <div className="ai-banner-content">
                      <div className="ai-banner-tag">
                        <Sparkles size={13} /> {activeMatchData.aiCompatibility || 'High Match'}
                      </div>
                      <p className="ai-banner-quote">
                        {activeMatchData.aiInsight || 'Strong alignment across campaign category, platform, and audience parameters.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="modal-stats-grid">
                  <div className="modal-stat-box">
                    <span className="stat-box-label"><Users size={14} /> Followers</span>
                    <b className="stat-box-val">{activeProfile.followers?.toLocaleString()}</b>
                  </div>
                  <div className="modal-stat-box">
                    <span className="stat-box-label"><TrendingUp size={14} /> Engagement</span>
                    <b className="stat-box-val">{activeProfile.engagementRate}%</b>
                  </div>
                  <div className="modal-stat-box">
                    <span className="stat-box-label"><DollarSign size={14} /> Price Range</span>
                    <b className="stat-box-val">₹{activeProfile.priceMin?.toLocaleString()} &ndash; ₹{activeProfile.priceMax?.toLocaleString()}</b>
                  </div>
                </div>

                {/* Bio Story */}
                <div className="modal-bio-section">
                  <h4>Creator Story & Bio</h4>
                  <p>{activeProfile.bio || 'No bio provided.'}</p>
                </div>

                {/* Action Buttons at VERY BOTTOM of Profile */}
                <div className="modal-request-section" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                  <div className="request-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="button primary-action-btn"
                      onClick={() => {
                        const target = activeMatchData || activeProfile;
                        const targetId = target.creatorId || target.id;
                        setActiveProfile(null);
                        setActiveMatchData(null);
                        handleOpenRequestModal({ ...target, creatorId: targetId });
                      }}
                      disabled={requestSentIds.has(activeProfile.creatorId || activeProfile.id)}
                    >
                      <Send size={16} /> {requestSentIds.has(activeProfile.creatorId || activeProfile.id) ? 'Request Sent' : 'Send Request'}
                    </button>

                    <Link
                      to={`/brand/messages?creatorId=${activeProfile.creatorId || activeProfile.id}&campaignId=${id}`}
                      className="button ghost"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <MessageSquare size={16} /> Send Message
                    </Link>

                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => {
                        setActiveProfile(null);
                        setActiveMatchData(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}

      {/* Standalone Collaboration Request Modal - Portaled to document.body */}
      {requestModalCreator && createPortal(
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
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
              setRequestModalCreator(null);
            }
          }}
        >
          <div
            className="profile-detail-modal card"
            style={{
              position: 'relative',
              zIndex: 1000000,
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setRequestModalCreator(null)}
              aria-label="Close request modal"
            >
              &times;
            </button>

            <div className="modal-request-section" style={{ borderTop: 'none', padding: '10px 0 0' }}>
              <h4>Send Collaboration Request</h4>
              <p className="request-subhead">
                To: <b>{requestModalCreator.name}</b> <br />
                Campaign: <b>{campaign?.title || `#${id}`}</b>
              </p>

              {requestError && (
                <div className="request-error-banner" style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fee2e2' }}>
                  <AlertCircle size={16} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                  {requestError}
                </div>
              )}

              {requestSuccess ? (
                <div className="request-success-banner">
                  <CheckCircle2 size={20} className="success-icon" />
                  <div>
                    <strong>{requestSuccess}</strong>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendRequest} className="request-form">
                  <textarea
                    rows={4}
                    className="request-textarea"
                    placeholder="Write a personalized collaboration message..."
                    value={requestMsg}
                    onChange={e => setRequestMsg(e.target.value)}
                    required
                  />

                  <div className="request-actions">
                    <button
                      type="submit"
                      className="button request-submit-btn"
                      disabled={sendingRequest || !requestMsg.trim()}
                    >
                      {sendingRequest ? (
                        <>
                          <Loader2 size={16} className="button-spinner" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Send Request
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => setRequestModalCreator(null)}
                    >
                      Cancel
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
