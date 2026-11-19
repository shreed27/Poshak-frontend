import React, { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { pointAlong } from '../../lib/geo';
import { useLiveRoute, remainingRoute } from '../../lib/tracking';
import { L, createMap, homeIcon, riderIcon } from './mapKit';
import { FreshChip, useNow } from './LiveEta';

// Where the captain is right now. Real orders use the captain's live GPS;
// demo orders are interpolated along the route.
export const riderPosition = (order, p) => {
  if (order.remote || order.pendingSave) return order.captainLocation || null;
  const route = order.route;
  if (!route || route.length < 2) return null;
  // Route runs captain start → customer. Both the pickup and the delivery ride end at the customer;
  // while the clothes are being cleaned the captain is away (back at the start).
  if (p.leg === 'pickup' || p.leg === 'delivery') return pointAlong(route, p.legProgress);
  return pointAlong(route, 0);
};

export const LiveTrackingMap = ({ order, progress, height = 260 }) => {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const riderRef = useRef(null);
  const animRef = useRef(0);
  const lastPos = useRef(null);
  const fitted = useRef(false);
  const routeLine = useRef(null);
  const userMoved = useRef(false);
  const [follow, setFollow] = useState(true);
  const now = useNow();
  const onLeg = order.remote && (order.dbStatus === 'captain_assigned' || order.dbStatus === 'out_for_delivery') && (order.assignment !== 'offered' || order.dbStatus === 'out_for_delivery');
  const live = order.remote ? order.captainLocation : null;
  const liveRoute = useLiveRoute(live, order.customerLocation, { enabled: onLeg && !!live });

  useEffect(() => {
    if (!order.customerLocation) return undefined;
    const c = order.customerLocation;
    const map = createMap(elRef.current, c, 15, { scrollWheelZoom: false });
    L.marker([c.lat, c.lng], { icon: homeIcon() }).addTo(map)
      .bindTooltip('Your pickup point', { direction: 'top', offset: [0, -34] });
    if (order.route?.length > 1) {
      const line = L.polyline(order.route, { color: '#fa5929', weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [40, 40] });
      fitted.current = true;
    }
    map.on('dragstart zoomstart', (e) => { if (e.originalEvent || e.type === 'dragstart') { userMoved.current = true; setFollow(false); } });
    mapRef.current = map;
    return () => {
      cancelAnimationFrame(animRef.current);
      map.remove();
      mapRef.current = null;
      riderRef.current = null;
      routeLine.current = null;
      lastPos.current = null;
      fitted.current = false;
      userMoved.current = false;
    };
  // Realtime refetches return a fresh route array each time; key on its size so the map isn't rebuilt per GPS ping.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.orderId, order.route?.length]);

  // Glide the captain between updates instead of teleporting.
  const pos = riderPosition(order, progress);
  const lat = pos?.lat;
  const lng = pos?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (lat == null || !map) return;
    if (!riderRef.current) {
      riderRef.current = L.marker([lat, lng], { icon: riderIcon(), zIndexOffset: 1000 }).addTo(map);
      lastPos.current = { lat, lng };
      if (!fitted.current && order.customerLocation) {
        map.fitBounds([[lat, lng], [order.customerLocation.lat, order.customerLocation.lng]], { padding: [50, 50], maxZoom: 16 });
        fitted.current = true;
      }
      return;
    }
    const marker = riderRef.current;
    const from = lastPos.current || { lat, lng };
    const t0 = performance.now();
    cancelAnimationFrame(animRef.current);
    const frame = (t) => {
      const k = Math.min(1, (t - t0) / 950);
      marker.setLatLng([from.lat + (lat - from.lat) * k, from.lng + (lng - from.lng) * k]);
      if (k < 1) animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
    lastPos.current = { lat, lng };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // Real orders: draw the road still ahead of the rider, and keep both of them in view until the customer pans the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !order.remote) return;
    if (routeLine.current) { routeLine.current.remove(); routeLine.current = null; }
    if (!onLeg || !live || !liveRoute?.points) return;
    const pts = remainingRoute(liveRoute.points, live);
    routeLine.current = L.polyline(pts, { color: '#fa5929', weight: 5, opacity: 0.85, dashArray: liveRoute.routed ? null : '6 8' }).addTo(map);
    if (!userMoved.current && order.customerLocation) {
      map.fitBounds([[live.lat, live.lng], [order.customerLocation.lat, order.customerLocation.lng]], { padding: [50, 50], maxZoom: 17, animate: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRoute, onLeg, live?.lat, live?.lng]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map || !live || !order.customerLocation) return;
    userMoved.current = false; setFollow(true);
    map.fitBounds([[live.lat, live.lng], [order.customerLocation.lat, order.customerLocation.lng]], { padding: [50, 50], maxZoom: 17, animate: true });
  };

  if (!order.customerLocation) {
    return <div className="psk-map-fallback" style={{ height }}>Live map unavailable for this order.</div>;
  }
  return (
    <div className="lv-mapwrap">
      <div ref={elRef} className="psk-trackmap" style={{ height }} />
      {onLeg && <div className="lv-overlay-tl"><FreshChip iso={order.captainUpdatedAt} now={now} offlineText="Waiting for location" /></div>}
      {onLeg && live && !follow && <button className="lv-recenter" onClick={recenter}><Crosshair size={13} /> Show rider & me</button>}
    </div>
  );
};
