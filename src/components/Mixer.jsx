import React from 'react'
import { Gauge, SlidersHorizontal } from 'lucide-react'
import Knob from './Knob'

function Meter({ label, level = 0.42, accent = 'amber' }) {
  const active = Math.round(level * 16)
  return <div className="meter-column"><div className="meter-label"><span>{label}</span><span>{Math.round(level * 100)}%</span></div><div className="meter-bars">{Array.from({ length: 16 }, (_, index) => <i key={index} className="meter-bar" style={{ height: `${12 + index * 5}%`, opacity: index < active ? 0.95 : 0.11, filter: index > 13 && active > 14 ? 'brightness(1.35)' : 'none', background: accent === 'blue' ? 'linear-gradient(180deg,#5d9eff 0 36%,#55d18b 36% 100%)' : undefined }} />)}</div></div>
}

function Channel({ id, mixer, onChange }) {
  const channel = mixer[id]
  const accent = id === 'a' ? 'amber' : 'blue'
  return <div className={`channel channel-${id}`}>
    <div className="channel-label"><span>CHANNEL {id.toUpperCase()}</span><b>{id === 'a' ? 'A' : 'B'}</b></div>
    <div className="channel-knobs">
      <Knob label="GAIN" value={channel.gain} min={0} max={1.2} onChange={(value) => onChange(id, 'gain', value)} accent={accent} display={`${Math.round(channel.gain * 100)}%`} />
      <Knob label="HIGH" value={channel.high} min={-12} max={12} onChange={(value) => onChange(id, 'high', value)} accent={accent} display={`${channel.high > 0 ? '+' : ''}${Math.round(channel.high)}`} />
      <Knob label="MID" value={channel.mid} min={-12} max={12} onChange={(value) => onChange(id, 'mid', value)} accent={accent} display={`${channel.mid > 0 ? '+' : ''}${Math.round(channel.mid)}`} />
      <Knob label="LOW" value={channel.low} min={-12} max={12} onChange={(value) => onChange(id, 'low', value)} accent={accent} display={`${channel.low > 0 ? '+' : ''}${Math.round(channel.low)}`} />
      <Knob label="FILTER" value={channel.filter} min={-1} max={1} onChange={(value) => onChange(id, 'filter', value)} accent={accent} display={channel.filter === 0 ? 'OFF' : `${Math.round(channel.filter * 100)}`} />
    </div>
    <div className="channel-fader"><div className="fader-title"><span>CH VOL</span><span>{Math.round(channel.volume * 100)}%</span></div><input className="vertical-fader" aria-label={`Channel ${id.toUpperCase()} volume`} type="range" min="0" max="1" step="0.01" value={channel.volume} onChange={(event) => onChange(id, 'volume', Number(event.target.value))} /></div>
  </div>
}

export default function Mixer({ mixer, onChange, onCrossfader, onMaster }) {
  return <section className="mixer-panel">
    <div className="panel-header"><div className="mixer-title"><SlidersHorizontal size={15} /><span>MIXER</span><span>/ 2-CHANNEL</span></div><Gauge size={15} color="#55d18b" /></div>
    <div className="mixer-signal"><Meter label="A / LEFT" level={mixer.levelA} /><Meter label="B / RIGHT" level={mixer.levelB} accent="blue" /></div>
    <div className="mixer-channels"><Channel id="a" mixer={mixer} onChange={onChange} /><Channel id="b" mixer={mixer} onChange={onChange} /></div>
    <div className="crossfader"><div className="cross-title"><span>CROSSFADER</span><b>{Math.round(mixer.crossfader * 100)}% B</b></div><input aria-label="Crossfader" type="range" min="0" max="1" step="0.01" value={mixer.crossfader} onChange={(event) => onCrossfader(Number(event.target.value))} /><div className="cross-labels"><span>A</span><span>THRU</span><span>B</span></div></div>
    <div className="master-section"><div className="section-kicker"><span>MASTER</span><span className="status-dot live" /></div><div className="master-status"><Knob label="MASTER" value={mixer.master} min="0" max="1.2" onChange={onMaster} accent="green" display={`${Math.round(mixer.master * 100)}%`} /><div><small>LIMITER / AUTO</small><b className="master-readout"> -1.0 dB</b></div></div></div>
  </section>
}
