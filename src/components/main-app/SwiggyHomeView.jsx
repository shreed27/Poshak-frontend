import React from 'react';
import { Clock, Minus, Plus, Check, Trash2 } from 'lucide-react';
import { DEFAULT_PIECES, MAX_PIECES, estPrice, perPiece, clothesLabel } from '../../lib/estimate';
import { useT } from '../../i18n';
import { useCatalog } from '../../context/CatalogContext';
import { useSlots } from '../../hooks/useSlots';
import { getProgress, statusCopy } from '../../lib/orderEngine';
import { BRAND, telHref, supportPhone } from '../../lib/brand';

export { DEFAULT_PIECES } from '../../lib/estimate';

// − 10 + : roughly how many clothes. The number can also be typed. Going below 1 removes the service.
export const ClothesStepper = ({ n, onChange, outline = false }) => {
  const [draft, setDraft] = React.useState(null);
  const commit = (v) => { setDraft(null); const x = parseInt(v, 10); if (Number.isFinite(x)) onChange(Math.min(MAX_PIECES, Math.max(0, x))); };
  return (
    <div className={outline ? 'qc-ostep' : 'qc-step'} role="group" aria-label="Number of clothes">
      <button type="button" onClick={() => onChange(n - 1)} aria-label="One less">{outline && n <= 1 ? <Trash2 size={13} /> : <Minus size={14} strokeWidth={3} />}</button>
      <input
        aria-label="Number of clothes" inputMode="numeric" value={draft ?? n}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" onClick={() => onChange(Math.min(MAX_PIECES, n + 1))} disabled={n >= MAX_PIECES} aria-label="One more"><Plus size={14} strokeWidth={3} /></button>
    </div>
  );
};

export const SwiggyHomeView = ({ activeOrder, onNavigateToOrders, basket = {}, onSetPieces, onRequestQuote, now = Date.now() }) => {
  const { t } = useT();
  const { services, quoteServices, minCharge, support } = useCatalog();
  const days = useSlots();
  const next = days.flatMap((d) => d.slots).find((s) => !s.full);
  const live = activeOrder ? statusCopy(activeOrder, getProgress(activeOrder, now)) : null;

  return (
    <div className="qc-page">
      {/* Next pickup: what quick-commerce apps lead with ("delivery in 10 min") */}
      <section className="qc-eta">
        <div className="qc-eta-ic"><Clock size={20} strokeWidth={2.4} /></div>
        <div>
          <div className="qc-eta-k">Next pickup</div>
          <div className="qc-eta-v">{next ? `${next.day}, ${next.label}` : 'All slots are full'}</div>
        </div>
      </section>
      <div className="qc-perks">
        <span className="qc-perk"><Check size={13} strokeWidth={3} /> Free pickup & delivery</span>
        <span className="qc-perk"><Check size={13} strokeWidth={3} /> Weighed at your door</span>
        <span className="qc-perk"><Check size={13} strokeWidth={3} /> Pay after delivery</span>
      </div>

      {activeOrder && (
        <button type="button" className="qc-live" onClick={onNavigateToOrders}>
          <span className="qc-live-dot" />
          <div style={{ minWidth: 0 }}>
            <b>#{activeOrder.orderId} · {live.title}</b>
            <span>{live.sub}</span>
          </div>
          <em>{t('track.live')} ›</em>
        </button>
      )}

      <section className="qc-sec">
        <div className="qc-sec-head">
          <div>
            <h2 className="qc-h">Laundry</h2>
            <p className="qc-sub">Tell us roughly how many clothes. The rider weighs them at pickup and your final price is set then{minCharge ? ` (minimum order ₹${minCharge})` : ''}.</p>
          </div>
        </div>
        <ul className="qc-list">
          {services.map((svc) => {
            const n = basket[svc.id] || 0;
            return (
              <li key={svc.id} className="qc-item">
                <img className="qc-thumb" src={svc.image} alt="" loading="lazy" />
                <div style={{ minWidth: 0 }}>
                  <div className="qc-item-name">{svc.name}</div>
                  <div className="qc-item-meta">{svc.turnaround} · ₹{svc.unitPrice}/{svc.unit}, final price by weight</div>
                  <div className="qc-item-desc">{svc.desc}</div>
                  <div className="qc-item-price">≈ ₹{perPiece(svc.unitPrice)}<small> per piece</small></div>
                </div>
                <div className="qc-item-cta">
                  {n > 0
                    ? <ClothesStepper n={n} onChange={(v) => onSetPieces(svc.id, v)} />
                    : <button type="button" className="qc-add" onClick={() => onSetPieces(svc.id, DEFAULT_PIECES)}>ADD</button>}
                  <span className="qc-est">{n > 0 ? `${clothesLabel(n)} · ≈ ₹${estPrice(n, svc.unitPrice)}` : ' '}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {quoteServices.length > 0 && (
        <section className="qc-sec">
          <div className="qc-sec-head">
            <div>
              <h2 className="qc-h">Dry cleaning & alterations</h2>
              <p className="qc-sub">Priced per item. Tell us what you need and we send you a price before pickup.</p>
            </div>
          </div>
          <ul className="qc-list">
            {quoteServices.map((svc) => (
              <li key={svc.id} className="qc-item">
                <img className="qc-thumb" src={svc.image} alt="" loading="lazy" />
                <div style={{ minWidth: 0 }}>
                  <div className="qc-item-name">{svc.name}</div>
                  <div className="qc-item-meta">{svc.turnaround}</div>
                  <div className="qc-item-desc">{svc.desc}</div>
                  <div className="qc-item-price">Price on request</div>
                </div>
                <div className="qc-item-cta">
                  <button type="button" className="qc-add quote" onClick={onRequestQuote}>Get quote</button>
                  <span className="qc-est">Free to ask</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="qc-sec">
        <h2 className="qc-h" style={{ marginBottom: 10 }}>How it works</h2>
        <div className="qc-steps">
          <div className="qc-stepc"><b><i>1</i> Book a slot</b><p>Add services and roughly how many clothes, pick a pickup window and place the order.</p></div>
          <div className="qc-stepc"><b><i>2</i> We weigh at your door</b><p>The rider weighs your clothes in front of you. Your final price updates in the app right away.</p></div>
          <div className="qc-stepc"><b><i>3</i> Delivered back</b><p>Cleaned and returned to your door. Pay by UPI or cash on delivery.</p></div>
        </div>
        <div className="qc-help">
          <span>Questions about an order?</span>
          <a href={telHref(supportPhone(support))}>Call {supportPhone(support) || BRAND.phone}</a>
        </div>
      </section>
    </div>
  );
};
