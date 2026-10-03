const DB_NAME = 'djmixr-library'
const DB_VERSION = 2
const ANALYSIS_STORE = 'track-analysis'
const TRACK_STORE = 'tracks'

export function openLibraryDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return resolve(null)
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(ANALYSIS_STORE)) db.createObjectStore(ANALYSIS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(TRACK_STORE)) db.createObjectStore(TRACK_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function withoutFile(track) {
  const { file, ...metadata } = track
  return metadata
}

export async function saveTrack(track) {
  try {
    const db = await openLibraryDb()
    if (!db) return false
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRACK_STORE, 'readwrite')
      tx.objectStore(TRACK_STORE).put({ ...withoutFile(track), file: track.file || null, savedAt: Date.now() })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch { return false }
}

export async function loadSavedTracks() {
  try {
    const db = await openLibraryDb()
    if (!db) return []
    return await new Promise((resolve, reject) => {
      const request = db.transaction(TRACK_STORE, 'readonly').objectStore(TRACK_STORE).getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch { return [] }
}

export async function deleteSavedTrack(id) {
  try {
    const db = await openLibraryDb()
    if (!db) return false
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRACK_STORE, 'readwrite')
      tx.objectStore(TRACK_STORE).delete(id)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch { return false }
}

export async function saveTrackMetadata(metadata) {
  try {
    const db = await openLibraryDb()
    if (!db) return
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ANALYSIS_STORE, 'readwrite')
      tx.objectStore(ANALYSIS_STORE).put(metadata)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* Metadata caching is optional; playback remains available. */ }
}

export async function readTrackMetadata(id) {
  try {
    const db = await openLibraryDb()
    if (!db) return null
    return await new Promise((resolve, reject) => {
      const request = db.transaction(ANALYSIS_STORE, 'readonly').objectStore(ANALYSIS_STORE).get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch { return null }
}
