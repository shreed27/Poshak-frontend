import React from 'react';
import { createRoot } from 'react-dom/client';

// In-app replacement for window.confirm / window.alert (a bottom sheet on phones, a small card on desktop).
// askConfirm({ title, body, ok, cancel, danger }) resolves true/false. Pass cancel: null for a single "OK" message.
export const askConfirm = ({ title, body = '', ok = 'OK', cancel = 'Cancel', danger = false }) =>
  new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v) => { root.unmount(); host.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', onKey);
    root.render(
      <div className="qc-dialog-back" onClick={() => done(false)}>
        <div className="qc-dialog" role="alertdialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
          <h4>{title}</h4>
          {body && <p>{body}</p>}
          <div className="qc-dialog-actions">
            {cancel && <button type="button" onClick={() => done(false)}>{cancel}</button>}
            <button type="button" className={`primary ${danger ? 'danger' : ''}`} autoFocus onClick={() => done(true)}>{ok}</button>
          </div>
        </div>
      </div>
    );
  });

export const showMessage = (title, body) => askConfirm({ title, body, ok: 'OK', cancel: null });
