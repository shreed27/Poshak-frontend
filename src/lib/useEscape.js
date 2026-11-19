import { useEffect, useRef } from 'react';

// Close a sheet or modal with the Escape key, like every other app.
export const useEscape = (active, onClose) => {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') cb.current?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
};
