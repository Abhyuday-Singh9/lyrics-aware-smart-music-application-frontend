const FAVORITES_KEY = "music-ai:favorites";
const RECENTS_KEY = "music-ai:recents";
const PLAYLISTS_KEY = "music-ai:playlists";

function readStoredJson(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFavorites() {
  return readStoredJson(FAVORITES_KEY, []);
}

function saveFavorites(favorites) {
  writeStoredJson(FAVORITES_KEY, favorites);
}

function loadRecents() {
  return readStoredJson(RECENTS_KEY, []);
}

function saveRecents(recents) {
  writeStoredJson(RECENTS_KEY, recents);
}

function loadPlaylists() {
  return readStoredJson(PLAYLISTS_KEY, {});
}

function savePlaylists(playlists) {
  writeStoredJson(PLAYLISTS_KEY, playlists);
}

export {
  loadFavorites,
  loadPlaylists,
  loadRecents,
  saveFavorites,
  savePlaylists,
  saveRecents,
};
