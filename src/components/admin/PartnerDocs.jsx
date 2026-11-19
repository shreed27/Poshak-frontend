import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Upload, CheckCircle2, XCircle, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/photos';
import { dOnly } from '../../lib/csv';

export const DOC_KINDS = {
  licence: 'Driving licence', id_proof: 'ID proof', insurance: 'Vehicle insurance', vehicle_rc: 'Vehicle RC', trade_licence: 'Trade / shop licence',
  photo: 'Photo', agreement: 'Signed agreement', other: 'Other'
};
const KINDS_FOR = {
  captain: ['licence', 'id_proof', 'insurance', 'vehicle_rc', 'photo', 'agreement', 'other'],
  cleaner: ['trade_licence', 'id_proof', 'agreement', 'photo', 'other']
};
const STATUS = { pending: ['Pending review', 'warn'], verified: ['Verified', 'good'], rejected: ['Rejected', 'bad'] };
const MAX_PDF = 5 * 1024 * 1024;

const uploadDoc = async (email, kind, file) => {
  const key = email.toLowerCase();
  let blob = file, ext = 'jpg', type = 'image/jpeg';
  if (file.type === 'application/pdf') { if (file.size > MAX_PDF) throw new Error('PDF is over 5 MB'); ext = 'pdf'; type = 'application/pdf'; }
  else blob = await compressImage(file, 1800, 0.8);
  const path = `${key}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const { error } = await supabase.storage.from('partner-docs').upload(path, blob, { contentType: type });
  if (error) throw error;
  const { error: e2 } = await supabase.rpc('register_partner_doc', { p_email: key, p_kind: kind, p_path: path });
  if (e2) { await supabase.storage.from('partner-docs').remove([path]).catch(() => {}); throw e2; }
};

// Documents for one partner. Admin: upload on their behalf, verify / reject / delete. Partner: upload their own and see review status.
export const PartnerDocs = ({ email, role, admin = false, onChange }) => {
  const [docs, setDocs] = useState(null);
  const [urls, setUrls] = useState({});
  const [kind, setKind] = useState(KINDS_FOR[role]?.[0] || 'other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const file = useRef(null);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('partner_docs').select('*').ilike('email', email).order('created_at', { ascending: false });
    if (e) { setError(e.message); return; }
    setDocs(data || []);
    if ((data || []).length) {
      const { data: s } = await supabase.storage.from('partner-docs').createSignedUrls(data.map((d) => d.path), 3600);
      setUrls(Object.fromEntries((s || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])));
    }
  }, [email]);
  useEffect(() => { load(); }, [load]);

  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setError('');
    try { await uploadDoc(email, kind, f); await load(); onChange?.(); } catch (err) { setError(err.message || 'Upload failed'); }
    setBusy(false); if (file.current) file.current.value = '';
  };
  const review = async (d, status) => {
    const note = status === 'rejected' ? window.prompt('Why is it rejected? (the partner will see this)', '') : null;
    if (status === 'rejected' && note === null) return;
    const { error: e } = await supabase.rpc('admin_review_doc', { p_id: d.id, p_status: status, p_note: note });
    if (e) setError(e.message); else load();
  };
  const remove = async (d) => {
    if (!window.confirm('Delete this document?')) return;
    const { error: e } = await supabase.rpc('admin_delete_doc', { p_id: d.id });
    if (e) { setError(e.message); return; }
    await supabase.storage.from('partner-docs').remove([d.path]).catch(() => {});
    load();
  };

  return (
    <div className="pd">
      <div className="pd-up">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>{(KINDS_FOR[role] || ['other']).map((k) => <option key={k} value={k}>{DOC_KINDS[k]}</option>)}</select>
        <label className="ops-btn ops-btn-primary pd-btn"><Upload size={14} /> {busy ? 'Uploading…' : 'Upload photo / PDF'}
          <input ref={file} type="file" accept="image/*,application/pdf" capture={undefined} onChange={pick} disabled={busy} hidden />
        </label>
      </div>
      {error && <div className="ops-error" style={{ margin: '.6rem 0 0' }}>{error}</div>}
      {docs == null ? <div className="sk" style={{ height: 80, marginTop: '.8rem' }} /> : docs.length === 0 ? <p className="ops-muted" style={{ marginTop: '.8rem' }}>No documents uploaded yet.</p> : (
        <div className="pd-grid">
          {docs.map((d) => {
            const [sl, sc] = STATUS[d.status];
            const isPdf = d.path.endsWith('.pdf');
            return (
              <div key={d.id} className="pd-card">
                <a href={urls[d.path]} target="_blank" rel="noreferrer" className="pd-thumb">
                  {isPdf || !urls[d.path] ? <FileText size={30} /> : <img src={urls[d.path]} alt={DOC_KINDS[d.kind]} />}
                </a>
                <div className="pd-meta">
                  <b>{DOC_KINDS[d.kind]}</b>
                  <span className={`pill ${sc}`}>{d.status === 'verified' && <ShieldCheck size={10} />} {sl}</span>
                  <small>{dOnly(d.created_at)}{d.note ? ` · ${d.note}` : ''}</small>
                </div>
                {admin && (
                  <div className="pd-act">
                    {d.status !== 'verified' && <button className="ops-icon" title="Verify" onClick={() => review(d, 'verified')}><CheckCircle2 size={14} /></button>}
                    {d.status !== 'rejected' && <button className="ops-icon" title="Reject" onClick={() => review(d, 'rejected')}><XCircle size={14} /></button>}
                    <button className="ops-icon" title="Delete" onClick={() => remove(d)}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
