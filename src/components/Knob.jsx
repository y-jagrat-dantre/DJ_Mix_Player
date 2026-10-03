import React from 'react'

export default function Knob({ label, value = 0, min = 0, max = 1, step = 0.01, onChange, accent = 'amber', size = 'md', display }) {
  const percent = ((value - min) / (max - min)) * 100
  const angle = -135 + (percent / 100) * 270
  return (
    <div className={`knob-field knob-${size}`}>
      <div className="knob-label-row">
        <span>{label}</span>
        {display !== undefined && <strong>{display}</strong>}
      </div>
      <div className={`knob ${accent}`} style={{ '--knob-angle': `${angle}deg`, '--knob-percent': `${percent}%` }}>
        <span className="knob-track" />
        <span className="knob-cap"><span className="knob-marker" /></span>
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange?.(Number(event.target.value))}
        />
      </div>
    </div>
  )
}
