import React from 'react';

// Small form primitives shared by the admin pages (styles live in ops2.css: .st-*).
export const Field = ({ label, hint, prefix, suffix, children, className = '' }) => (
  <label className={`st-field ${className}`}>
    <span className="st-lab">{label}</span>
    <span className="st-input">{prefix && <i>{prefix}</i>}{children}{suffix && <i>{suffix}</i>}</span>
    {hint && <small>{hint}</small>}
  </label>
);

export const Toggle = ({ checked, onChange, label, hint, disabled }) => (
  <label className={`st-toggle ${disabled ? 'dis' : ''}`}>
    <span className="st-tg-text"><b>{label}</b>{hint && <small>{hint}</small>}</span>
    <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span className="st-sw" />
  </label>
);
