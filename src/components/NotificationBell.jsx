import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
};

export const NotificationBell = ({ userId, onNew, dark = false }) => {
  const { items, unread, markRead } = useNotifications(userId, { onNew });
  const [open, setOpen] = useState(false);
  if (!userId) return null;
  return (
    <div className="psk-bell">
      <button className={`psk-bell-btn ${dark ? 'dark' : ''}`} aria-label="Notifications" onClick={() => { setOpen(!open); if (!open && unread) markRead(); }}>
        <Bell size={18} />
        {unread > 0 && <span className="psk-bell-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="psk-bell-scrim" onClick={() => setOpen(false)} />
          <div className="psk-bell-panel">
            <div className="psk-bell-head">Notifications</div>
            {items.length === 0 && <div className="psk-bell-empty">Nothing yet. Order updates show up here.</div>}
            {items.map((n) => (
              <div key={n.id} className={`psk-bell-item ${n.read_at ? '' : 'new'}`}>
                <b>{n.title}</b>
                {n.body && <span>{n.body}</span>}
                <small>{ago(n.created_at)}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
