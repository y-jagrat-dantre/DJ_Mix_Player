export function normalizePlaylists(playlists) {
  const safe = Array.isArray(playlists) ? playlists : []
  return safe.length ? safe.map((playlist) => ({ ...playlist, name: playlist.name || 'Untitled Set', trackIds: Array.isArray(playlist.trackIds) ? playlist.trackIds : [] })) : [{ id: 'crate', name: 'My DJ Set', trackIds: [] }]
}
