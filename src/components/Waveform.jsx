import React, { useEffect, useRef } from 'react'

function drawWaveform(canvas, decks) {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(rect.width * dpr))
  const height = Math.max(1, Math.floor(rect.height * dpr))
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, width, height)
  ctx.scale(dpr, dpr)
  const w = rect.width
  const h = rect.height
  ctx.fillStyle = '#11171a'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,.035)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = 0; y < h; y += 23) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  ctx.strokeStyle = 'rgba(255,255,255,.1)'
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke()
  const bars = Math.ceil(w / 3)
  const drawLayer = (deck, top, colorA, colorB) => {
    const baseline = top + h / 4
    const progress = deck.duration ? deck.currentTime / deck.duration : 0
    const barWidth = w / bars
    for (let i = 0; i < bars; i += 1) {
      const wave = Math.abs(Math.sin(i * 0.55 + (deck.playing ? performance.now() / 2000 : 0))) * 0.64 + Math.abs(Math.sin(i * 0.12)) * 0.22 + 0.08
      const barHeight = Math.max(2, wave * (h / 2 - 12))
      const gradient = ctx.createLinearGradient(0, baseline - barHeight, 0, baseline + barHeight)
      gradient.addColorStop(0, colorA)
      gradient.addColorStop(1, colorB)
      ctx.fillStyle = gradient
      ctx.globalAlpha = i / bars < progress ? 0.98 : 0.38
      ctx.fillRect(i * barWidth + 1, baseline - barHeight, Math.max(1, barWidth - 1.5), barHeight * 2)
    }
    ctx.globalAlpha = 1
  }
  drawLayer(decks.a, 0, '#f8c56f', '#9e5b2d')
  drawLayer(decks.b, h / 2, '#a8c9ff', '#3267b4')
  const playhead = Math.max(decks.a.duration ? decks.a.currentTime / decks.a.duration : 0, decks.b.duration ? decks.b.currentTime / decks.b.duration : 0)
  const x = Math.min(w - 1, Math.max(1, playhead * w))
  ctx.strokeStyle = '#f5f5f5'
  ctx.shadowColor = 'rgba(255,255,255,.75)'
  ctx.shadowBlur = 8
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.moveTo(x - 4, 0); ctx.lineTo(x + 4, 0); ctx.lineTo(x, 6); ctx.closePath(); ctx.fill()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

export default function Waveform({ decks, onSeek }) {
  const canvasRef = useRef(null)
  const decksRef = useRef(decks)
  const animationRef = useRef(null)
  decksRef.current = decks
  useEffect(() => {
    const render = () => {
      if (canvasRef.current) drawWaveform(canvasRef.current, decksRef.current)
      animationRef.current = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(animationRef.current)
  }, [])
  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    const target = decks.a.duration ? 'a' : 'b'
    onSeek(target, ratio * (decks[target].duration || 0))
  }
  return (
    <section className="waveform-bus">
      <div className="section-kicker"><span><strong>MASTER WAVEFORM</strong> / BEAT GRID PREVIEW</span><span className="signal-status"><i className="status-dot live" /> AUDIO ENGINE READY <b className="mono-readout">44.1kHz</b></span></div>
      <div className="waveform-stage" onClick={handleClick} title="Click to seek the loaded deck">
        <canvas ref={canvasRef} aria-label="Dual deck waveform visualization" />
        <span className="waveform-label a">A / {decks.a.bpm || '128.0'} BPM</span>
        <span className="waveform-label b">B / {decks.b.bpm || '124.0'} BPM</span>
      </div>
      <div className="waveform-scale"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span></div>
    </section>
  )
}
