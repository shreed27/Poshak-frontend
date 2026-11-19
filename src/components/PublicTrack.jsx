import React, { useCallback, useEffect, useState } from 'react';
import { PackageCheck, Shirt, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LiveEtaCard } from './main-app/LiveEta';
import { LiveTrackingMap } from './main-app/LiveTrackingMap';

// /#/track/<token> — what a friend or family member sees from a customer's share link.
// No sign-in, no personal data: status, rider's first name, live position, ETA, destination rounded to ~100 m.
const COPY = {
  placed: ['Order placed', 'A captain will be assigned shortly.', Clock],
  picked_up: ['Clothes picked up', 'On the way to be cleaned.', PackageCheck],
  cleaning: ['Being cleaned', 'Fresh and clean soon.', Shirt],
  ready: ['Cleaned and ready', 'The captain will head out for delivery soon.', Shirt],
  delivered: ['Delivered', 'The clothes have been handed over. Thanks for checking in!', CheckCircle2],
  cancelled: ['Order cancelled', 'This order was cancelled.', XCircle]
};

export const PublicTrack = ({ token }) => {
  const [data, setData] = useState(undefined);        // undefined = loading, null = invalid / revoked
  const load = useCallback(async () => {
    const { data: d, error } = await supabase.rpc('public_track', { p_token: token });
    setData(error ? null : d);
  }, [token]);
  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [load]);

  const wrap = (children) => (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontWeight: 800, fontSize: '1.6rem', margin: '.4rem 0 1rem' }}>Poshak<span style={{ color: '#fa5929' }}>.</span></div>
        {children}
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.74rem', marginTop: '1.2rem' }}>This link shows live status only — no personal details. It stops working once the order is done.</p>
      </div>
    </div>
  );

  if (data === undefined) return wrap(<div className="sk" style={{ height: 240, borderRadius: 20 }} />);
  if (data === null || data.ended && !data.rider) {
    return wrap(<div style={{ background: '#fff', borderRadius: 20, padding: '1.6rem', textAlign: 'center' }}><h3 style={{ margin: 0 }}>{data?.status === 'delivered' ? 'Delivered' : 'This tracking link isn’t active'}</h3><p style={{ color: '#6b7280', fontSize: '.9rem' }}>{data?.status === 'delivered' ? 'The order has been delivered.' : 'It may have been turned off or the order is finished.'}</p></div>);
  }

  const order = {
    remote: true, dbId: token, orderId: token.slice(0, 6), dbStatus: data.status, assignment: data.assignment,
    captainLocation: data.rider?.lat != null ? { lat: data.rider.lat, lng: data.rider.lng } : null,
    captainUpdatedAt: data.rider?.updated_at, customerLocation: { lat: Number(data.dest.lat), lng: Number(data.dest.lng) },
    eta: data.eta ? { minutes: data.eta.minutes, km: Number(data.eta.km), leg: data.eta.leg, updatedAt: data.eta.updated_at } : null,
    rider: data.rider ? { name: data.rider.first_name, vehicle: '', rating: '', phone: '' } : null
  };
  const onLeg = data.status === 'captain_assigned' || data.status === 'out_for_delivery';
  const [title, sub, Icon] = COPY[data.status] || [];

  return wrap(
    <>
      {onLeg ? (
        <>
          <h2 style={{ margin: '0 0 .2rem', fontSize: '1.15rem' }}>{data.status === 'out_for_delivery' ? 'Clothes are on the way back' : 'Captain is on the way to pick up'}</h2>
          <LiveEtaCard order={order} />
          <LiveTrackingMap order={order} progress={{ remote: true }} height={320} />
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.06)' }}>
          {Icon && <Icon size={34} color="#fa5929" />}
          <h2 style={{ margin: '.6rem 0 .2rem' }}>{title}</h2>
          <p style={{ color: '#6b7280', margin: 0 }}>{sub}</p>
        </div>
      )}
    </>
  );
};
