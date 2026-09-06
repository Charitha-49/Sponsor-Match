import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  campaignApi,
  creatorApi,
  shortlistApi,
  collaborationApi,
  messageApi
} from '../services/api';
import CreatorProfilePage from './CreatorProfilePage';
import SmartMatchPage from './SmartMatchPage';
import CreatorDiscoveryPage from './CreatorDiscoveryPage';
import MessagesPage from './MessagesPage';
import {
  Sparkles,
  Users,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Bookmark,
  MessageSquare,
  PlusCircle,
  Search,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const err = e => e.response?.data?.message || 'Something went wrong. Please try again.';

const Field = ({ label, ...p }) => (
  <label className="input-wrap">
    <span>{label}</span>
    <input {...p} />
  </label>
);

const Page = ({ title, subtitle, children }) => (
  <div className="page">
    <div className="page-header" style={{ marginBottom: 24 }}>
      <h1>{title}</h1>
      {subtitle && <p style={{ color: 'var(--muted)', marginTop: 4 }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

// 1. Auth Page
export function AuthPage({ register }) {
  const { login, register: reg } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ role: 'BRAND' });
  const [e, setE] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async x => {
    x.preventDefault();
    setBusy(true);
    setE('');
    try {
      let u = register ? await reg(f) : await login(f);
      nav(u.role === 'BRAND' ? '/brand/dashboard' : '/creator/dashboard');
    } catch (x) {
      setE(err(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="placeholder">
      <section className="card auth-card">
        <p className="eyebrow">Sponsor Match</p>
        <h2>{register ? 'Create your account' : 'Welcome back'}</h2>
        <form onSubmit={go}>
          {register && (
            <>
              <Field
                label="Full Name or Brand Name"
                required
                onChange={x => setF({ ...f, name: x.target.value })}
              />
              <label className="input-wrap">
                <span>Account Role</span>
                <select
                  value={f.role}
                  onChange={x => setF({ ...f, role: x.target.value })}
                >
                  <option value="BRAND">Brand / Sponsor</option>
                  <option value="CREATOR">Content Creator</option>
                </select>
              </label>
            </>
          )}
          <Field
            label="Email Address"
            type="email"
            required
            onChange={x => setF({ ...f, email: x.target.value })}
          />
          <Field
            label="Password"
            type="password"
            minLength="8"
            required
            onChange={x => setF({ ...f, password: x.target.value })}
          />
          {e && <p className="form-error">{e}</p>}
          <button className="button" disabled={busy}>
            {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <Link to={register ? '/login' : '/register'}>
          {register ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Link>
      </section>
    </div>
  );
}

// 2. Upgraded Dashboard
export function Dashboard() {
  const { user } = useAuth();
  const isBrand = user?.role === 'BRAND';

  // Brand state
  const [campaigns, setCampaigns] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  // Creator state
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [receivedRequests, setReceivedRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isBrand) {
          const [cRes, sRes, rRes] = await Promise.all([
            campaignApi.mine().catch(() => ({ data: [] })),
            shortlistApi.list().catch(() => ({ data: [] })),
            collaborationApi.sent().catch(() => ({ data: [] }))
          ]);
          setCampaigns(cRes.data || []);
          setShortlists(sRes.data || []);
          setSentRequests(rRes.data || []);
        } else {
          const [pRes, rRes] = await Promise.all([
            creatorApi.getProfile().catch(() => null),
            collaborationApi.received().catch(() => ({ data: [] }))
          ]);
          if (pRes && pRes.data) {
            setCreatorProfile(pRes.data);
            setHasProfile(true);
          }
          setReceivedRequests(rRes.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isBrand]);

  const handleCreatorDecision = async (id, decision) => {
    try {
      const res = await collaborationApi.decide(id, decision);
      setReceivedRequests(prev => prev.map(r => (r.id === id ? res.data : r)));
    } catch (e) {
      alert(err(e));
    }
  };

  if (isBrand) {
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
    const pendingRequests = sentRequests.filter(r => r.status === 'PENDING');
    const acceptedRequests = sentRequests.filter(r => r.status === 'ACCEPTED');

    return (
      <Page
        title={`Welcome back, ${user.name}`}
        subtitle="Manage campaigns, discover creators manually or with AI, and track collaboration requests."
      >
        {/* Metric Stat Cards */}
        <div className="stats dashboard-stats-grid">
          <div className="card stat-widget">
            <span className="stat-widget-num">{campaigns.length}</span>
            <span className="stat-widget-label">Total Campaigns</span>
            <span className="stat-widget-sub">{activeCampaigns.length} Active</span>
          </div>
          <div className="card stat-widget">
            <span className="stat-widget-num highlight">{shortlists.length}</span>
            <span className="stat-widget-label">Shortlisted Creators</span>
            <Link to="/brand/shortlist" className="stat-widget-link">
              View Shortlist &rarr;
            </Link>
          </div>
          <div className="card stat-widget">
            <span className="stat-widget-num">{pendingRequests.length}</span>
            <span className="stat-widget-label">Pending Requests</span>
            <span className="stat-widget-sub">Awaiting creator response</span>
          </div>
          <div className="card stat-widget">
            <span className="stat-widget-num color-accent">{acceptedRequests.length}</span>
            <span className="stat-widget-label">Accepted Collaborations</span>
            <Link to="/brand/requests" className="stat-widget-link">
              View All &rarr;
            </Link>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="dashboard-actions-card card">
          <div className="dashboard-actions-header">
            <h3>Quick Actions</h3>
            <p>Select an action to grow your influencer sponsorships</p>
          </div>
          <div className="dashboard-actions-buttons">
            <Link className="button" to="/brand/creators">
              <Search size={16} /> Find Creators
            </Link>
            <Link className="button ghost" to="/brand/campaigns/new">
              <PlusCircle size={16} /> Create Campaign
            </Link>
            <Link className="button ghost" to="/brand/shortlist">
              <Bookmark size={16} /> My Shortlist ({shortlists.length})
            </Link>
            <Link className="button ghost" to="/brand/messages">
              <MessageSquare size={16} /> Inquiries &amp; Messages
            </Link>
          </div>
        </div>

        {/* Active Collaborations / Recent Sent Requests */}
        <div className="dashboard-section" style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2>Recent Collaboration Proposals</h2>
            <Link to="/brand/requests" className="text-button">
              View All ({sentRequests.length}) &rarr;
            </Link>
          </div>

          {!sentRequests.length ? (
            <div className="card empty-dash-card">
              <p>No collaboration requests sent yet.</p>
              <Link to="/brand/creators" className="button ghost" style={{ marginTop: 10 }}>
                Discover Creators to Collaborate
              </Link>
            </div>
          ) : (
            <div className="list">
              {sentRequests.slice(0, 4).map(req => (
                <div key={req.id} className="card request-item-card">
                  <div className="request-card-header">
                    <div>
                      <h3 style={{ margin: 0 }}>{req.creatorName}</h3>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                        Campaign: <strong>{req.campaignTitle}</strong>
                      </span>
                    </div>
                    <span className={`request-status-pill status-${req.status.toLowerCase()}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="request-message-body">{req.message}</p>
                  <div className="request-card-footer">
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Sent: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                    </span>
                    <Link to={`/brand/messages?creatorId=${req.creatorId}&campaignId=${req.campaignId}`} className="button ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                      <MessageSquare size={13} /> Message
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaigns List */}
        <div className="dashboard-section" style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2>Your Campaigns</h2>
            <Link to="/brand/campaigns/new" className="text-button">
              + New Campaign
            </Link>
          </div>
          <CampaignList data={campaigns} />
        </div>
      </Page>
    );
  }

  // CREATOR DASHBOARD
  const incomingPending = receivedRequests.filter(r => r.status === 'PENDING');
  const incomingAccepted = receivedRequests.filter(r => r.status === 'ACCEPTED');
  const incomingRejected = receivedRequests.filter(r => r.status === 'REJECTED');

  return (
    <Page
      title={`Welcome back, ${user.name}`}
      subtitle="Manage your creator portfolio, respond to brand collaboration requests, and track your active partnerships."
    >
      {/* Profile Completeness Banner */}
      {!hasProfile ? (
        <div className="card creator-onboarding-banner">
          <div className="banner-content">
            <Sparkles size={24} className="banner-icon" />
            <div>
              <h3>Complete your Creator Profile</h3>
              <p>Set up your bio, platform, pricing, and stats to become discoverable by brands in Smart Match.</p>
            </div>
          </div>
          <Link to="/creator/profile" className="button">
            Set Up Profile Now
          </Link>
        </div>
      ) : (
        <div className="card profile-status-badge-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={20} color="var(--primary)" />
            <div>
              <strong>Creator Profile Active &middot; Smart Match Ready</strong>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                {creatorProfile.category} &bull; {creatorProfile.platform} &bull; {creatorProfile.followers?.toLocaleString()} followers &bull; ₹{creatorProfile.priceMin?.toLocaleString()}–₹{creatorProfile.priceMax?.toLocaleString()}
              </p>
            </div>
          </div>
          <Link to="/creator/profile" className="button ghost" style={{ padding: '6px 14px', fontSize: 13 }}>
            Edit Profile
          </Link>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="stats dashboard-stats-grid" style={{ marginTop: 20 }}>
        <div className="card stat-widget">
          <span className="stat-widget-num">{receivedRequests.length}</span>
          <span className="stat-widget-label">Total Opportunities</span>
          <span className="stat-widget-sub">Brand sponsorship proposals</span>
        </div>
        <div className="card stat-widget">
          <span className="stat-widget-num highlight">{incomingPending.length}</span>
          <span className="stat-widget-label">Pending Review</span>
          <Link to="/creator/requests" className="stat-widget-link">
            Review Now &rarr;
          </Link>
        </div>
        <div className="card stat-widget">
          <span className="stat-widget-num color-accent">{incomingAccepted.length}</span>
          <span className="stat-widget-label">Accepted Collaborations</span>
          <span className="stat-widget-sub">Active partnerships</span>
        </div>
        <div className="card stat-widget">
          <span className="stat-widget-num">{incomingRejected.length}</span>
          <span className="stat-widget-label">Declined Requests</span>
          <span className="stat-widget-sub">Archived</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-actions-card card" style={{ marginTop: 20 }}>
        <div className="dashboard-actions-buttons">
          <Link className="button" to="/creator/requests">
            <Clock size={16} /> Incoming Requests ({incomingPending.length})
          </Link>
          <Link className="button ghost" to="/creator/profile">
            <Users size={16} /> Manage Portfolio
          </Link>
          <Link className="button ghost" to="/creator/messages">
            <MessageSquare size={16} /> Direct Messages
          </Link>
        </div>
      </div>

      {/* Recent Incoming Proposals */}
      <div className="dashboard-section" style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2>Recent Partnership Proposals</h2>
          <Link to="/creator/requests" className="text-button">
            View All ({receivedRequests.length}) &rarr;
          </Link>
        </div>

        {!receivedRequests.length ? (
          <div className="card empty-dash-card">
            <p>No collaboration proposals received yet. Make sure your profile is complete so brands can discover you!</p>
            <Link to="/creator/profile" className="button ghost" style={{ marginTop: 10 }}>
              Review Profile Settings
            </Link>
          </div>
        ) : (
          <div className="list">
            {receivedRequests.slice(0, 4).map(req => (
              <div key={req.id} className="card request-item-card">
                <div className="request-card-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{req.campaignTitle}</h3>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Proposal received {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <span className={`request-status-pill status-${req.status.toLowerCase()}`}>
                    {req.status}
                  </span>
                </div>
                <p className="request-message-body">{req.message}</p>
                {req.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button
                      className="button"
                      style={{ padding: '8px 18px', fontSize: 13 }}
                      onClick={() => handleCreatorDecision(req.id, 'accept')}
                    >
                      Accept Collaboration
                    </button>
                    <button
                      className="button ghost"
                      style={{ padding: '8px 18px', fontSize: 13 }}
                      onClick={() => handleCreatorDecision(req.id, 'reject')}
                    >
                      Decline
                    </button>
                    <Link
                      to={`/creator/messages?brandId=${req.brandId}&campaignId=${req.campaignId}`}
                      className="button ghost"
                      style={{ padding: '8px 18px', fontSize: 13 }}
                    >
                      <MessageSquare size={14} /> Inquire
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

// 3. Campaigns List Page
export function Campaigns() {
  const [d, setD] = useState([]);
  useEffect(() => {
    campaignApi.mine().then(x => setD(x.data || [])).catch(() => {});
  }, []);
  return (
    <Page title="Your Campaigns" subtitle="Manage your campaigns and discover matched creators.">
      <div style={{ marginBottom: 20 }}>
        <Link className="button" to="/brand/campaigns/new">
          <PlusCircle size={16} /> Create Campaign
        </Link>
      </div>
      <CampaignList data={d} />
    </Page>
  );
}

function CampaignList({ data }) {
  return (
    <div className="list">
      {data.length ? (
        data.map(x => (
          <div className="card campaign-card-item" key={x.id}>
            <div className="campaign-card-content">
              <div className="campaign-badge-row">
                <span className="creator-category-badge">{x.category}</span>
                <span className="creator-platform-pill">{x.platform}</span>
                <span className={`request-status-pill status-${x.status.toLowerCase()}`}>{x.status}</span>
              </div>
              <h3>{x.title}</h3>
              <p className="campaign-desc-snippet">{x.description}</p>
              <div className="campaign-meta-row">
                <span>Location: <strong>{x.targetLocation || 'All'}</strong></span>
                <span>Budget: <strong>₹{x.maxBudget?.toLocaleString()}</strong></span>
                <span>Followers: <strong>{x.minFollowers?.toLocaleString()}–{x.maxFollowers?.toLocaleString()}</strong></span>
              </div>
            </div>
            <div className="campaign-card-actions">
              <Link className="button ghost ai-match-pill-btn" to={`/brand/campaigns/${x.id}/matches`}>
                <Sparkles size={15} /> Find Smart Matches
              </Link>
            </div>
          </div>
        ))
      ) : (
        <div className="card empty-dash-card">
          <p>No campaigns yet. Create your first campaign to discover creators automatically with AI.</p>
          <Link className="button" to="/brand/campaigns/new" style={{ marginTop: 10 }}>
            Create Campaign
          </Link>
        </div>
      )}
    </div>
  );
}

// 4. Campaign Form
export function CampaignForm() {
  const nav = useNavigate();
  const [f, setF] = useState({
    title: '',
    description: '',
    category: 'Technology',
    platform: 'Instagram',
    targetLocation: 'India',
    minFollowers: 10000,
    maxFollowers: 100000,
    minEngagement: 3.0,
    maxBudget: 25000,
    status: 'ACTIVE'
  });
  const [e, setE] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async x => {
    x.preventDefault();
    setSubmitting(true);
    setE('');
    try {
      let r = await campaignApi.create({
        ...f,
        minFollowers: +f.minFollowers || 0,
        maxFollowers: +f.maxFollowers || 0,
        minEngagement: +f.minEngagement || 0,
        maxBudget: +f.maxBudget || 0
      });
      nav(`/brand/campaigns/${r.data.id}/matches`);
    } catch (x) {
      setE(err(x));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page title="Create Campaign" subtitle="Define campaign parameters to automatically discover matching creators using NVIDIA Nemotron 3 Super.">
      <form className="card form-grid campaign-creation-form" onSubmit={submit}>
        <Field
          label="Campaign Title *"
          required
          placeholder="e.g. Summer Skincare Product Launch"
          value={f.title}
          onChange={x => setF({ ...f, title: x.target.value })}
        />

        <label className="input-wrap full-width">
          <span>Campaign Objective &amp; Description *</span>
          <textarea
            rows={3}
            required
            placeholder="Describe what your brand does, target audience, deliverables, and creative direction..."
            value={f.description}
            onChange={x => setF({ ...f, description: x.target.value })}
          />
        </label>

        <label className="input-wrap">
          <span>Category *</span>
          <select value={f.category} onChange={x => setF({ ...f, category: x.target.value })}>
            {['Technology', 'Beauty', 'Fashion', 'Gaming', 'Fitness', 'Lifestyle', 'Travel', 'Food & Cooking', 'Business & Finance', 'Entertainment', 'Education'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="input-wrap">
          <span>Target Platform *</span>
          <select value={f.platform} onChange={x => setF({ ...f, platform: x.target.value })}>
            {['Instagram', 'YouTube', 'TikTok', 'X/Twitter', 'LinkedIn', 'Twitch'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <Field
          label="Target Location / Region"
          placeholder="e.g. India, Mumbai, Global"
          value={f.targetLocation}
          onChange={x => setF({ ...f, targetLocation: x.target.value })}
        />

        <Field
          label="Max Budget (₹)"
          type="number"
          placeholder="e.g. 50000"
          value={f.maxBudget}
          onChange={x => setF({ ...f, maxBudget: x.target.value })}
        />

        <Field
          label="Min Followers"
          type="number"
          placeholder="e.g. 10000"
          value={f.minFollowers}
          onChange={x => setF({ ...f, minFollowers: x.target.value })}
        />

        <Field
          label="Max Followers"
          type="number"
          placeholder="e.g. 100000"
          value={f.maxFollowers}
          onChange={x => setF({ ...f, maxFollowers: x.target.value })}
        />

        <Field
          label="Min Engagement Rate (%)"
          type="number"
          step="0.1"
          placeholder="e.g. 3.0"
          value={f.minEngagement}
          onChange={x => setF({ ...f, minEngagement: x.target.value })}
        />

        {e && <div className="discovery-alert error full-width"><AlertCircle size={16} /><span>{e}</span></div>}

        <div className="full-width" style={{ marginTop: 12 }}>
          <button className="button" disabled={submitting} style={{ width: '100%' }}>
            <Sparkles size={16} />
            <span>{submitting ? 'Creating & Analyzing Creators...' : 'Create Campaign & Find AI Matches'}</span>
          </button>
        </div>
      </form>
    </Page>
  );
}

// 5. Creator Requests Tab
export function Requests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    collaborationApi
      .received()
      .then(x => {
        setItems(x.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const decide = (id, a) =>
    collaborationApi.decide(id, a).then(r => setItems(items.map(i => (i.id === id ? r.data : i))));

  const filteredItems = items.filter(item => {
    if (activeFilter === 'ALL') return true;
    return item.status === activeFilter;
  });

  return (
    <Page
      title="Incoming Sponsorship Requests"
      subtitle="Review and respond to partnership proposals sent by brands to your creator profile."
    >
      {/* Filter tabs */}
      <div className="category-chips" style={{ marginBottom: 20 }}>
        {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'].map(tab => (
          <button
            key={tab}
            className={`chip ${activeFilter === tab ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab)}
          >
            {tab === 'ALL' ? 'All Requests' : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading your requests…</p>
      ) : !items.length ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            No collaboration requests received yet. When brands discover your profile through Smart Match or Creator Discovery, proposals will appear here.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <p style={{ margin: 0, color: 'var(--muted)' }}>No requests matching status "{activeFilter}".</p>
        </div>
      ) : (
        <div className="list">
          {filteredItems.map(x => (
            <div className="card request-item-card" key={x.id}>
              <div className="request-card-header">
                <div>
                  <h3 style={{ margin: 0 }}>{x.brandName || 'Brand'} &ndash; {x.campaignTitle}</h3>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Proposal received: {x.createdAt ? new Date(x.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <span className={`request-status-pill status-${x.status.toLowerCase()}`}>
                  {x.status}
                </span>
              </div>
              <p className="request-message-body">{x.message}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
                {x.status === 'PENDING' && (
                  <>
                    <button
                      className="button"
                      style={{ padding: '8px 16px', fontSize: 13 }}
                      onClick={() => decide(x.id, 'accept')}
                    >
                      Accept Collaboration
                    </button>
                    <button
                      className="button ghost"
                      style={{ padding: '8px 16px', fontSize: 13 }}
                      onClick={() => decide(x.id, 'reject')}
                    >
                      Decline
                    </button>
                  </>
                )}
                <Link
                  to={`/creator/messages?brandId=${x.brandId}&campaignId=${x.campaignId}`}
                  className="button ghost"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  <MessageSquare size={14} /> Send Message
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

// 6. Brand Shortlist Page
export function Shortlist() {
  const [s, setS] = useState([]);
  const [e, setE] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shortlistApi
      .list()
      .then(r => {
        setS(r.data || []);
        setLoading(false);
      })
      .catch(x => {
        setE(err(x));
        setLoading(false);
      });
  }, []);

  const remove = id => {
    shortlistApi.remove(id).then(() => setS(s.filter(i => i.id !== id)));
  };

  return (
    <Page
      title="Saved Shortlist"
      subtitle="Creators you have saved across your campaigns for review and outreach."
    >
      {e && (
        <div className="discovery-alert error">
          <AlertCircle size={16} />
          <span>{e}</span>
        </div>
      )}

      {loading ? (
        <p>Loading shortlist...</p>
      ) : !s.length ? (
        <div className="card empty-dash-card">
          <Bookmark size={36} className="empty-icon" />
          <h3>Your Shortlist is Empty</h3>
          <p>Browse creators in Creator Discovery or AI Smart Matches and click "Shortlist" to save candidates here.</p>
          <Link to="/brand/creators" className="button" style={{ marginTop: 12 }}>
            Find Creators Now
          </Link>
        </div>
      ) : (
        <div className="list">
          {s.map(x => (
            <div className="card shortlist-item-card" key={x.id}>
              <div className="shortlist-info-col">
                <h3>{x.creatorName}</h3>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Saved for Campaign #{x.campaignId} &bull; Added {x.createdAt ? new Date(x.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
              <div className="shortlist-actions-col">
                <Link to="/brand/creators" className="button ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
                  View Profile
                </Link>
                <button
                  className="button ghost text-danger"
                  style={{ padding: '8px 14px', fontSize: 13 }}
                  onClick={() => remove(x.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

// 7. Brand Sent Requests Page
export function SentRequests() {
  const [r, setR] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    collaborationApi
      .sent()
      .then(x => {
        setR(x.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = r.filter(req => {
    if (filter === 'ALL') return true;
    return req.status === filter;
  });

  return (
    <Page
      title="Sent Collaboration Requests"
      subtitle="Track the status of collaboration requests sent to creators across all your campaigns."
    >
      {/* Filter Tabs */}
      <div className="category-chips" style={{ marginBottom: 20 }}>
        {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'].map(tab => (
          <button
            key={tab}
            className={`chip ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab === 'ALL' ? 'All Requests' : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading sent requests...</p>
      ) : !r.length ? (
        <div className="card empty-dash-card">
          <Send size={36} className="empty-icon" />
          <h3>No Requests Sent Yet</h3>
          <p>Find creators using Smart Match or Creator Discovery to send your first partnership proposal.</p>
          <Link to="/brand/creators" className="button" style={{ marginTop: 12 }}>
            Find Creators
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <p style={{ margin: 0, color: 'var(--muted)' }}>No requests with status "{filter}".</p>
        </div>
      ) : (
        <div className="list">
          {filtered.map(x => (
            <div className="card request-item-card" key={x.id}>
              <div className="request-card-header">
                <div>
                  <h3 style={{ margin: 0 }}>{x.creatorName}</h3>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Campaign: <strong>{x.campaignTitle}</strong> &bull; Sent: {x.createdAt ? new Date(x.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <span className={`request-status-pill status-${x.status.toLowerCase()}`}>
                  {x.status}
                </span>
              </div>
              <p className="request-message-body">{x.message}</p>
              <div className="request-card-footer">
                <Link to={`/brand/messages?creatorId=${x.creatorId}&campaignId=${x.campaignId}`} className="button ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                  <MessageSquare size={13} /> Message Creator
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

// Exports
export { SmartMatchPage as Matches };
export { CreatorProfilePage as Profile };
export { CreatorDiscoveryPage as Discovery };
export { MessagesPage as Messages };
