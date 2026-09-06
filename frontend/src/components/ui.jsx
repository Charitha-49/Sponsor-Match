import React from 'react';

export function Button({ children, variant = 'primary', className = '', ...props }) { return <button className={`button ${variant} ${className}`} {...props}>{children}</button>; }
export function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section>; }
export function Input({ label, ...props }) { return <label className="input-wrap">{label && <span>{label}</span>}<input {...props} /></label>; }
export function LoadingState({ label = 'Loading...' }) { return <div className="loading-state" role="status"><span className="spinner" />{label}</div>; }
