const DB_NAME = 'djmixr-library'
const STORE = 'track-analysis'

export function openLibraryDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return resolve(null)
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveTrackMetadata(metadata) {
  try {
    const db = await openLibraryDb()
    if (!db) return
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(metadata)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* Metadata caching is an enhancement; playback remains local and available. */ }
}

export async function readTrackMetadata(id) {
  try {
    const db = await openLibraryDb()
    if (!db) return null
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch { return null }
}
