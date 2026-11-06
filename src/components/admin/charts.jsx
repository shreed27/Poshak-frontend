import React, { useState } from 'react';

// Dependency-free SVG charts for the admin dashboard.
const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};
const short = (n) => (n >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : `${Math.round(n)}`);

const Frame = ({ data, height, format, children, pad = { l: 46, r: 14, t: 14, b: 28 }, color }) => {
  const W = 800;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const y = (v) => pad.t + (1 - v / max) * (height - pad.t - pad.b);
  const whole = format !== 'money' && max <= 5;                       // tiny counts: 0,1,2… instead of 0,.25,.5…
  const ticks = whole ? Array.from({ length: max + 1 }, (_, i) => i) : [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="ch-svg" role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="ch-grid" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="ch-axis">{format === 'money' ? `₹${short(t)}` : short(t)}</text>
        </g>
      ))}
      {children({ W, pad, y, max, color })}
    </svg>
  );
};

const XLabels = ({ data, x, height, pad }) => {
  const step = Math.max(1, Math.ceil(data.length / 8));
  const last = data.length - 1;
  const showLast = last % step === 0 || last % step >= Math.ceil(step * 0.7);     // skip the final label when it would collide with the previous one
  return data.map((d, i) => (i % step === 0 || (i === last && showLast)) && (
    <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="ch-axis">{d.label}</text>
  ));
};

export const AreaChart = ({ data, height = 240, color = '#fa5929', money = true, valueLabel = 'Revenue' }) => {
  const [hov, setHov] = useState(null);
  if (!data.length) return <div className="ch-empty">No data in this period</div>;
  return (
    <div className="ch-wrap">
      <Frame data={data} height={height} format={money ? 'money' : 'n'}>
        {({ W, pad, y }) => {
          const x = (i) => pad.l + (data.length <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (data.length - 1));
          const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
          const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
          const id = `g${color.replace('#', '')}`;
          return (
            <>
              <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".32" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
              <path d={area} fill={`url(#${id})`} />
              <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <XLabels data={data} x={x} height={height} pad={pad} />
              {hov != null && <g><line x1={x(hov)} x2={x(hov)} y1={pad.t} y2={y(0)} className="ch-cursor" /><circle cx={x(hov)} cy={y(data[hov].value)} r="5" fill="#fff" stroke={color} strokeWidth="2.5" /></g>}
              {data.map((d, i) => (
                <rect key={i} x={x(i) - (W - pad.l - pad.r) / data.length / 2} y={pad.t} width={(W - pad.l - pad.r) / data.length} height={height - pad.t - pad.b}
                  fill="transparent" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onTouchStart={() => setHov(i)} />
              ))}
            </>
          );
        }}
      </Frame>
      {hov != null && (
        <div className="ch-tip" style={{ left: `${(hov / Math.max(1, data.length - 1)) * 88 + 6}%` }}>
          <b>{data[hov].label}</b><span>{valueLabel}: {money ? `₹${data[hov].value.toLocaleString('en-IN')}` : data[hov].value}</span>
          {data[hov].extra && <small>{data[hov].extra}</small>}
        </div>
      )}
    </div>
  );
};

export const BarChart = ({ data, height = 220, color = '#111', money = false, valueLabel = 'Orders', highlight }) => {
  const [hov, setHov] = useState(null);
  if (!data.length) return <div className="ch-empty">No data in this period</div>;
  return (
    <div className="ch-wrap">
      <Frame data={data} height={height} format={money ? 'money' : 'n'}>
        {({ W, pad, y }) => {
          const slot = (W - pad.l - pad.r) / data.length;
          const bw = Math.min(34, slot * 0.64);
          const x = (i) => pad.l + slot * i + slot / 2;
          return (
            <>
              {data.map((d, i) => (
                <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onTouchStart={() => setHov(i)}>
                  <rect x={x(i) - slot / 2} y={pad.t} width={slot} height={height - pad.t - pad.b} fill="transparent" />
                  <rect x={x(i) - bw / 2} y={y(d.value)} width={bw} height={Math.max(0, y(0) - y(d.value))} rx="5"
                    fill={highlight != null && highlight === i ? '#fa5929' : hov === i ? '#fa5929' : color} opacity={hov == null || hov === i ? 1 : 0.55} />
                </g>
              ))}
              <XLabels data={data} x={x} height={height} pad={pad} />
            </>
          );
        }}
      </Frame>
      {hov != null && (
        <div className="ch-tip" style={{ left: `${((hov + 0.5) / data.length) * 88 + 6}%` }}>
          <b>{data[hov].label}</b><span>{valueLabel}: {money ? `₹${data[hov].value.toLocaleString('en-IN')}` : data[hov].value}</span>
        </div>
      )}
    </div>
  );
};

export const Donut = ({ items, size = 168, centre }) => {
  const total = items.reduce((a, i) => a + i.value, 0);
  const r = 62;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="ch-donut">
      <svg viewBox="0 0 160 160" width={size} height={size}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#f1f2f4" strokeWidth="20" />
        {total > 0 && items.map((it) => {
          const len = (it.value / total) * C;
          const el = <circle key={it.label} cx="80" cy="80" r={r} fill="none" stroke={it.color} strokeWidth="20" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 80 80)" />;
          acc += len;
          return el;
        })}
        <text x="80" y="76" textAnchor="middle" className="ch-donut-n">{centre?.[0]}</text>
        <text x="80" y="95" textAnchor="middle" className="ch-donut-l">{centre?.[1]}</text>
      </svg>
      <ul className="ch-legend">
        {items.map((it) => (
          <li key={it.label}><i style={{ background: it.color }} />{it.label}<b>{it.text ?? it.value}</b><small>{total ? Math.round((it.value / total) * 100) : 0}%</small></li>
        ))}
      </ul>
    </div>
  );
};

export const HBars = ({ items, color = '#fa5929', format = (v) => v }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="ch-empty">Nothing yet</div>;
  return (
    <div className="ch-hbars">
      {items.map((i) => (
        <div key={i.label} className="ch-hrow">
          <span>{i.label}</span>
          <div><em style={{ width: `${(i.value / max) * 100}%`, background: color }} /></div>
          <b>{format(i.value)}</b>
        </div>
      ))}
    </div>
  );
};

export const Spark = ({ values, color = '#fa5929', w = 96, h = 30 }) => {
  if (!values || values.length < 2) return <span style={{ width: w, height: h }} />;
  const max = Math.max(...values), min = Math.min(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
};
