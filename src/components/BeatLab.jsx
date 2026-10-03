import React, { useEffect, useRef, useState } from 'react'
import { Drum, Play, RotateCcw, Square, Timer, Zap } from 'lucide-react'

const STEPS = 16
const PADS = [
  { id: 'kick', label: 'KICK', key: '1', color: 'amber' },
  { id: 'snare', label: 'SNARE', key: '2', color: 'red' },
  { id: 'hat', label: 'HAT', key: '3', color: 'blue' },
  { id: 'clap', label: 'CLAP', key: '4', color: 'violet' },
  { id: 'tom', label: 'TOM', key: '5', color: 'green' },
]

const starterPattern = {
  kick: [0, 4, 8, 10, 12],
  snare: [4, 12],
  hat: [0, 2, 4, 6, 8, 10, 12, 14],
  clap: [4, 12],
  tom: [7, 15],
}

function createAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.')
  return new AudioContextClass()
}

function noiseBuffer(context, duration = 0.2) {
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1
  return buffer
}

function playVoice(context, voice, destination, velocity = 0.9) {
  const now = context.currentTime
  const gain = context.createGain()
  gain.connect(destination)
  gain.gain.value = velocity

  if (voice === 'kick' || voice === 'tom') {
    const oscillator = context.createOscillator()
    oscillator.type = voice === 'kick' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(voice === 'kick' ? 155 : 210, now)
    oscillator.frequency.exponentialRampToValueAtTime(voice === 'kick' ? 48 : 105, now + (voice === 'kick' ? 0.13 : 0.18))
    gain.gain.setValueAtTime(velocity, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + (voice === 'kick' ? 0.32 : 0.24))
    oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + 0.34)
    return
  }

  const source = context.createBufferSource()
  source.buffer = noiseBuffer(context, voice === 'clap' ? 0.16 : 0.1)
  const filter = context.createBiquadFilter()
  filter.type = voice === 'hat' ? 'highpass' : 'bandpass'
  filter.frequency.value = voice === 'hat' ? 6500 : 1800
  filter.Q.value = voice === 'clap' ? 0.7 : 0.4
  source.connect(filter).connect(gain)
  gain.gain.setValueAtTime(velocity * (voice === 'hat' ? 0.42 : 0.68), now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + (voice === 'clap' ? 0.24 : 0.11))
  source.start(now); source.stop(now + 0.26)
}

export default function BeatLab({ onNotify }) {
  const audioRef = useRef(null)
  const masterRef = useRef(null)
  const timerRef = useRef(null)
  const stepRef = useRef(0)
  const [bpm, setBpm] = useState(124)
  const [swing, setSwing] = useState(8)
  const [activeStep, setActiveStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [metronome, setMetronome] = useState(false)
  const [pattern, setPattern] = useState(starterPattern)

  const ensureAudio = () => {
    if (!audioRef.current) { audioRef.current = createAudio(); masterRef.current = audioRef.current.createGain(); masterRef.current.gain.value = 0.7; masterRef.current.connect(audioRef.current.destination) }
    if (audioRef.current.state === 'suspended') void audioRef.current.resume()
    return audioRef.current
  }

  const trigger = (voice, velocity = 0.9) => {
    try { playVoice(ensureAudio(), voice, masterRef.current, velocity) } catch { onNotify?.('Beat Lab audio is not available in this browser.', 'error') }
  }

  const tick = () => {
    const step = stepRef.current
    Object.entries(pattern).forEach(([voice, steps]) => { if (steps.includes(step)) trigger(voice, voice === 'hat' ? 0.55 : 0.9) })
    if (metronome) trigger('hat', step % 4 === 0 ? 0.36 : 0.18)
    setActiveStep(step)
    stepRef.current = (step + 1) % STEPS
  }

  const stop = () => { window.clearInterval(timerRef.current); timerRef.current = null; setPlaying(false); setActiveStep(-1); stepRef.current = 0 }
  const start = () => { ensureAudio(); if (playing) return; tick(); setPlaying(true) }
  const toggleStep = (voice, step) => setPattern((current) => ({ ...current, [voice]: current[voice].includes(step) ? current[voice].filter((item) => item !== step) : [...current[voice], step].sort((a, b) => a - b) }))
  const clear = () => setPattern(Object.fromEntries(PADS.map(({ id }) => [id, []])))
  const reset = () => setPattern(starterPattern)

  useEffect(() => {
    if (!playing) return undefined
    window.clearInterval(timerRef.current)
    const interval = ((60000 / bpm) / 4) * (1 + (swing / 1000))
    timerRef.current = window.setInterval(tick, interval)
    return () => window.clearInterval(timerRef.current)
  }, [playing, bpm, swing, pattern, metronome])
  useEffect(() => () => stop(), [])
  useEffect(() => {
    const onKey = (event) => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return; const pad = PADS.find((item) => item.key === event.key); if (pad) { event.preventDefault(); trigger(pad.id) } }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  })

  return <section className="beat-lab-panel" aria-label="Beat Lab drum machine">
    <div className="beat-lab-header"><div className="beat-lab-title"><span className="beat-lab-mark"><Drum size={15} /></span><div><span className="section-mini-label">PERFORMANCE SUITE / BEAT LAB</span><strong>DRUM MACHINE + STEP SEQUENCER</strong></div></div><div className="beat-lab-actions"><button className={`tool-button ${playing ? 'is-live' : ''}`} onClick={playing ? stop : start}>{playing ? <Square size={12} /> : <Play size={12} />} {playing ? 'STOP' : 'PLAY PATTERN'}</button><button className="mini-icon" onClick={reset} aria-label="Reset starter beat pattern" title="Reset starter pattern"><RotateCcw size={13} /></button></div></div>
    <div className="beat-lab-body"><div className="pad-bank"><div className="pad-bank-label"><span>LIVE PADS</span><small>KEYS 1—5</small></div><div className="drum-pads">{PADS.map((pad) => <button className={`drum-pad ${pad.color}`} key={pad.id} onPointerDown={() => trigger(pad.id)} aria-label={`Play ${pad.label} drum pad`}><span>{pad.label}</span><b>{pad.key}</b></button>)}</div></div><div className="sequencer"><div className="sequencer-head"><span>16-STEP GRID</span><div className="sequencer-tools"><button className={`mini-toggle ${metronome ? 'on' : ''}`} onClick={() => setMetronome((value) => !value)}><Timer size={11} /> METRO</button><button className="mini-toggle" onClick={clear}><Zap size={11} /> CLEAR</button></div></div><div className="step-grid">{PADS.map((pad) => <div className="step-row" key={pad.id}><span className={`step-name ${pad.color}`}>{pad.label}</span>{Array.from({ length: STEPS }, (_, step) => <button className={`step-cell ${pattern[pad.id].includes(step) ? 'on' : ''} ${activeStep === step ? 'playhead' : ''}`} key={step} onClick={() => toggleStep(pad.id, step)} aria-label={`${pad.label} step ${step + 1}`}><i /></button>)}</div>)}</div><div className="beat-controls"><label><span>BPM <b>{bpm}</b></span><input type="range" min="80" max="180" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} /></label><label><span>SWING <b>{swing}%</b></span><input type="range" min="0" max="35" value={swing} onChange={(event) => setSwing(Number(event.target.value))} /></label><div className="beat-status"><i className={playing ? 'status-dot live' : 'status-dot'} /> {playing ? `RUNNING / ${bpm} BPM` : 'READY / TAP A PAD'}</div></div></div></div>
  </section>
}
