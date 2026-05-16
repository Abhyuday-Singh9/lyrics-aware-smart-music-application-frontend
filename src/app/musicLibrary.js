const DEFAULT_THEME = "default";
const MAX_RECENT_SONGS = 10;

function getBackgroundStyle(theme) {
  const base = "linear-gradient(135deg, ";

  if (theme.includes("chorus")) return `${base}#24331f, #0b0d0b)`;
  if (theme.includes("verse")) return `${base}#18263a, #0b0d0f)`;
  if (theme.includes("bridge")) return `${base}#35243b, #0c0c10)`;

  return `${base}#111, #070707)`;
}

function updateRecentSongs(currentRecents, song) {
  return [song, ...currentRecents.filter((item) => item !== song)].slice(
    0,
    MAX_RECENT_SONGS,
  );
}

function getPlaylistNames(playlists) {
  return Object.keys(playlists).sort((a, b) => a.localeCompare(b));
}

export {
  DEFAULT_THEME,
  getBackgroundStyle,
  getPlaylistNames,
  updateRecentSongs,
};
