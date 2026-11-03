import { useCallback, useEffect, useRef, useState } from 'react';
import { reverseGeocode } from '../lib/geo';

const KEY = 'poshak_last_location';

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};

// status: 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable' | 'error'
export const useGeolocation = () => {
  const saved = useRef(readSaved()).current;
  const [status, setStatus] = useState(saved ? 'granted' : 'idle');
  const [coords, setCoords] = useState(saved ? { lat: saved.lat, lng: saved.lng, accuracy: saved.accuracy } : null);
  const [place, setPlace] = useState(saved?.place || null);
  const [error, setError] = useState('');
  const inflight = useRef(0);

  const persist = (c, p) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...c, place: p, at: Date.now() }));
    } catch {
      // storage unavailable — location still works for this session
    }
  };

  // Ask the browser for a fresh GPS fix, then resolve it to a street address.
  // Resolves with { coords, place } so callers can chain (e.g. open the confirm-pin step).
  const detect = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        setStatus('unavailable');
        setError('This browser does not support location access.');
        reject(new Error('unsupported'));
        return;
      }
      const token = ++inflight.current;
      setStatus('locating');
      setError('');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          if (token !== inflight.current) return;
          setCoords(c);
          setStatus('granted');
          let p = null;
          try {
            p = await reverseGeocode(c.lat, c.lng);
          } catch {
            // GPS worked but the address lookup failed — keep the coordinates.
          }
          if (token !== inflight.current) return;
          setPlace(p);
          persist(c, p);
          resolve({ coords: c, place: p });
        },
        (err) => {
          if (token !== inflight.current) return;
          if (err.code === err.PERMISSION_DENIED) {
            setStatus('denied');
            setError('Location permission is blocked. Allow it in your browser’s site settings, or search for your address instead.');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setStatus('error');
            setError('Your device could not determine a position. Check GPS / Wi-Fi and try again.');
          } else {
            setStatus('error');
            setError('Locating you took too long. Try again or search your address.');
          }
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  }, []);

  // Keep the UI honest if the user flips the permission in browser settings.
  useEffect(() => {
    let perm;
    const onChange = () => {
      if (perm?.state === 'denied') setStatus('denied');
    };
    navigator.permissions?.query({ name: 'geolocation' }).then((p) => {
      perm = p;
      if (p.state === 'denied' && !coords) setStatus('denied');
      p.addEventListener('change', onChange);
    }).catch(() => {});
    return () => perm?.removeEventListener?.('change', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, coords, place, error, detect };
};
