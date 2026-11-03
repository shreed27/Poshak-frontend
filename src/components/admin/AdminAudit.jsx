import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { downloadCsv, dt } from '../../lib/csv';

const OP_CLS = { insert: 'good', update: 'info', delete: 'bad' };
const show = (v) => (v == null ? '∅' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const isDiff = (v) => v && typeof v === 'object' && 'from' in v && 'to' in v;

const Details = ({ d }) => {
  if (!d || typeof d !== 'object') return <small>—</small>;
  const entries = Object.entries(d);
  return (
    <div className="audit-d">
      {entries.slice(0, 40).map(([k, v]) => (
        <div key={k}><code>{k}</code>{isDiff(v) ? <span><s>{show(v.from)}</s> → <b>{show(v.to)}</b></span> : <span>{show(v)}</span>}</div>
      ))}
    </div>
  );
};

export const AdminAudit = () => {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('all');
  const [op, setOp] = useState('all');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(1000);
    if (err) setError(err.message); else { setError(''); setRows(data || []); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const entities = useMemo(() => [...new Set((rows || []).map((r) => r.action.split('.')[0]))].sort(), [rows]);
  const shown = useMemo(() => (rows || []).filter((r) => {
    if (entity !== 'all' && !r.action.startsWith(entity + '.')) return false;
    if (op !== 'all' && !r.action.endsWith('.' + op)) return false;
    if (q) {
      const s = q.toLowerCase();
      return `${r.actor_email} ${r.action} ${r.target} ${JSON.stringify(r.details)}`.toLowerCase().includes(s);
    }
    return true;
  }), [rows, q, entity, op]);

  const exportCsv = () => downloadCsv('poshak-audit-log', shown, [
    ['When', (r) => r.created_at], ['Who', (r) => r.actor_email || 'system'], ['Role', (r) => r.actor_role], ['Action', (r) => r.action], ['Target', (r) => r.target], ['Details', (r) => JSON.stringify(r.details)]
  ]);

  return (
    <div className="an">
      <div className="an-head">
        <div><h2>Audit log</h2><p className="ops-muted"><ShieldCheck size={13} style={{ verticalAlign: '-2px' }} /> Append-only record of price, setting, team, wallet, payout, complaint and order changes. Nobody — including admins — can edit or delete entries.</p></div>
        <div className="an-tools">
          <div className="search"><Search size={14} /><input placeholder="Search who, what, order…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="sel" value={entity} onChange={(e) => setEntity(e.target.value)}><option value="all">Everything</option>{entities.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}</select>
          <select className="sel" value={op} onChange={(e) => setOp(e.target.value)}><option value="all">Any change</option><option value="insert">Created</option><option value="update">Updated</option><option value="delete">Deleted</option></select>
          <button className="ops-btn" onClick={exportCsv}><Download size={14} /> Export CSV</button>
        </div>
      </div>
      {error && <div className="ops-error" style={{ margin: '0 0 1rem' }}>{error}</div>}
      <section className="panel flush">
        {!rows ? <div className="sk" style={{ height: 240 }} /> : shown.length === 0 ? <div className="ch-empty">No entries match.</div> : (
          <div className="tbl-wrap tall">
            <table className="tbl hover">
              <thead><tr><th style={{ width: 28 }} /><th>When</th><th>Who</th><th>Action</th><th>Target</th></tr></thead>
              <tbody>
                {shown.map((r) => {
                  const [ent, o] = r.action.split('.');
                  const isOpen = open === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr onClick={() => setOpen(isOpen ? null : r.id)}>
                        <td>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td><small>{dt(r.created_at)}</small></td>
                        <td><b>{r.actor_email || 'system'}</b><br /><small>{r.actor_role}</small></td>
                        <td><span className={`pill ${OP_CLS[o] || ''}`}>{o}</span> {ent.replace(/_/g, ' ')}</td>
                        <td><small className="mono">{r.target || '—'}</small></td>
                      </tr>
                      {isOpen && <tr className="audit-row"><td /><td colSpan="4"><Details d={r.details} /></td></tr>}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="ops-muted" style={{ marginTop: '.6rem' }}>Showing the latest {Math.min(1000, rows?.length || 0)} entries.</p>
    </div>
  );
};
