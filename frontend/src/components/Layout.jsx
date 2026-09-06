import React from 'react';
import { Link, NavLink } from 'react-router-dom'; import { Sparkles } from 'lucide-react';
import {useAuth}from'../context/AuthContext';
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const isBrand = user?.role === 'BRAND';

  return (
    <div className="app-shell">
      <header className="nav">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Sparkles size={17} />
          </span>
          Sponsor Match
        </Link>
        <nav>
          {user ? (
            <>
              {isBrand ? (
                <>
                  <NavLink to="/brand/dashboard">Dashboard</NavLink>
                  <NavLink to="/brand/creators">Find Creators</NavLink>
                  <NavLink to="/brand/campaigns">Campaigns</NavLink>
                  <NavLink to="/brand/shortlist">Shortlist</NavLink>
                  <NavLink to="/brand/requests">Requests</NavLink>
                  <NavLink to="/brand/messages">Messages</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/creator/dashboard">Dashboard</NavLink>
                  <NavLink to="/creator/profile">My Profile</NavLink>
                  <NavLink to="/creator/requests">Requests</NavLink>
                  <NavLink to="/creator/messages">Messages</NavLink>
                </>
              )}
            </>
          ) : (
            <>
              <a href="#product">Product</a>
              <a href="#how">How it works</a>
            </>
          )}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="user-chip">{user.name}</span>
              <button className="text-button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="nav-cta" to="/register">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <span>© 2026 Sponsor Match</span>
        <span>Better partnerships, intelligently matched.</span>
      </footer>
    </div>
  );
}

