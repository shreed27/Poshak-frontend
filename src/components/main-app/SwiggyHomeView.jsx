import React from 'react';
import { Clock, Minus, Plus, Check, ChevronRight } from 'lucide-react';
import { useT } from '../../i18n';
import { useCatalog } from '../../context/CatalogContext';
import { useSlots } from '../../hooks/useSlots';
import { getProgress, statusCopy } from '../../lib/orderEngine';
import { BRAND, telHref, supportPhone } from '../../lib/brand';

export const DEFAULT_KG = 4;
export const MAX_KG = 30;

// − 4 kg + : the customer's rough weight for one service. Going below 1 kg removes it.
export const KgStepper = ({ kg, onChange }) => (
  <div className="qc-step" role="group" aria-label="Estimated weight">
    <button type="button" onClick={() => onChange(kg - 1)} aria-label="Less"><Minus size={14} strokeWidth={3} /></button>
    <span>{kg} kg</span>
    <button type="button" onClick={() => onChange(Math.min(MAX_KG, kg + 1))} disabled={kg >= MAX_KG} aria-label="More"><Plus size={14} strokeWidth={3} /></button>
  </div>
);

export const SwiggyHomeView = ({ activeOrder, onNavigateToOrders, basket = {}, onSetKg, onRequestQuote, now = Date.now() }) => {
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
            <h2 className="qc-h">Laundry by the kilo</h2>
            <p className="qc-sub">Add a rough weight. We weigh it at your door and bill the exact amount{minCharge ? ` (minimum ₹${minCharge})` : ''}.</p>
          </div>
        </div>
        <ul className="qc-list">
          {services.map((svc) => {
            const kg = basket[svc.id] || 0;
            return (
              <li key={svc.id} className="qc-item">
                <img className="qc-thumb" src={svc.image} alt="" loading="lazy" />
                <div style={{ minWidth: 0 }}>
                  <div className="qc-item-name">{svc.name}</div>
                  <div className="qc-item-meta">{svc.turnaround} · priced per {svc.unit}</div>
                  <div className="qc-item-desc">{svc.desc}</div>
                  <div className="qc-item-price">₹{svc.unitPrice}<small>/{svc.unit}</small></div>
                </div>
                <div className="qc-item-cta">
                  {kg > 0
                    ? <KgStepper kg={kg} onChange={(v) => onSetKg(svc.id, v)} />
                    : <button type="button" className="qc-add" onClick={() => onSetKg(svc.id, DEFAULT_KG)}>ADD</button>}
                  <span className="qc-est">{kg > 0 ? `≈ ₹${Math.round(kg * svc.unitPrice)}` : ' '}</span>
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
          <div className="qc-stepc"><b><i>1</i> Book a slot</b><p>Add services, pick a pickup window and place the order. No advance payment.</p></div>
          <div className="qc-stepc"><b><i>2</i> We weigh at your door</b><p>Our rider weighs the bag in front of you and confirms it with a pickup code.</p></div>
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
