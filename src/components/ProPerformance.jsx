import React, { useState } from 'react'
import { AudioLines, Clock3, Disc3, Gauge, LockKeyhole, Radio, SlidersHorizontal, Waves } from 'lucide-react'

const LOOP_SIZES = ['1/2', '1', '2', '4', '8', '16']

export default function ProPerformance({ activeDeck, onDeckChange, onFxChange, onNotify }) {
  const [quantize, setQuantize] = useState(true)
  const [loopSize, setLoopSize] = useState('4')
  const [slip, setSlip] = useState(false)
  const [echo, setEcho] = useState(0)
  const [feedback, setFeedback] = useState(0.35)
  const [time, setTime] = useState(0.28)

  const update = (key, value) => { if (key === 'echo') setEcho(value); if (key === 'feedback') setFeedback(value); if (key === 'time') setTime(value); onFxChange?.(activeDeck, key, value) }
  const notify = (message) => onNotify?.(message)

  return <section className="pro-performance-panel" aria-label="Advanced performance controls">
    <div className="pro-performance-header"><div className="pro-performance-title"><span className="pro-icon"><SlidersHorizontal size={14} /></span><div><span className="section-mini-label">PRO PERFORMANCE / FX RACK</span><strong>LIVE EFFECTS + LOOP CONTROL</strong></div></div><div className="pro-deck-tabs"><button className={activeDeck === 'a' ? 'active' : ''} onClick={() => onDeckChange('a')}>A / LEFT</button><button className={activeDeck === 'b' ? 'active' : ''} onClick={() => onDeckChange('b')}>B / RIGHT</button></div></div>
    <div className="pro-performance-grid"><div className="fx-rack-card"><div className="pro-card-heading"><span><Waves size={12} /> ECHO / DELAY</span><b>{activeDeck.toUpperCase()}</b></div><div className="fx-control-row"><label><span>SEND <b>{Math.round(echo * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={echo} onChange={(event) => update('echo', Number(event.target.value))} /></label><label><span>FEEDBACK <b>{Math.round(feedback * 100)}%</b></span><input type="range" min="0" max="0.85" step="0.01" value={feedback} onChange={(event) => update('feedback', Number(event.target.value))} /></label><label><span>TIME <b>{Math.round(time * 1000)}ms</b></span><input type="range" min="0.08" max="0.8" step="0.01" value={time} onChange={(event) => update('time', Number(event.target.value))} /></label></div><div className="fx-presets"><button onClick={() => { update('echo', .0); notify('Echo bypassed.') }}>DRY</button><button onClick={() => { update('echo', .22); update('feedback', .3); update('time', .28) }}>1/4 ECHO</button><button onClick={() => { update('echo', .38); update('feedback', .52); update('time', .56) }}>1/2 ECHO</button><button onClick={() => { update('echo', .58); update('feedback', .7); update('time', .7) }}>SPACE</button></div></div><div className="performance-card"><div className="pro-card-heading"><span><Disc3 size={12} /> LOOP ENGINE</span><b>{loopSize} BEATS</b></div><div className="loop-buttons">{LOOP_SIZES.map((size) => <button key={size} className={loopSize === size ? 'active' : ''} onClick={() => { setLoopSize(size); notify(`Quantized loop set to ${size} beats.`) }}>{size}</button>)}</div><div className="pro-toggle-row"><button className={`pro-toggle ${quantize ? 'on' : ''}`} onClick={() => setQuantize((value) => !value)}><LockKeyhole size={12} /> QUANTIZE <b>{quantize ? 'ON' : 'OFF'}</b></button><button className={`pro-toggle ${slip ? 'on' : ''}`} onClick={() => setSlip((value) => !value)}><Radio size={12} /> SLIP <b>{slip ? 'ON' : 'OFF'}</b></button></div></div><div className="pro-status-card"><div className="pro-status-line"><Gauge size={13} color="#55d18b" /><span>ENGINE STATUS</span><b>READY</b></div><div className="pro-stat-grid"><div><small>BEAT GRID</small><strong>{quantize ? 'LOCKED' : 'FREE'}</strong></div><div><small>ACTIVE FX</small><strong>{echo > 0 ? 'ECHO' : 'DRY'}</strong></div><div><small>TARGET</small><strong>DECK {activeDeck.toUpperCase()}</strong></div><div><small>SYNC MODE</small><strong>{slip ? 'SLIP' : 'BAR'}</strong></div></div><p><AudioLines size={11} /> Use the FX send to blend space into the selected deck without losing the dry signal.</p></div></div>
  </section>
}
