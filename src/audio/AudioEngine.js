const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export class AudioEngine {
  constructor() {
    this.context = null
    this.masterGain = null
    this.compressor = null
    this.decks = { a: null, b: null }
    this.listeners = new Set()
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event) {
    this.listeners.forEach((listener) => listener(event))
  }

  ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.')
      this.context = new AudioContextClass()
      this.masterGain = this.context.createGain()
      this.masterGain.gain.value = 0.86
      this.compressor = this.context.createDynamicsCompressor()
      this.compressor.threshold.value = -2
      this.compressor.knee.value = 8
      this.compressor.ratio.value = 8
      this.compressor.attack.value = 0.003
      this.compressor.release.value = 0.18
      this.masterGain.connect(this.compressor).connect(this.context.destination)
      this.createDeck('a')
      this.createDeck('b')
      this.setCrossfader(0.5)
    }
    if (this.context.state === 'suspended') this.context.resume()
    return this.context
  }

  createDeck(id) {
    const context = this.context
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.setAttribute('playsinline', '')

    const source = context.createMediaElementSource(audio)
    const inputGain = context.createGain()
    const low = context.createBiquadFilter()
    const mid = context.createBiquadFilter()
    const high = context.createBiquadFilter()
    const filter = context.createBiquadFilter()
    const channelGain = context.createGain()
    const crossGain = context.createGain()
    const analyser = context.createAnalyser()

    low.type = 'lowshelf'
    low.frequency.value = 160
    mid.type = 'peaking'
    mid.frequency.value = 1000
    mid.Q.value = 0.9
    high.type = 'highshelf'
    high.frequency.value = 5200
    filter.type = 'lowpass'
    filter.frequency.value = 22000
    filter.Q.value = 0.7
    channelGain.gain.value = 0.82
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.78

    source.connect(inputGain).connect(low).connect(mid).connect(high).connect(filter).connect(channelGain).connect(crossGain).connect(analyser).connect(this.masterGain)

    const deck = { id, audio, objectUrl: null, inputGain, low, mid, high, filter, channelGain, crossGain, analyser }
    const onEvent = (type) => () => this.emit({ type, deckId: id, currentTime: audio.currentTime || 0, duration: audio.duration || 0 })
    audio.addEventListener('loadedmetadata', onEvent('metadata'))
    audio.addEventListener('timeupdate', onEvent('time'))
    audio.addEventListener('play', onEvent('play'))
    audio.addEventListener('pause', onEvent('pause'))
    audio.addEventListener('ended', onEvent('ended'))
    audio.addEventListener('error', () => this.emit({ type: 'error', deckId: id, error: audio.error }))
    this.decks[id] = deck
  }

  getDeck(id) {
    this.ensureContext()
    return this.decks[id]
  }

  async loadFile(id, file) {
    const deck = this.getDeck(id)
    if (deck.objectUrl) URL.revokeObjectURL(deck.objectUrl)
    deck.objectUrl = URL.createObjectURL(file)
    deck.audio.src = deck.objectUrl
    deck.audio.load()
    this.emit({ type: 'loading', deckId: id, file })
  }

  async play(id) {
    const deck = this.getDeck(id)
    try {
      await deck.audio.play()
    } catch (error) {
      this.emit({ type: 'playback-error', deckId: id, error })
      throw error
    }
  }

  pause(id) {
    const deck = this.getDeck(id)
    deck.audio.pause()
  }

  toggle(id) {
    const deck = this.getDeck(id)
    return deck.audio.paused ? this.play(id) : this.pause(id)
  }

  cue(id) {
    const deck = this.getDeck(id)
    deck.audio.currentTime = 0
    deck.audio.pause()
    this.emit({ type: 'cue', deckId: id, currentTime: 0 })
  }

  seek(id, seconds) {
    const deck = this.getDeck(id)
    const duration = Number.isFinite(deck.audio.duration) ? deck.audio.duration : 0
    deck.audio.currentTime = clamp(seconds, 0, duration || Math.max(seconds, 0))
    this.emit({ type: 'seek', deckId: id, currentTime: deck.audio.currentTime })
  }

  setDeckVolume(id, value) {
    const deck = this.getDeck(id)
    deck.channelGain.gain.value = clamp(value, 0, 1.2)
  }

  setDeckGain(id, value) {
    const deck = this.getDeck(id)
    deck.inputGain.gain.value = clamp(value, 0, 1.2)
  }

  setDeckTrim(id, value) {
    this.setDeckGain(id, value)
  }

  setLoop(id, enabled) {
    const deck = this.getDeck(id)
    deck.audio.loop = Boolean(enabled)
  }

  setMasterVolume(value) {
    this.ensureContext()
    this.masterGain.gain.value = clamp(value, 0, 1.2)
  }

  setCrossfader(value) {
    this.ensureContext()
    const position = clamp(value, 0, 1)
    this.decks.a.crossGain.gain.value = Math.cos(position * Math.PI * 0.5)
    this.decks.b.crossGain.gain.value = Math.sin(position * Math.PI * 0.5)
  }

  setEq(id, band, value) {
    const deck = this.getDeck(id)
    const target = { low: deck.low, mid: deck.mid, high: deck.high }[band]
    if (target) target.gain.value = clamp(value, -12, 12)
  }

  setFilter(id, value) {
    const deck = this.getDeck(id)
    const normalized = clamp(value, -1, 1)
    if (normalized === 0) {
      deck.filter.type = 'lowpass'
      deck.filter.frequency.value = 22000
      return
    }
    deck.filter.type = normalized < 0 ? 'lowpass' : 'highpass'
    deck.filter.frequency.value = normalized < 0 ? 22000 - Math.abs(normalized) * 21000 : 40 + normalized * 21960
  }

  setPlaybackRate(id, rate) {
    const deck = this.getDeck(id)
    deck.audio.playbackRate = clamp(rate, 0.5, 1.5)
  }

  getLevel(id) {
    const deck = this.decks[id]
    if (!deck) return 0
    const data = new Uint8Array(deck.analyser.frequencyBinCount)
    deck.analyser.getByteFrequencyData(data)
    const average = data.reduce((sum, value) => sum + value, 0) / data.length / 255
    return average
  }

  getSnapshot(id) {
    const deck = this.decks[id]
    if (!deck) return { currentTime: 0, duration: 0, playing: false, level: 0 }
    return {
      currentTime: deck.audio.currentTime || 0,
      duration: Number.isFinite(deck.audio.duration) ? deck.audio.duration : 0,
      playing: !deck.audio.paused && !deck.audio.ended,
      level: this.getLevel(id),
    }
  }

  destroy() {
    Object.values(this.decks).forEach((deck) => {
      if (!deck) return
      deck.audio.pause()
      if (deck.objectUrl) URL.revokeObjectURL(deck.objectUrl)
    })
    if (this.context) this.context.close()
  }
}
