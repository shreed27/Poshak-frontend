import React, { useEffect, useRef, useState } from 'react';
import { Phone, Navigation, Hourglass, Radio, AlertTriangle, PartyPopper } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import { useLiveRoute, trackingSettings, tuneMinutes, freshness, agoText, fmtMin, kmText, arrivalClock } from '../../lib/tracking';
import { haversineKm } from '../../lib/geo';
import { useT } from '../../i18n';
import './LiveTracking.css';

// Re-render every few seconds so "Updated 40 s ago" stays honest without refetching anything.
export const useNow = (ms = 5000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
};

export const FreshChip = ({ iso, now, offlineText }) => {
  const { t } = useT();
  const f = freshness(iso, now);
  if (f.state === 'none') return <span className="lv-chip none"><Radio size={11} /> {offlineText || t('chip.none')}</span>;
  if (f.state === 'live') return <span className="lv-chip live"><i /> {t('chip.live')}</span>;
  return <span className={`lv-chip ${f.state}`}><AlertTriangle size={11} /> {t('chip.updated', { ago: agoText(f.secs) })}</span>;
};

// The Swiggy-style banner: "Arriving in 7 min · 2.1 km away" with a moving progress bar.
export const LiveEtaCard = ({ order }) => {
  const { t } = useT();
  const { settings } = useCatalog();
  const now = useNow();
  const status = order.dbStatus;
  const onLeg = order.remote && (status === 'captain_assigned' || status === 'out_for_delivery');
  const accepted = order.assignment !== 'offered' || status === 'out_for_delivery';
  const pos = order.captainLocation;
  const fresh = freshness(order.captainUpdatedAt, now);
  const route = useLiveRoute(pos, order.customerLocation, { enabled: onLeg && accepted && !!pos && fresh.state !== 'stale' });
  const startKm = useRef({ key: '', km: 0 });

  if (!onLeg) return null;
  const name = order.rider?.name?.split(' ')[0] || t('captain');
  const leg = status === 'out_for_delivery' ? 'delivery' : 'pickup';

  if (!accepted) {
    return (
      <div className="lv-card wait">
        <div className="lv-icon"><Hourglass size={22} /></div>
        <div className="lv-text"><h4>{t('eta.wait.title', { name })}</h4><p>{t('eta.wait.text')}</p></div>
      </div>
    );
  }

  // Best ETA: the rider’s phone (road-routed) when fresh, else our own route from their last known position.
  const dbAgeSec = order.eta?.updatedAt ? (now - new Date(order.eta.updatedAt).getTime()) / 1000 : Infinity;
  let minutes = null, km = null;
  if (order.eta && dbAgeSec < 90) { minutes = order.eta.minutes; km = order.eta.km; }
  else if (route?.routed) { minutes = tuneMinutes(route.minutes, trackingSettings(settings)); km = route.km; }
  else if (order.eta) { minutes = order.eta.minutes; km = order.eta.km; }
  if (pos && order.customerLocation && km == null) km = haversineKm(pos, order.customerLocation) * 1.35;

  if (minutes == null) {
    return (
      <div className="lv-card wait">
        <div className="lv-icon"><Navigation size={22} /></div>
        <div className="lv-text"><h4>{t('eta.accepted.title', { name })}</h4><p>{t('eta.accepted.text', { name })}</p></div>
      </div>
    );
  }

  const near = (km != null && km < 0.35) || minutes <= 2;
  const k = `${order.dbId}-${leg}`;
  if (startKm.current.key !== k) startKm.current = { key: k, km: km || 0 };
  if (km != null && km > startKm.current.km) startKm.current.km = km;
  const progress = startKm.current.km > 0.05 && km != null ? Math.max(4, Math.min(100, Math.round((1 - km / startKm.current.km) * 100))) : 8;
  const stale = fresh.state === 'stale' || fresh.state === 'delayed';

  return (
    <div className={`lv-card ${near ? 'near' : ''} ${stale ? 'stale' : ''}`}>
      <div className="lv-main">
        {near ? <div className="lv-eta near"><PartyPopper size={26} /></div> : <div className="lv-eta"><b>{minutes <= 1 ? '<1' : minutes}</b><span>{t('eta.min')}</span></div>}
        <div className="lv-text">
          <h4>{near ? t('eta.almost') : leg === 'pickup' ? t('eta.pickupTitle', { name }) : t('eta.deliveryTitle', { name })}</h4>
          <p>{near ? (leg === 'pickup' ? t('eta.otpPickup', { name }) : t('eta.otpDelivery')) : (km != null ? t('eta.away', { km: kmText(km), time: arrivalClock(minutes) }) : t('eta.arrivingBy', { time: arrivalClock(minutes) }))}</p>
        </div>
        <FreshChip iso={order.captainUpdatedAt} now={now} />
      </div>
      <div className="lv-bar"><i style={{ width: `${progress}%` }} /><span className="lv-bike" style={{ left: `${progress}%` }}>🛵</span></div>
      {stale && <p className="lv-warn"><AlertTriangle size={12} /> {t('eta.stale', { name, ago: fresh.secs ? agoText(fresh.secs) : '…' })}</p>}
      <div className="lv-rider">
        <span>{order.rider?.vehicle}{order.rider?.rating ? ` · ${order.rider.rating}` : ''}</span>
        {order.rider?.phone && <a className="lv-call" href={`tel:${order.rider.phone}`}><Phone size={13} /> {t('eta.call', { name })}</a>}
      </div>
    </div>
  );
};
