import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Inbox + realtime. New items also pop a browser notification when the tab is in the background.
export const useNotifications = (userId, { onNew } = {}) => {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);
    setItems(data || []);
  }, [userId]);

  useEffect(() => {
    if (!supabase || !userId) return undefined;
    load();
    const ch = supabase.channel(`notif-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new;
        setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 30));
        onNew?.(n);
        try {
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(n.title, { body: n.body || '', icon: '/icon.svg' });
        } catch { /* some mobile browsers only allow service-worker notifications */ }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, load]);

  const markRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    await supabase.rpc('mark_notifications_read');
  }, []);

  return { items, unread: items.filter((n) => !n.read_at).length, markRead, reload: load };
};
