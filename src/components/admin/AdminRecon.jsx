import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { inr, inr2, dt } from '../../lib/csv';

// Does Razorpay's list of captured payments match what our database recorded?
export const AdminRecon = () => {
  const [runs, setRuns] = useState(null);
  const [busy, setBusy] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('reconciliation_runs').select('*').order('created_at', { ascending: false }).limit(30);
    if (e) { setError(e.message); return; }
    setError(''); setRuns(data || []); if (data?.length && open == null) setOpen(data[0].id);
  }, [open]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (days) => {
    setBusy(days); setError(''); setMsg('');
    const { data, error: e } = await supabase.functions.invoke('reconcile-payments', { body: { days } });
    setBusy(0);
    if (e) { let m = e.message; try { m = (await e.context.json()).error || m; } catch { /* generic */ } setError(m); return; }
    setMsg(`Checked ${data.gateway_payments} Razorpay payments${data.truncated ? ' (first 3,000 only)' : ''}.`);
    setOpen(data.id); load();
  };

  return (
    <div>
      <div className="an-head" style={{ marginBottom: '.8rem' }}>
        <div><h3 style={{ margin: 0 }}>Payment reconciliation</h3><p className="ops-muted" style={{ margin: '.2rem 0 0', maxWidth: '62ch' }}>Compares every payment Razorpay captured with what Poshak recorded. Run it daily. Anything “missing in Poshak” is money you received that no order knows about.</p></div>
        <div className="an-tools">
          {[[1, 'Last 24 h'], [7, 'Last 7 days'], [30, 'Last 30 days']].map(([d, l]) => <button key={d} className="ops-btn" disabled={!!busy} onClick={() => run(d)}><RefreshCw size={13} className={busy === d ? 'spin' : ''} /> {l}</button>)}
        </div>
      </div>
      {error && <div className="ops-error" style={{ margin: '0 0 .8rem' }}>{error}{/not found|404|Failed to send/i.test(error) ? ' — deploy the reconcile-payments function first (see docs/LAUNCH.md).' : ''}</div>}
      {msg && <div className="ops-ok-bar" style={{ margin: '0 0 .8rem' }}>{msg}</div>}
      <section className="panel flush">
        {runs == null ? <div className="sk" style={{ height: 120 }} /> : runs.length === 0 ? <div className="ch-empty">No reconciliation has been run yet. Click “Last 24 h”.</div> : (
          <div className="tbl-wrap tall"><table className="tbl hover">
            <thead><tr><th>Run</th><th>Period</th><th className="r">Razorpay</th><th className="r">Poshak</th><th>Result</th></tr></thead>
            <tbody>{runs.map((r) => (
              <React.Fragment key={r.id}>
                <tr onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <td><small>{dt(r.created_at)}</small></td><td><small>{dt(r.from_ts)} → {dt(r.to_ts)}</small></td>
                  <td className="r"><b>{inr(r.gateway_total)}</b><br /><small>{r.gateway_count} payments</small></td><td className="r"><b>{inr(r.db_total)}</b><br /><small>{r.db_count} payments</small></td>
                  <td>{r.ok ? <span className="pill good"><CheckCircle2 size={11} /> Matches</span> : <span className="pill bad"><AlertTriangle size={11} /> {r.missing_in_db.length + r.missing_at_gateway.length + r.amount_mismatch.length} differences</span>}</td>
                </tr>
                {open === r.id && !r.ok && (
                  <tr className="audit-row"><td /><td colSpan="4">
                    {r.missing_in_db.length > 0 && <><b>Missing in Poshak</b> <small>(Razorpay captured it; no order recorded it — check the webhook and apply it manually)</small><div className="audit-d">{r.missing_in_db.map((x) => <div key={x.id}><code>{x.id}</code><span>{inr2(x.amount)}</span></div>)}</div></>}
                    {r.missing_at_gateway.length > 0 && <><b style={{ display: 'block', marginTop: '.6rem' }}>Recorded by Poshak but not at Razorpay</b><div className="audit-d">{r.missing_at_gateway.map((x) => <div key={x.id}><code>{x.id}</code><span>{inr2(x.amount)} · {x.source} {x.ref}</span></div>)}</div></>}
                    {r.amount_mismatch.length > 0 && <><b style={{ display: 'block', marginTop: '.6rem' }}>Amounts differ</b><div className="audit-d">{r.amount_mismatch.map((x) => <div key={x.id}><code>{x.id}</code><span>Razorpay {inr2(x.gateway)} · Poshak {inr2(x.ours)}</span></div>)}</div></>}
                  </td></tr>
                )}
              </React.Fragment>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
};
