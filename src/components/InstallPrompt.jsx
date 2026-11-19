import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

// "Install Poshak": a small bar on supported browsers (Android/desktop Chrome) and an instruction on iPhone Safari.
// Hidden once installed, and for a week after the person dismisses it.
export const InstallPrompt = ({ inline = false }) => {
  const [evt, setEvt] = useState(null);
  const [hidden, setHidden] = useState(() => { try { return Date.now() - Number(localStorage.getItem('poshak_install_dismissed') || 0) < 7 * 86400000; } catch { return false; } });
  const [iosHelp, setIosHelp] = useState(false);
  useEffect(() => {
    const on = (e) => { e.preventDefault(); setEvt(e); };
    window.addEventListener('beforeinstallprompt', on);
    window.addEventListener('appinstalled', () => setEvt(null));
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);
  if (isStandalone() || (hidden && !inline)) return null;
  const ios = isIos();
  if (!evt && !ios) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem('poshak_install_dismissed', String(Date.now())); } catch { /* ignore */ } };
  const install = async () => { if (evt) { evt.prompt(); await evt.userChoice.catch(() => {}); setEvt(null); } else setIosHelp((v) => !v); };
  return (
    <div className={`psk-install ${inline ? 'inline' : ''}`}>
      <div className="psk-install-row">
        <span className="psk-install-ic"><Download size={16} /></span>
        <div><b>Install the Poshak app</b><small>Faster, full screen, and live order alerts</small></div>
        <button className="psk-install-btn" onClick={install}>{evt ? 'Install' : 'How'}</button>
        {!inline && <button className="psk-install-x" onClick={dismiss} aria-label="Dismiss"><X size={15} /></button>}
      </div>
      {iosHelp && <p className="psk-install-help">Tap <Share size={13} style={{ verticalAlign: '-2px' }} /> <b>Share</b> in Safari, then <b>Add to Home Screen</b>.</p>}
    </div>
  );
};
