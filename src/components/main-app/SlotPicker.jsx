import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useSlots, slotText } from '../../hooks/useSlots';

export const SlotPicker = ({ value, onChange }) => {
  const days = useSlots();
  const [dayIdx, setDayIdx] = useState(0);

  // Pick the first open window automatically (and recover if the chosen one fills up).
  useEffect(() => {
    const stillOk = value && days.flatMap((d) => d.slots).some((s) => s.date === value.date && s.win === value.win && !s.full);
    if (stillOk) return;
    for (let i = 0; i < days.length; i++) {
      const open = days[i].slots.find((s) => !s.full);
      if (open) { setDayIdx(i); onChange(open); return; }
    }
    if (value) onChange(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const day = days[dayIdx];
  return (
    <div className="psk-slots">
      <label className="psk-slots-title"><Clock size={14} color="#fa5929" /> <span>Choose pickup window</span></label>
      <div className="psk-day-tabs">
        {days.map((d, i) => (
          <button type="button" key={d.date} className={i === dayIdx ? 'on' : ''} onClick={() => setDayIdx(i)}>{d.label}</button>
        ))}
      </div>
      <div className="psk-slot-grid">
        {day?.slots.length === 0 && <div className="psk-empty">No windows left today — pick another day.</div>}
        {day?.slots.map((s) => (
          <button
            type="button"
            key={s.win}
            disabled={s.full}
            className={`psk-slot ${value?.date === s.date && value?.win === s.win ? 'on' : ''}`}
            onClick={() => onChange(s)}
          >
            {s.label}
            <small>{s.full ? 'Full' : s.left != null && s.left <= 2 ? `${s.left} left` : ' '}</small>
          </button>
        ))}
      </div>
      {!value && <p className="psk-slot-warn">All upcoming windows are full. Please try again later.</p>}
      {value && <p className="psk-slot-picked">Pickup: {slotText(value)}</p>}
    </div>
  );
};
