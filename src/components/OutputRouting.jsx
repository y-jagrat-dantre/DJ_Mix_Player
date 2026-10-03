import React from 'react'
import { Headphones, RefreshCw, Speaker } from 'lucide-react'

export default function OutputRouting({ devices, outputs, supported, onRefresh, onChange }) {
  return <section className="output-routing" aria-label="Audio output routing">
    <div className="output-routing-title"><div><span className="section-mini-label">OUTPUT ROUTING</span><strong>Send each deck to a different device</strong></div><button className="mini-icon" onClick={onRefresh} aria-label="Refresh output devices" title="Refresh output devices"><RefreshCw size={13} /></button></div>
    <div className="output-routing-grid">
      {['a', 'b'].map((deckId) => <label className={`output-select output-${deckId}`} key={deckId}><span>{deckId === 'a' ? <Headphones size={13} /> : <Speaker size={13} />} DECK {deckId.toUpperCase()} OUTPUT</span><select value={outputs[deckId] || 'default'} onChange={(event) => onChange(deckId, event.target.value)} disabled={!supported}><option value="default">System default</option>{devices.map((device) => <option value={device.deviceId} key={device.deviceId}>{device.label || `Audio output ${device.deviceId.slice(0, 6)}`}</option>)}</select></label>)}
    </div>
    <p className="output-routing-note">{supported ? 'Choose headphones for cueing Deck A and speakers for Deck B. Output choices apply independently when supported by this browser.' : 'Per-deck device routing is unavailable until the browser exposes Audio Output Device Selection. The system default output remains active.'}</p>
  </section>
}
