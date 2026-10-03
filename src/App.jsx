import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CircleHelp, CloudOff, Settings2, X } from 'lucide-react'
import BeatLab from './components/BeatLab'
import Deck from './components/Deck'
import Library from './components/Library'
import Mixer from './components/Mixer'
import OutputRouting from './components/OutputRouting'
import ProPerformance from './components/ProPerformance'
import Waveform from './components/Waveform'
import { AudioEngine } from './audio/AudioEngine'
import { deleteSavedTrack, loadSavedTracks, saveTrack } from './persistence/libraryDb'
import { normalizePlaylists } from './persistence/playlist'
import { readPreference, writePreference } from './persistence/storage'

const initialDeck = (id, label) => ({ id, label, track: null, currentTime: 0, duration: 0, playing: false, volume: 0.82, trim: 0.82, pitch: 0, filter: 0, bpm: id === 'a' ? '128.0' : '124.0', key: id === 'a' ? '8A' : '6A', cues: Array(8).fill(null), vinyl: true, slip: false, reverse: false, sync: false, loop: false })
const initialMixer = { a: { gain: .82, high: 0, mid: 0, low: 0, filter: 0, volume: .82 }, b: { gain: .82, high: 0, mid: 0, low: 0, filter: 0, volume: .82 }, master: .86, crossfader: .5, levelA: .36, levelB: .28 }
const defaultPlaylists = [{ id: 'crate', name: 'My DJ Set', trackIds: [] }]

function fileToTrack(file) {
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled track'
  const parts = base.split(' — ')
  const title = parts.length > 1 ? parts[1] : base
  const artist = parts.length > 1 ? parts[0] : 'Local artist'
  const initials = title.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase().slice(0, 2)
  return { id: `${file.name}-${file.lastModified}-${Math.random()}`, file, title, artist, album: 'Local files', albumArtist: artist, genre: 'Unsorted', bpm: '—', key: '—', duration: 0, initials, favorite: false, rating: '—' }
}

function ToastStack({ toasts, onDismiss }) {
  return <div className="toast-stack">{toasts.map((toast) => <div key={toast.id} className={`toast ${toast.type}`}><span className="status-dot" />{toast.message}<button className="mini-icon" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}><X size={12} /></button></div>)}</div>
}

function Welcome({ onImport, onContinue }) {
  return <div className="welcome-backdrop"><div className="welcome-card"><div className="brand"><span className="brand-mark">X</span><span className="brand-word">DJ<em>Mixr</em></span><span className="brand-sub">local workstation</span></div><h1>LOAD THE ROOM.</h1><p>Your local-first DJ workstation is ready. Bring in a few tracks and build the blend with direct, tactile controls.</p><div className="welcome-actions"><label className="primary-action">ADD MUSIC<input type="file" accept="audio/*" multiple hidden onChange={(event) => onImport(event.target.files)} /></label><label className="secondary-action">IMPORT MUSIC<input type="file" accept="audio/*" multiple hidden onChange={(event) => onImport(event.target.files)} /></label><button className="secondary-action" onClick={onContinue}>CONTINUE</button></div></div></div>
}

export default function App() {
  const engineRef = useRef(null)
  const fileInputs = { a: useRef(null), b: useRef(null) }
  const [decks, setDecks] = useState({ a: initialDeck('a', 'DECK A'), b: initialDeck('b', 'DECK B') })
  const [mixer, setMixer] = useState(() => readPreference('mixer', initialMixer))
  const [tracks, setTracks] = useState([])
  const [queue, setQueue] = useState(() => readPreference('queue', []))
  const [playlists, setPlaylists] = useState(() => normalizePlaylists(readPreference('playlists', defaultPlaylists)))
  const [activePlaylistId, setActivePlaylistId] = useState(() => readPreference('activePlaylistId', 'crate'))
  const [search, setSearch] = useState('')
  const [activeDeck, setActiveDeck] = useState(() => readPreference('activeDeck', 'a'))
  const [outputs, setOutputs] = useState(() => readPreference('outputs', { a: 'default', b: 'default' }))
  const [devices, setDevices] = useState([])
  const [outputSupported, setOutputSupported] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem('djmixr-welcome-dismissed') !== '1')
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3800)
  }, [])
  const dismissWelcome = useCallback(() => { setShowWelcome(false); localStorage.setItem('djmixr-welcome-dismissed', '1') }, [])

  useEffect(() => {
    engineRef.current = new AudioEngine()
    const unsubscribe = engineRef.current.subscribe((event) => {
      if (event.type === 'metadata') setDecks((current) => ({ ...current, [event.deckId]: { ...current[event.deckId], duration: event.duration } }))
      if (event.type === 'play') setDecks((current) => ({ ...current, [event.deckId]: { ...current[event.deckId], playing: true } }))
      if (event.type === 'pause' || event.type === 'ended') setDecks((current) => ({ ...current, [event.deckId]: { ...current[event.deckId], playing: false } }))
      if (event.type === 'error') toast('This audio file could not be decoded in the browser.', 'error')
      if (event.type === 'playback-error') toast('Click Play again to unlock audio playback in this browser.', 'error')
    })
    return () => { unsubscribe(); engineRef.current?.destroy() }
  }, [toast])

  useEffect(() => {
    let cancelled = false
    loadSavedTracks().then((saved) => { if (!cancelled && saved.length) setTracks(saved) })
    return () => { cancelled = true }
  }, [])

  const refreshDevices = useCallback(async () => {
    try {
      if (!engineRef.current) return
      engineRef.current.ensureContext()
      const state = engineRef.current.getOutputState('a')
      setOutputSupported(state.supported)
      if (!navigator.mediaDevices?.enumerateDevices) return
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(list.filter((device) => device.kind === 'audiooutput' && device.deviceId !== 'default'))
    } catch { toast('Audio output devices could not be listed in this browser.', 'error') }
  }, [toast])

  useEffect(() => { void refreshDevices() }, [refreshDevices])
  useEffect(() => {
    let frame
    let lastPublish = 0
    const tick = (now) => {
      frame = requestAnimationFrame(tick)
      if (now - lastPublish < 100 || !engineRef.current) return
      lastPublish = now
      const snapshot = { a: engineRef.current.getSnapshot('a'), b: engineRef.current.getSnapshot('b') }
      setDecks((current) => {
        const next = { ...current }; let changed = false
        for (const id of ['a', 'b']) {
          const live = snapshot[id]
          if (Math.abs(current[id].currentTime - live.currentTime) > 0.02 || current[id].duration !== live.duration || current[id].playing !== live.playing) { next[id] = { ...current[id], currentTime: live.currentTime, duration: live.duration || current[id].duration, playing: live.playing }; changed = true }
        }
        return changed ? next : current
      })
      setMixer((current) => Math.abs(current.levelA - snapshot.a.level) > .01 || Math.abs(current.levelB - snapshot.b.level) > .01 ? { ...current, levelA: snapshot.a.level, levelB: snapshot.b.level } : current)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => { writePreference('mixer', mixer); writePreference('queue', queue.map(({ file, ...metadata }) => metadata)); writePreference('playlists', playlists); writePreference('activePlaylistId', activePlaylistId); writePreference('activeDeck', activeDeck); writePreference('outputs', outputs) }, [mixer, queue, playlists, activePlaylistId, activeDeck, outputs])

  const loadTrack = useCallback(async (deckId, track) => {
    try { await engineRef.current?.loadFile(deckId, track.file); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], track, currentTime: 0, duration: 0, playing: false } })); setActiveDeck(deckId); dismissWelcome(); toast(`${track.title} loaded to ${deckId === 'a' ? 'Deck A' : 'Deck B'}.`) } catch (error) { toast(error.message || 'Unable to load this audio file.', 'error') }
  }, [dismissWelcome, toast])

  const importFiles = useCallback((fileList, targetDeck = null) => {
    const files = Array.from(fileList || []); if (!files.length) return
    const audioFiles = files.filter((file) => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name))
    if (audioFiles.length !== files.length) toast('Some files were skipped because they are not browser-supported audio.', 'error')
    const nextTracks = audioFiles.map(fileToTrack)
    setTracks((current) => [...current, ...nextTracks]); dismissWelcome()
    nextTracks.forEach((track) => { void saveTrack(track) })
    toast(`${nextTracks.length} local track${nextTracks.length === 1 ? '' : 's'} saved to your library.`)
    if (targetDeck && nextTracks[0]) void loadTrack(targetDeck, nextTracks[0])
  }, [dismissWelcome, loadTrack, toast])

  const handleDeckFiles = (deckId, fileList, input) => { importFiles(fileList, deckId); if (input) input.value = '' }
  const handleGlobalDrop = (event) => { event.preventDefault(); importFiles(event.dataTransfer.files) }
  const handleDeckDrop = (event, deckId) => { event.preventDefault(); event.stopPropagation(); const trackId = event.dataTransfer.getData('text/track-id'); if (trackId) { const track = tracks.find((item) => item.id === trackId); if (track) void loadTrack(deckId, track) } else importFiles(event.dataTransfer.files, deckId) }
  const handleTrackDrag = (event, trackId) => event.dataTransfer.setData('text/track-id', trackId)

  const playDeck = async (deckId) => { setActiveDeck(deckId); const deck = decks[deckId]; if (!deck.track) { toast('Load a local audio file before pressing Play.', 'error'); return } try { await engineRef.current.toggle(deckId) } catch { toast('Audio playback was blocked. Press Play again to unlock it.', 'error') } }
  const cueDeck = (deckId) => { if (!decks[deckId].track) return toast('Load a track to set a cue point.', 'error'); engineRef.current?.cue(deckId); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], currentTime: 0, playing: false } })) }
  const seekDeck = (deckId, seconds) => { engineRef.current?.seek(deckId, seconds); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], currentTime: seconds } })) }
  const setDeckVolume = (deckId, value) => { engineRef.current?.setDeckVolume(deckId, value); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], volume: value } })); setMixer((current) => ({ ...current, [deckId]: { ...current[deckId], volume: value } })) }
  const setDeckPitch = (deckId, value) => { engineRef.current?.setPlaybackRate(deckId, 1 + value / 100); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], pitch: value } })) }
  const deckAction = (deckId, action, value) => {
    if (action === 'filter') { engineRef.current?.setFilter(deckId, value); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], filter: value } })); setMixer((current) => ({ ...current, [deckId]: { ...current[deckId], filter: value } })); return }
    if (action === 'trim') { engineRef.current?.setDeckTrim(deckId, value); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], trim: value } })); return }
    if (action === 'loop') { const enabled = !decks[deckId].loop; engineRef.current?.setLoop(deckId, enabled); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], loop: enabled } })); return }
    if (action === 'cue-pad') { const position = decks[deckId].cues[value]; if (position !== null) seekDeck(deckId, position); else setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], cues: current[deckId].cues.map((cue, index) => index === value ? current[deckId].currentTime : cue) } })); return }
    if (action === 'sync') { const other = deckId === 'a' ? decks.b : decks.a; setDeckPitch(deckId, Number(other.pitch || 0)); setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], sync: !current[deckId].sync, bpm: other.bpm } })); toast(`${deckId === 'a' ? 'Deck A' : 'Deck B'} sync target set to ${other.bpm} BPM.`); return }
    if (action === 'reverse') return toast('Reverse playback needs a dedicated time-stretch DSP engine.', 'error')
    setDecks((current) => ({ ...current, [deckId]: { ...current[deckId], [action]: !current[deckId][action] } }))
  }

  const updateMixer = (deckId, key, value) => { setMixer((current) => ({ ...current, [deckId]: { ...current[deckId], [key]: value } })); if (key === 'gain') engineRef.current?.setDeckGain(deckId, value); if (key === 'volume') engineRef.current?.setDeckVolume(deckId, value); if (['low', 'mid', 'high'].includes(key)) engineRef.current?.setEq(deckId, key, value); if (key === 'filter') engineRef.current?.setFilter(deckId, value) }
  const updateCrossfader = (value) => { engineRef.current?.setCrossfader(value); setMixer((current) => ({ ...current, crossfader: value })) }
  const updateMaster = (value) => { engineRef.current?.setMasterVolume(value); setMixer((current) => ({ ...current, master: value })) }
  const toggleFavorite = (id) => setTracks((current) => current.map((track) => { if (track.id !== id) return track; const updated = { ...track, favorite: !track.favorite }; void saveTrack(updated); return updated }))
  const addQueue = (id) => { const track = tracks.find((item) => item.id === id); if (track) { setQueue((current) => [...current, track]); toast(`${track.title} added to Up Next.`) } }
  const removeQueue = (index) => setQueue((current) => current.filter((_, itemIndex) => itemIndex !== index))
  const clearQueue = () => setQueue([])
  const createPlaylist = () => { const number = playlists.length + 1; const playlist = { id: `set-${Date.now()}`, name: `New Set ${String(number).padStart(2, '0')}`, trackIds: [] }; setPlaylists((current) => [...current, playlist]); setActivePlaylistId(playlist.id); toast(`${playlist.name} created.`) }
  const renamePlaylist = (id) => { const playlist = playlists.find((item) => item.id === id); const name = window.prompt('Rename playlist', playlist?.name || 'Untitled Set')?.trim(); if (!name) return; setPlaylists((current) => current.map((item) => item.id === id ? { ...item, name } : item)); toast(`Playlist renamed to ${name}.`) }
  const deletePlaylist = (id) => { const playlist = playlists.find((item) => item.id === id); if (!playlist || !window.confirm(`Delete playlist “${playlist.name}”? Saved songs will stay in your library.`)) return; const remaining = playlists.filter((item) => item.id !== id); setPlaylists(remaining.length ? remaining : defaultPlaylists); setActivePlaylistId((remaining[0] || defaultPlaylists[0]).id); toast('Playlist deleted.') }
  const addToPlaylist = (trackId, playlistId = activePlaylistId) => { if (!playlistId) return; setPlaylists((current) => current.map((playlist) => playlist.id === playlistId && !playlist.trackIds.includes(trackId) ? { ...playlist, trackIds: [...playlist.trackIds, trackId] } : playlist)); toast('Song added to playlist.') }
  const removeFromPlaylist = (playlistId, trackId) => setPlaylists((current) => current.map((playlist) => playlist.id === playlistId ? { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId) } : playlist))
  const removeTrack = async (id) => { const track = tracks.find((item) => item.id === id); if (!track || !window.confirm(`Remove “${track.title}” from your saved library?`)) return; setTracks((current) => current.filter((item) => item.id !== id)); setQueue((current) => current.filter((item) => item.id !== id)); setPlaylists((current) => current.map((playlist) => ({ ...playlist, trackIds: playlist.trackIds.filter((trackId) => trackId !== id) }))); await deleteSavedTrack(id); toast(`${track.title} removed from the saved library.`) }
  const changeOutput = async (deckId, deviceId) => { try { await engineRef.current?.setOutputDevice(deckId, deviceId); setOutputs((current) => ({ ...current, [deckId]: deviceId })); toast(`Deck ${deckId.toUpperCase()} output changed.`) } catch (error) { toast(error.message || 'Output routing is not supported by this browser.', 'error') } }
  const updateFx = (deckId, key, value) => { engineRef.current?.setFx(deckId, key, value) }

  useEffect(() => {
    const onKey = (event) => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return; const key = event.key.toLowerCase(); if (event.code === 'Space') { event.preventDefault(); void playDeck(activeDeck) } else if (key === 'a') void playDeck('a'); else if (key === 'd') void playDeck('b'); else if (key === 'q') cueDeck('a'); else if (key === 'p') cueDeck('b'); else if (key === 's') deckAction(activeDeck, 'sync'); else if (key === 'arrowleft') seekDeck(activeDeck, Math.max(0, decks[activeDeck].currentTime - 5)); else if (key === 'arrowright') seekDeck(activeDeck, Math.min(decks[activeDeck].duration || 0, decks[activeDeck].currentTime + 5)); else if (key === 'arrowup') setDeckVolume(activeDeck, Math.min(1, decks[activeDeck].volume + .05)); else if (key === 'arrowdown') setDeckVolume(activeDeck, Math.max(0, decks[activeDeck].volume - .05)); else if (key === 'm') setDeckVolume(activeDeck, decks[activeDeck].volume > 0 ? 0 : .82); else if (key === 'l') deckAction(activeDeck, 'loop'); else if (key === 'c') cueDeck(activeDeck); else if (key === 'r') toast('Recording is reserved for the next audio phase.') }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  })

  return <div className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={handleGlobalDrop}><main className="console">
    <header className="topbar"><div className="brand"><span className="brand-mark">X</span><span className="brand-word">DJ<em>Mixr</em></span><span className="brand-sub">local workstation</span></div><div className="topbar-center"><span className="top-pill">SESSION <b>UNTITLED SET</b></span><span className="top-pill">ACTIVE <b>{activeDeck.toUpperCase()}</b></span></div><div className="topbar-actions"><span className="signal-status"><i className="status-dot live" /> LOCAL ENGINE</span><button className="tool-button" onClick={() => toast('Saved songs and playlists stay in this browser.')} aria-label="Local privacy status" title="Local privacy status"><CloudOff size={14} /><span>LOCAL ONLY</span></button><button className="mini-icon" aria-label="Help" title="Help"><CircleHelp size={15} /></button><button className="mini-icon" aria-label="Settings" title="Settings"><Settings2 size={15} /></button></div></header>
    <Waveform decks={decks} onSeek={seekDeck} />
    <OutputRouting devices={devices} outputs={outputs} supported={outputSupported} onRefresh={refreshDevices} onChange={changeOutput} />
    <ProPerformance activeDeck={activeDeck} onDeckChange={setActiveDeck} onFxChange={updateFx} onNotify={toast} />
    <div className="deck-grid"><Deck deck={decks.a} deckId="a" onPlay={() => void playDeck('a')} onCue={() => cueDeck('a')} onSeek={(value) => seekDeck('a', value)} onVolume={(value) => setDeckVolume('a', value)} onPitch={(value) => setDeckPitch('a', value)} onLoadClick={() => fileInputs.a.current?.click()} onDrop={(event) => handleDeckDrop(event, 'a')} onAction={(action, value) => deckAction('a', action, value)} /><Mixer mixer={mixer} onChange={updateMixer} onCrossfader={updateCrossfader} onMaster={updateMaster} /><Deck deck={decks.b} deckId="b" onPlay={() => void playDeck('b')} onCue={() => cueDeck('b')} onSeek={(value) => seekDeck('b', value)} onVolume={(value) => setDeckVolume('b', value)} onPitch={(value) => setDeckPitch('b', value)} onLoadClick={() => fileInputs.b.current?.click()} onDrop={(event) => handleDeckDrop(event, 'b')} onAction={(action, value) => deckAction('b', action, value)} /></div>
    <BeatLab onNotify={toast} />
    <Library tracks={tracks} search={search} onSearch={setSearch} onImport={importFiles} onLoad={(id, deckId) => { const track = tracks.find((item) => item.id === id); if (track) void loadTrack(deckId, track) }} onAddQueue={addQueue} onRemoveQueue={removeQueue} onClearQueue={clearQueue} onRemoveTrack={removeTrack} onDragStart={handleTrackDrag} onToggleFavorite={toggleFavorite} onCreatePlaylist={createPlaylist} onAddToPlaylist={addToPlaylist} onRenamePlaylist={renamePlaylist} onDeletePlaylist={deletePlaylist} onRemoveFromPlaylist={removeFromPlaylist} activePlaylistId={activePlaylistId} onSelectPlaylist={setActivePlaylistId} queue={queue} playlists={playlists} />
  </main>{showWelcome && <Welcome onImport={importFiles} onContinue={dismissWelcome} />}<input ref={fileInputs.a} type="file" accept="audio/*" hidden onChange={(event) => handleDeckFiles('a', event.target.files, event.target)} /><input ref={fileInputs.b} type="file" accept="audio/*" hidden onChange={(event) => handleDeckFiles('b', event.target.files, event.target)} /><ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toastItem) => toastItem.id !== id))} /></div>
}
