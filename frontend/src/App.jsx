import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import PlaceholderPage from './pages/PlaceholderPage';
import {Navigate} from 'react-router-dom';
import {useAuth} from './context/AuthContext';
import {
  AuthPage,
  Dashboard,
  Campaigns,
  CampaignForm,
  Matches,
  Profile,
  Requests,
  Shortlist,
  SentRequests,
  Discovery,
  Messages
} from './pages/AppPages';

function Guard({role,children}){
  const {user} = useAuth();
  return !user ? <Navigate to="/login"/> : user.role !== role ? <Navigate to={user.role === 'BRAND' ? '/brand/dashboard' : '/creator/dashboard'}/> : children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage/>} />
        <Route path="/login" element={<AuthPage/>} />
        <Route path="/register" element={<AuthPage register/>} />
        <Route path="/brand/dashboard" element={<Guard role="BRAND"><Dashboard/></Guard>} />
        <Route path="/creator/dashboard" element={<Guard role="CREATOR"><Dashboard/></Guard>} />
        <Route path="/brand/creators" element={<Guard role="BRAND"><Discovery/></Guard>} />
        <Route path="/brand/campaigns" element={<Guard role="BRAND"><Campaigns/></Guard>} />
        <Route path="/brand/campaigns/new" element={<Guard role="BRAND"><CampaignForm/></Guard>} />
        <Route path="/brand/campaigns/:id/matches" element={<Guard role="BRAND"><Matches/></Guard>} />
        <Route path="/brand/shortlist" element={<Guard role="BRAND"><Shortlist/></Guard>} />
        <Route path="/brand/requests" element={<Guard role="BRAND"><SentRequests/></Guard>} />
        <Route path="/brand/messages" element={<Guard role="BRAND"><Messages/></Guard>} />
        <Route path="/creator/profile" element={<Guard role="CREATOR"><Profile/></Guard>} />
        <Route path="/creator/requests" element={<Guard role="CREATOR"><Requests/></Guard>} />
        <Route path="/creator/messages" element={<Guard role="CREATOR"><Messages/></Guard>} />
      </Routes>
    </Layout>
  );
}

