import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, LocateFixed, MapPin, Loader2, Check, Home, Briefcase, Map as MapIcon, AlertCircle, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import { reverseGeocode, searchPlaces } from '../../lib/geo';
import { SERVICE_AREA, isServiceable, distanceFromAreaKm } from '../../lib/serviceArea';
import { L, createMap, pickerIcon } from './mapKit';
import { useEscape } from '../../lib/useEscape';

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
  useEscape(isOpen, onClose);
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
  const [touched, setTouched] = useState({});
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
    if (!isOpen) { setStep('choose'); setQuery(''); setResults([]); setFlat(''); setLandmark(''); setPhone(''); setTouched({}); }
    else setPhone((p) => p || addresses.find((a) => a.phone)?.phone || '');      // returning customers don't retype their number
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));
  const issues = [
    !point && 'pick a spot on the map',
    point && !inArea && 'move the pin inside our service area',
    !flat.trim() && 'add your flat / house',
    !streetArea.trim() && 'add the street / area',
    !phoneOk && 'enter your 10-digit mobile number'
  ].filter(Boolean);
  const phoneMsg = phone && !phoneOk ? (phone.length < 10 ? `${10 - phone.length} more digit${10 - phone.length === 1 ? '' : 's'} needed` : 'Indian mobile numbers start with 6, 7, 8 or 9') : (touched.phone && !phone ? 'Your captain needs a number to reach you' : '');
  const first = addresses.length === 0;

  return (
    <div className="lp-backdrop" onClick={onClose}>
      <motion.div
        className="lp-sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        role="dialog"
        aria-modal="true"
        aria-label="Pickup location"
      >
        <div className="lp-grab" />
        <header className="lp-head">
          {step === 'confirm' && <button type="button" className="lp-round" onClick={() => setStep('choose')} aria-label="Back"><ArrowLeft size={18} /></button>}
          <div className="lp-title">
            <h3>{step === 'confirm' ? 'Confirm your address' : first ? 'Set your pickup location' : 'Select pickup location'}</h3>
            <p>{step === 'confirm' ? 'Add the details your captain needs to find you.' : 'We pick up and deliver your clothes right at your door.'}</p>
          </div>
          <button type="button" className="lp-round" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        {step === 'choose' && (
          <div className="lp-body">
            <div className="lp-search">
              <Search size={18} />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search area, street or landmark" />
              {searching ? <Loader2 size={17} className="psk-spin" /> : query && <button type="button" className="lp-clear" onClick={() => setQuery('')} aria-label="Clear"><X size={14} /></button>}
            </div>

            <button type="button" className="lp-current" onClick={handleUseCurrent} disabled={geo.status === 'locating'}>
              <span className="lp-ic">{geo.status === 'locating' ? <Loader2 size={20} className="psk-spin" /> : <LocateFixed size={20} />}</span>
              <span className="lp-txt">
                <strong>{geo.status === 'locating' ? 'Finding your location…' : 'Use my current location'}</strong>
                <small>{geo.place?.streetArea ? `Last: ${geo.place.streetArea}` : 'Uses your phone’s GPS'}</small>
              </span>
              <ChevronRight size={18} />
            </button>

            {outside && (
              <div className="lp-note warn">
                <AlertCircle size={16} />
                <div>
                  You’re about <b>{outside.km.toFixed(1)} km</b> from our service area ({SERVICE_AREA.short}), so we can’t pick up from where you are yet.
                  Choose a spot inside the area, like a friend’s place or your hostel.
                  <button type="button" className="lp-link" onClick={() => goConfirm({ ...SERVICE_AREA.center })}>Pick a spot in {SERVICE_AREA.short}</button>
                </div>
              </div>
            )}
            {(permissionBlocked || (geo.error && geo.status !== 'locating')) && (
              <div className="lp-note warn"><AlertCircle size={16} /><span>{geo.error || 'Location permission is blocked. Allow it in your browser’s site settings, or search for your address above.'}</span></div>
            )}
            {searchErr && <div className="lp-note warn"><AlertCircle size={16} /><span>{searchErr}</span></div>}

            {results.length > 0 && (
              <section>
                <h4 className="lp-sec">Search results</h4>
                <div className="lp-list">
                  {results.map((r, i) => (
                    <button type="button" key={i} className="lp-row" onClick={() => goConfirm({ lat: r.lat, lng: r.lng }, r)}>
                      <span className="lp-ic sm"><MapPin size={16} /></span>
                      <span className="lp-txt"><strong>{r.shortName}</strong><small>{r.displayName}</small></span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {query.trim().length >= 3 && !searching && results.length === 0 && !searchErr && <div className="lp-empty">No places found for “{query}”. Try a nearby landmark.</div>}

            {addresses.length > 0 && (
              <section>
                <h4 className="lp-sec">Saved addresses</h4>
                <div className="lp-list">
                  {addresses.map((a) => {
                    const active = activeAddress?.id === a.id;
                    const Ic = (LABELS.find((l) => l.id === a.label) || LABELS[2]).Icon;
                    return (
                      <div key={a.id} className={`lp-row saved ${active ? 'on' : ''}`}>
                        <button type="button" className="lp-row-main" onClick={() => { onSelectAddress(a); onClose(); }}>
                          <span className="lp-ic sm"><Ic size={16} /></span>
                          <span className="lp-txt"><strong>{a.label}{a.isDefault ? ' · Default' : ''}</strong><small>{a.flatBuilding}, {a.streetArea}{a.city ? `, ${a.city}` : ''}</small></span>
                          {active && <Check size={18} color="#fa5929" />}
                        </button>
                        {onDeleteAddress && addresses.length > 1 && <button type="button" className="lp-del" title="Delete address" onClick={() => onDeleteAddress(a.id)}><Trash2 size={15} /></button>}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <p className="lp-area"><MapPin size={13} /> Currently serving <b>{SERVICE_AREA.name}</b></p>
          </div>
        )}

        {step === 'confirm' && point && (
          <form className="lp-form" onSubmit={handleSave} noValidate>
            <div className="lp-scroll">
              <div className="lp-mapcard">
                <PinMap point={point} accuracy={point.accuracy} onMove={handlePinMoved} />
                <button type="button" className="lp-recenter" onClick={handleUseCurrent}><LocateFixed size={14} /> Recenter</button>
                <span className="lp-maptip">Drag the pin to fine-tune</span>
              </div>

              <div className="lp-place">
                <span className="lp-ic sm"><MapPin size={16} /></span>
                <div className="lp-txt">
                  {resolving ? <strong>Finding address…</strong> : (<><strong>{resolved?.shortName || 'Pinned location'}</strong><small>{resolved?.displayName || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}</small></>)}
                </div>
                <button type="button" className="lp-link" onClick={() => setStep('choose')}>Change</button>
              </div>

              {!inArea && <div className="lp-note warn"><AlertCircle size={16} /><span>Sorry, we don’t pick up here yet. Move the pin inside the dashed {SERVICE_AREA.short} area to continue.</span></div>}

              <h4 className="lp-sec">Address details</h4>
              <div className="lp-grid">
                <label className={`lp-field full ${touched.flat && !flat.trim() ? 'err' : ''}`}>
                  <span>Flat / House / Building <i>*</i></span>
                  <input value={flat} onChange={(e) => setFlat(e.target.value)} onBlur={() => touch('flat')} placeholder="e.g. Flat 304, Palm Grove Apartments" autoComplete="address-line1" />
                  {touched.flat && !flat.trim() && <em>Required so your captain can find the door</em>}
                </label>
                <label className={`lp-field full ${touched.street && !streetArea.trim() ? 'err' : ''}`}>
                  <span>Street / Area <i>*</i></span>
                  <input value={streetArea} onChange={(e) => setStreetArea(e.target.value)} onBlur={() => touch('street')} placeholder="Street, locality" autoComplete="address-line2" />
                  {touched.street && !streetArea.trim() && <em>Required</em>}
                </label>
                <label className="lp-field"><span>City</span><input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" /></label>
                <label className="lp-field"><span>Pincode</span><input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="postal-code" /></label>
                <label className={`lp-field full ${phoneMsg ? 'err' : ''}`}>
                  <span>Mobile number <i>*</i> <small>your captain may call you</small></span>
                  <div className="lp-phone"><b>+91</b><input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={() => touch('phone')} inputMode="numeric" placeholder="98765 43210" autoComplete="tel-national" /></div>
                  {phoneMsg && <em>{phoneMsg}</em>}
                </label>
                <label className="lp-field full"><span>Landmark <small>optional</small></span><input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near…" /></label>
              </div>

              <h4 className="lp-sec">Save as</h4>
              <div className="lp-labels">
                {LABELS.map(({ id, Icon }) => (
                  <button type="button" key={id} className={label === id ? 'on' : ''} onClick={() => setLabel(id)}><Icon size={15} /> {id}</button>
                ))}
              </div>
            </div>

            <footer className="lp-foot">
              {!canSave && !resolving && issues.length > 0 && <p className="lp-issue"><AlertCircle size={13} /> To continue, {issues.join(', ')}.</p>}
              <button type="submit" className="lp-save" disabled={!canSave}>{resolving ? 'Finding address…' : 'Save & continue'}</button>
            </footer>
          </form>
        )}
      </motion.div>
    </div>
  );
};
