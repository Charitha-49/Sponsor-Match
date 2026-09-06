import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Card } from '../components/ui';
const labels = {'/login':'Welcome back','/register':'Create your Sponsor Match account','/brand/dashboard':'Brand workspace','/creator/dashboard':'Creator studio','/brand/campaigns':'Your campaigns','/brand/campaigns/new':'Create a campaign','/creator/profile':'Your creator profile','/creator/requests':'Collaboration requests','/brand/shortlist':'Creator shortlist'};
export default function PlaceholderPage() { const { pathname } = useLocation(); const title = labels[pathname] || 'Campaign matches'; return <div className="placeholder"><Link to="/" className="back"><ArrowLeft size={16}/> Back to Sponsor Match</Link><Card><span className="placeholder-icon"><Construction size={24}/></span><p className="eyebrow">Foundation route</p><h2>{title}</h2><p>This polished workspace is ready for the next focused feature pass. Navigation, shared UI, and API foundations are already in place.</p></Card></div>; }
