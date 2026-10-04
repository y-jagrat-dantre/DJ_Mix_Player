import React, { useRef } from 'react'
import { Disc3, Headphones, LockKeyhole, RotateCcw, SkipBack, SkipForward, Volume2, LogIn, LogOut, X, Repeat2, Scissors, Sparkles, Radio } from 'lucide-react'
import Knob from './Knob'

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

function JogWheel({ deck, onSeek }) {
  const wheelRef = useRef(null)
  const startRef = useRef(null)
  const startTimeRef = useRef(0)
  const rotation = (deck.currentTime / Math.max(deck.duration || 1, 1)) * 360

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    startRef.current = event.clientX
    startTimeRef.current = deck.currentTime
  }
  const handlePointerMove = (event) => {
    if (startRef.current === null) return
    const delta = (event.clientX - startRef.current) * 0.025
    onSeek(Math.max(0, Math.min(deck.duration || 0, startTimeRef.current + delta)))
  }
  const handlePointerUp = () => { startRef.current = null }

  return (
    <div
      ref={wheelRef}
      className={`jog-wheel ${deck.playing ? 'spinning' : ''}`}
      style={{ '--wheel-rotation': `${rotation}deg` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="slider"
      aria-label={`${deck.label} jog wheel`}
      aria-valuenow={Math.round(deck.currentTime)}
      aria-valuemin="0"
      aria-valuemax={Math.round(deck.duration || 0)}
      tabIndex={0}
    >
      <div className="jog-rings" />
      <div className="jog-label">
        <Disc3 size={22} />
        <b>{deck.label}</b>
        <span>{deck.key || '—'}</span>
      </div>
      <span className="jog-needle" />
      <span className="jog-dot dot-one" /><span className="jog-dot dot-two" /><span className="jog-dot dot-three" />
    </div>
  )
}

function TransportButton({ children, onClick, active, accent, title, disabled = false }) {
  return <button className={`transport-button ${active ? 'active' : ''} ${accent || ''}`} onClick={onClick} title={title} disabled={disabled}>{children}</button>
}

const PERFORMANCE_PADS = [
  { id: 'loop-in', label: 'IN', sub: 'MANUAL', tone: 'amber', icon: LogIn },
  { id: 'loop-out', label: 'OUT', sub: 'MANUAL', tone: 'green', icon: LogOut },
  { id: 'loop-exit', label: 'EXIT', sub: 'AUTO', tone: 'violet', icon: X },
  { id: 'sampler', label: '1/2X', sub: 'SAMPLER', tone: 'lime', icon: Sparkles },
  { id: 'roll', label: 'ROLL', sub: '1/2', tone: 'blue', icon: Repeat2 },
  { id: 'hot-loop', label: 'HOT LOOP', sub: '4 BEATS', tone: 'pink', icon: Repeat2 },
  { id: 'slicer', label: 'SLICER', sub: 'AUTO', tone: 'white', icon: Scissors },
  { id: 'bank', label: 'BANK', sub: '16', tone: 'brown', icon: Radio },
]

export default function Deck({ deck, deckId, onPlay, onCue, onSeek, onVolume, onPitch, onLoadClick, onDrop, onAction, onPerformancePad }) {
  const progress = deck.duration ? (deck.currentTime / deck.duration) * 100 : 0
  const pitchDisplay = `${deck.pitch >= 0 ? '+' : ''}${deck.pitch.toFixed(1)}%`

  return (
    <section className={`deck-panel deck-${deckId}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <div className="panel-header deck-header">
        <div className="deck-identity"><span className="deck-lamp" /> <span>{deck.label}</span><small>{deckId === 'a' ? 'MAIN' : 'REMOTE'}</small></div>
        <div className="deck-header-actions"><span className="status-dot live" /> <button className="mini-icon" aria-label={`${deck.label} headphone cue`} title="Headphone cue"><Headphones size={14} /></button><button className="mini-icon" aria-label={`${deck.label} deck settings`} title="Deck settings"><RotateCcw size={14} /></button></div>
      </div>
      <div className="track-strip">
        <div className="artwork-art"><span>{deck.label}</span><i>{deck.track?.initials || '—'}</i></div>
        <div className="track-copy">
          <strong>{deck.track?.title || 'DROP TRACK HERE'}</strong>
          <span>{deck.track?.artist || 'Choose a local audio file to begin'}</span>
          <div className="track-meta"><span>{deck.track?.album || 'LOCAL LIBRARY'}</span><span>{deck.track?.genre || '—'}</span></div>
        </div>
        <div className="track-readout"><b>{deck.bpm || '128.0'}</b><small>BPM</small><b>{deck.key || '—'}</b><small>KEY</small></div>
      </div>
      <div className="time-row"><strong>{formatTime(deck.currentTime)}</strong><div className="progress-line"><span style={{ width: `${progress}%` }} /><input aria-label={`${deck.label} seek`} type="range" min="0" max={deck.duration || 1} step="0.01" value={Math.min(deck.currentTime, deck.duration || 1)} onChange={(event) => onSeek(Number(event.target.value))} /></div><span>-{formatTime(Math.max(0, (deck.duration || 0) - deck.currentTime))}</span></div>
      <div className="deck-main">
        <div className="jog-column"><JogWheel deck={deck} onSeek={onSeek} /><div className="jog-caption"><span>VINYL</span><b className={deck.vinyl ? 'on' : ''}>{deck.vinyl ? 'ON' : 'OFF'}</b><span>SLIP</span><b className={deck.slip ? 'on' : ''}>{deck.slip ? 'ON' : 'OFF'}</b></div></div>
        <div className="deck-controls">
          <div className="transport-grid"><TransportButton onClick={() => onAction('reverse')} active={deck.reverse} title="Reverse playback is reserved for the time-stretch phase" disabled>REV</TransportButton><TransportButton onClick={() => onCue()} accent="cue" title="Return to cue point">CUE</TransportButton><TransportButton onClick={() => onAction('sync')} accent="sync" active={deck.sync} title="Match tempo with the other deck">SYNC</TransportButton><TransportButton onClick={() => onAction('loop')} active={deck.loop} title="Toggle full-track loop mode">LOOP</TransportButton></div>
          <button className={`play-button ${deck.playing ? 'playing' : ''}`} onClick={onPlay} title={deck.playing ? 'Pause deck' : 'Play deck'}><span className="play-glyph">{deck.playing ? 'Ⅱ' : '▶'}</span><span>{deck.playing ? 'PAUSE' : 'PLAY'}</span></button>
          <div className="pitch-section"><div className="pitch-title"><span>PITCH</span><b>{pitchDisplay}</b></div><input aria-label={`${deck.label} pitch`} type="range" min="-8" max="8" step="0.1" value={deck.pitch} onChange={(event) => onPitch(Number(event.target.value))} /><div className="pitch-range"><span>-8</span><span>0</span><span>+8</span></div><button className="tiny-button" onClick={() => onPitch(0)}>PITCH RESET</button></div>
          <div className="deck-foot-controls"><Knob label="TRIM" value={deck.trim} min={0} max={1} onChange={(value) => onAction('trim', value)} display={`${Math.round(deck.trim * 100)}%`} /><Knob label="FILTER" value={deck.filter} min={-1} max={1} step={0.01} onChange={(value) => onAction('filter', value)} display={deck.filter === 0 ? 'OFF' : `${deck.filter > 0 ? '+' : ''}${Math.round(deck.filter * 100)}`} /><Knob label="VOL" value={deck.volume} min={0} max={1} onChange={onVolume} accent={deckId === 'a' ? 'amber' : 'blue'} display={`${Math.round(deck.volume * 100)}%`} /></div>
        </div>
      </div>
      <div className="performance-pad-bank"><div className="pad-bank-heading"><span className="section-mini-label">PERFORMANCE PADS</span><b>PAD MODE / {deck.padBank || 'A'}</b></div><div className="performance-pad-grid">{PERFORMANCE_PADS.map(({ id, label, sub, tone, icon: Icon }) => <button key={id} className={`performance-pad pad-${tone} ${deck.performance?.[id] ? 'active' : ''}`} onClick={() => onPerformancePad?.(id)} title={`${label} ${sub}`}><Icon size={14} /><strong>{label}</strong><small>{sub}</small></button>)}</div></div>
      <div className="deck-bottom-row"><div className="hot-cues"><span className="section-mini-label">HOT CUES</span>{deck.cues.map((cue, index) => <button key={index} className={`cue-pad ${cue ? 'filled' : ''}`} onClick={() => onAction('cue-pad', index)} title={cue ? `Jump to cue ${index + 1}` : `Set cue ${index + 1}`}>{String(index + 1).padStart(2, '0')}</button>)}</div><button className="load-drop" onClick={onLoadClick} aria-label={`Load a local track to ${deck.label}`}><SkipBack size={13} /> LOAD LOCAL TRACK <span>or drop file</span></button></div>
    </section>
  )
}
