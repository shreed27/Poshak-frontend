import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, LocateFixed, MapPin, Loader2, Check, Home, Briefcase, Map as MapIcon, AlertCircle, Trash2 } from 'lucide-react';
import { reverseGeocode, searchPlaces } from '../../lib/geo';
import { SERVICE_AREA, isServiceable, distanceFromAreaKm } from '../../lib/serviceArea';
import { L, createMap, pickerIcon } from './mapKit';

const LABELS = [
  { id: 'Home', Icon: Home },
  { id: 'Work', Icon: Briefcase },
  { id: 'Other', Icon: MapIcon }
];

// Draggable-pin map. Reports every settled position via onMove.
const PinMap = ({ point, accuracy, onMove }) => {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    const map = createMap(elRef.current, point, 16);
    L.circle([SERVICE_AREA.center.lat, SERVICE_AREA.center.lng], {
      radius: SERVICE_AREA.radiusKm * 1000, color: '#fa5929', weight: 2, dashArray: '6 6', fillColor: '#fa5929', fillOpacity: 0.06, interactive: false
    }).addTo(map);
    const marker = L.marker([point.lat, point.lng], { icon: pickerIcon(), draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      onMoveRef.current({ lat: p.lat, lng: p.lng });
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onMoveRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapRef.current = map;
    markerRef.current = marker;
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External moves (search result / re-detect) re-centre the map.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - point.lat) > 1e-7 || Math.abs(cur.lng - point.lng) > 1e-7) {
      marker.setLatLng([point.lat, point.lng]);
      map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
    }
  }, [point.lat, point.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    circleRef.current?.remove();
    circleRef.current = null;
    if (accuracy && accuracy < 1500) {
      circleRef.current = L.circle([point.lat, point.lng], {
        radius: accuracy, color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12
      }).addTo(map);
    }
  }, [accuracy, point.lat, point.lng]);

  return <div ref={elRef} className="psk-pinmap" />;
};

export const LocationPickerModal = ({
  isOpen,
  onClose,
  geo,                 // useGeolocation() result
  addresses,
  activeAddress,
  onSelectAddress,
  onSaveAddress,       // (addr) => void
  onDeleteAddress,
  required = false,    // true when the app cannot continue without an address
  startWithDetect = false
}) => {
  const [step, setStep] = useState('choose');            // 'choose' | 'confirm'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const [outside, setOutside] = useState(null);           // GPS fix that is outside the service area
  const [point, setPoint] = useState(null);              // { lat, lng, accuracy? }
  const [resolved, setResolved] = useState(null);        // reverse-geocoded place
  const [resolving, setResolving] = useState(false);
  const [label, setLabel] = useState('Home');
  const [flat, setFlat] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const detectStarted = useRef(false);
  const moveToken = useRef(0);

  const fill = (p) => {
    setResolved(p);
    setStreetArea(p?.streetArea || '');
    setCity(p?.city || '');
    setPincode(p?.pincode || '');
  };

  const goConfirm = async (pt, known) => {
    setPoint(pt);
    setStep('confirm');
    if (known) { fill(known); return; }
    setResolving(true);
    try { fill(await reverseGeocode(pt.lat, pt.lng)); } catch { fill(null); }
    setResolving(false);
  };

  const handleUseCurrent = async () => {
    try {
      setOutside(null);
      const { coords, place } = await geo.detect();
      if (!isServiceable(coords)) {
        // Don't drop a pin in another city; explain and let them pick a spot inside the area.
        setOutside({ km: distanceFromAreaKm(coords), place });
        setStep('choose');
        return;
      }
      goConfirm({ lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy }, place);
    } catch {
      // error text is shown from geo.error
    }
  };

  // Debounced forward geocoding.
  useEffect(() => {
    if (query.trim().length < 3) { setResults([]); setSearchErr(''); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchErr('');
      try {
        setResults(await searchPlaces(query.trim(), SERVICE_AREA.center, ctrl.signal));
      } catch (e) {
        if (e.name !== 'AbortError') setSearchErr('Search is unavailable right now. Check your connection.');
      }
      setSearching(false);
    }, 550);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  // Auto-start detection the first time a gate opens.
  useEffect(() => {
    if (isOpen && startWithDetect && !detectStarted.current && geo.status !== 'denied') {
      detectStarted.current = true;
      handleUseCurrent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, startWithDetect]);

  useEffect(() => {
    if (!isOpen) { setStep('choose'); setQuery(''); setResults([]); setFlat(''); setLandmark(''); setPhone(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePinMoved = async (pt) => {
    const token = ++moveToken.current;
    setPoint(pt);
    setResolving(true);
    try {
      const p = await reverseGeocode(pt.lat, pt.lng);
      if (token === moveToken.current) fill(p);
    } catch {
      if (token === moveToken.current) fill(null);
    }
    if (token === moveToken.current) setResolving(false);
  };

  const inArea = point ? isServiceable(point) : true;
  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const canSave = point && inArea && phoneOk && flat.trim() && streetArea.trim() && !resolving;

  const handleSave = (e) => {
    e.preventDefault();
    if (!canSave) return;
    onSaveAddress({
      id: `addr-${Date.now()}`,
      label,
      isDefault: false,
      flatBuilding: flat.trim(),
      streetArea: streetArea.trim(),
      landmark: landmark.trim(),
      phone,
      city: city.trim() || 'Your city',
      pincode: pincode.trim(),
      lat: point.lat,
      lng: point.lng
    });
    onClose();
  };

  const permissionBlocked = geo.status === 'denied';

  return (
    <div className="swiggy-cart-modal-backdrop" onClick={required ? undefined : onClose} style={{ justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <motion.div
        className="psk-loc-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.2 }}
      >
        <div className="psk-loc-head">
          <h3>{step === 'confirm' ? 'Confirm pickup location' : required ? 'Where should we pick up from?' : 'Select pickup location'}</h3>
          {!required && (
            <button className="psk-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
          )}
        </div>

        {step === 'choose' && (
          <div className="psk-loc-body">
            <div className="psk-area-chip"><MapPin size={14} /> We currently pick up in <b>{SERVICE_AREA.name}</b> only</div>

            <div className="psk-search">
              <Search size={16} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search area, street or landmark"
              />
              {searching && <Loader2 size={16} className="psk-spin" />}
            </div>

            <button className="psk-current-btn" onClick={handleUseCurrent} disabled={geo.status === 'locating'}>
              {geo.status === 'locating' ? <Loader2 size={18} className="psk-spin" /> : <LocateFixed size={18} />}
              <div>
                <strong>{geo.status === 'locating' ? 'Finding your location…' : 'Use my current location'}</strong>
                <span>{geo.place?.streetArea ? `Last: ${geo.place.streetArea}` : 'Uses your device GPS'}</span>
              </div>
            </button>

            {outside && (
              <div className="psk-note psk-note-warn">
                <AlertCircle size={15} />
                <div>
                  You are about {outside.km.toFixed(1)} km from our service area ({SERVICE_AREA.short}).
                  We can’t pick up from where you are yet — choose a spot inside the area, such as a friend’s place or your hostel.
                  <div><button type="button" className="psk-link" style={{ marginTop: 6 }} onClick={() => goConfirm({ ...SERVICE_AREA.center })}>
                    Pick a location in {SERVICE_AREA.short}
                  </button></div>
                </div>
              </div>
            )}

            {(permissionBlocked || (geo.error && geo.status !== 'locating')) && (
              <div className="psk-note psk-note-warn">
                <AlertCircle size={15} />
                <span>{geo.error || 'Location permission is blocked. Allow it in browser site settings or search above.'}</span>
              </div>
            )}

            {searchErr && <div className="psk-note psk-note-warn"><AlertCircle size={15} /><span>{searchErr}</span></div>}

            {results.length > 0 && (
              <>
                <div className="psk-list-title">Search results</div>
                <div className="psk-list">
                  {results.map((r, i) => (
                    <button key={i} className="psk-row" onClick={() => goConfirm({ lat: r.lat, lng: r.lng }, r)}>
                      <MapPin size={16} />
                      <div>
                        <strong>{r.shortName}</strong>
                        <span>{r.displayName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {query.trim().length >= 3 && !searching && results.length === 0 && !searchErr && (
              <div className="psk-empty">No places found for “{query}”. Try a nearby landmark.</div>
            )}

            {addresses.length > 0 && (
              <>
                <div className="psk-list-title">Saved addresses</div>
                <div className="psk-list">
                  {addresses.map((a) => {
                    const active = activeAddress?.id === a.id;
                    return (
                      <div key={a.id} className={`psk-row psk-row-saved ${active ? 'active' : ''}`}>
                        <button className="psk-row-main" onClick={() => { onSelectAddress(a); onClose(); }}>
                          <MapPin size={16} />
                          <div>
                            <strong>{a.label}{a.isDefault ? ' · Default' : ''}</strong>
                            <span>{a.flatBuilding}, {a.streetArea}{a.city ? `, ${a.city}` : ''}</span>
                          </div>
                          {active && <Check size={17} color="#fa5929" />}
                        </button>
                        {onDeleteAddress && addresses.length > 1 && (
                          <button className="psk-icon-btn" title="Delete address" onClick={() => onDeleteAddress(a.id)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {step === 'confirm' && point && (
          <form className="psk-loc-body" onSubmit={handleSave}>
            <PinMap point={point} accuracy={point.accuracy} onMove={handlePinMoved} />
            <p className="psk-hint">Drag the pin or tap the map to fine-tune where the captain should arrive. Zoom out to see our service area (dashed circle).</p>
            {!inArea && (
              <div className="psk-note psk-note-warn">
                <AlertCircle size={15} />
                <span>Sorry, we don’t pick up here yet. Move the pin inside the dashed {SERVICE_AREA.short} area to continue.</span>
              </div>
            )}

            <div className="psk-resolved">
              <MapPin size={16} color="#fa5929" />
              <div>
                {resolving ? <span>Finding address…</span> : (
                  <>
                    <strong>{resolved?.shortName || 'Pinned location'}</strong>
                    <span>{resolved?.displayName || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}</span>
                  </>
                )}
              </div>
              <button type="button" className="psk-link" onClick={handleUseCurrent}>
                <LocateFixed size={13} /> Recenter
              </button>
            </div>

            <div className="psk-field">
              <label>Flat / House / Building *</label>
              <input value={flat} onChange={(e) => setFlat(e.target.value)} placeholder="e.g. Flat 304, Palm Grove" required />
            </div>
            <div className="psk-field">
              <label>Street / Area *</label>
              <input value={streetArea} onChange={(e) => setStreetArea(e.target.value)} placeholder="Street, locality" required />
            </div>
            <div className="psk-field-row">
              <div className="psk-field">
                <label>City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="psk-field">
                <label>Pincode</label>
                <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" />
              </div>
            </div>
            <div className="psk-field">
              <label>Mobile number * <span style={{ fontWeight: 400, color: '#9ca3af' }}>(your captain may call you)</span></label>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10-digit mobile number" required />
            </div>
            <div className="psk-field">
              <label>Landmark (optional)</label>
              <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near…" />
            </div>

            <div className="psk-chips">
              {LABELS.map(({ id, Icon }) => (
                <button type="button" key={id} className={`psk-chip ${label === id ? 'on' : ''}`} onClick={() => setLabel(id)}>
                  <Icon size={13} /> {id}
                </button>
              ))}
            </div>

            <div className="psk-actions">
              <button type="button" className="psk-btn-ghost" onClick={() => setStep('choose')}>Back</button>
              <button type="submit" className="psk-btn-primary" disabled={!canSave}>Save & use this address</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
