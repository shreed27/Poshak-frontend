import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Bug, Webhook, CreditCard, BellRing, CheckCircle2, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { agoText } from '../../lib/tracking';
import { dt } from '../../lib/csv';

const since = (iso) => (iso ? agoText(Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000))) : 'never');

export const AdminSystem = () => {
  const [errors, setErrors] = useState(null);
  const [health, setHealth] = useState({});
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [e, w, p, a, f] = await Promise.all([
      supabase.from('client_errors').select('*').is('resolved_at', null).order('last_seen', { ascending: false }).limit(100),
      supabase.from('webhook_events').select('received_at').order('received_at', { ascending: false }).limit(1),
      supabase.from('payments').select('created_at').order('created_at', { ascending: false }).limit(1),
      supabase.from('ops_alerts').select('id', { count: 'exact', head: true }).is('resolved_at', null),
      supabase.from('refunds').select('id', { count: 'exact', head: true }).eq('status', 'failed')
    ]);
    if (e.error) { setErr(e.error.message); return; }
    setErr(''); setErrors(e.data || []);
    setHealth({ webhook: w.data?.[0]?.received_at, payment: p.data?.[0]?.created_at, alerts: a.count || 0, failedRefunds: f.count || 0 });
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const resolve = async (id) => { const { error } = await supabase.rpc('admin_resolve_error', { p_id: id }); if (error) setErr(error.message); else load(); };
  const sendSummary = async () => {
    const { data, error } = await supabase.rpc('admin_send_daily_summary');
    if (error) setErr(error.message); else { setErr(''); setMsg(`Sent: ₹${data.revenue} from ${data.delivered} deliveries yesterday — check the bell.`); }
  };

  const last24 = (errors || []).filter((x) => Date.now() - new Date(x.last_seen) < 86400000);
  const hits24 = last24.reduce((a, x) => a + x.count, 0);
  const webhookAge = health.webhook ? (Date.now() - new Date(health.webhook)) / 3600000 : null;
  const webhookTone = !health.webhook ? 'tone-warn' : webhookAge > 72 ? 'tone-warn' : 'tone-good';

  return (
    <div className="an">
      <div className="an-head"><div><h2>System health</h2><p className="ops-muted">Errors people hit in the app, and signs that payments and notifications are flowing. Refreshes every 30 seconds.</p></div>
        <div className="an-tools"><button className="ops-btn" onClick={sendSummary}><Send size={14} /> Send me yesterday’s summary</button></div></div>
      {err && <div className="ops-error" style={{ margin: '0 0 1rem' }}>{err}</div>}
      {msg && <div className="ops-ok-bar" onClick={() => setMsg('')}>{msg}</div>}

      <div className="kpi-grid">
        <div className={`kpi ${last24.length ? 'tone-bad' : 'tone-good'}`}><div className="kpi-top"><span className="kpi-ic"><Bug size={16} /></span><span className="kpi-l">App errors (24 h)</span></div><div className="kpi-v">{last24.length}</div><div className="kpi-foot"><small>{hits24} occurrences · {(errors || []).length} unresolved in total</small></div></div>
        <div className={`kpi ${webhookTone}`}><div className="kpi-top"><span className="kpi-ic"><Webhook size={16} /></span><span className="kpi-l">Last Razorpay webhook</span></div><div className="kpi-v" style={{ fontSize: '1.3rem' }}>{since(health.webhook)}</div><div className="kpi-foot"><small>{health.webhook ? dt(health.webhook) : 'none yet — add the webhook in Razorpay'}</small></div></div>
        <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><CreditCard size={16} /></span><span className="kpi-l">Last payment recorded</span></div><div className="kpi-v" style={{ fontSize: '1.3rem' }}>{since(health.payment)}</div><div className="kpi-foot"><small>{health.failedRefunds ? `${health.failedRefunds} failed refunds to retry` : 'no failed refunds'}</small></div></div>
        <div className={`kpi ${health.alerts ? 'tone-brand' : ''}`}><div className="kpi-top"><span className="kpi-ic"><BellRing size={16} /></span><span className="kpi-l">Open ops alerts</span></div><div className="kpi-v">{health.alerts ?? '—'}</div><div className="kpi-foot"><small>shown on the Orders screen</small></div></div>
      </div>

      <section className="panel flush">
        {errors == null ? <div className="sk" style={{ height: 160 }} /> : errors.length === 0 ? <div className="ch-empty"><CheckCircle2 size={22} /><br />No unresolved errors. Nice.</div> : (
          <div className="tbl-wrap tall"><table className="tbl hover">
            <thead><tr><th style={{ width: 28 }} /><th>Error</th><th>Where</th><th className="r">Times</th><th>Last seen</th><th /></tr></thead>
            <tbody>{errors.map((x) => (
              <React.Fragment key={x.id}>
                <tr onClick={() => setOpen(open === x.id ? null : x.id)}>
                  <td>{open === x.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td><b>{x.message.slice(0, 110)}</b><br /><small>{x.role || 'visitor'}</small></td>
                  <td><small className="mono">{x.url || '—'}</small></td>
                  <td className="r"><span className="pill bad">{x.count}</span></td>
                  <td><small>{dt(x.last_seen)}</small></td>
                  <td className="r"><button className="ops-btn" onClick={(e) => { e.stopPropagation(); resolve(x.id); }}>Resolve</button></td>
                </tr>
                {open === x.id && <tr className="audit-row"><td /><td colSpan="5"><pre className="pt-notes" style={{ background: '#f8fafc', borderColor: '#e5e7eb', maxHeight: 220, overflow: 'auto' }}>{x.stack || 'No stack trace'}{x.user_agent ? `\n\n${x.user_agent}` : ''}</pre></td></tr>}
              </React.Fragment>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
};
