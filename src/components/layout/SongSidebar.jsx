import { useEffect, useMemo, useState } from "react";
import IconButton from "../IconButton";

const VIEW_ALL = "all";
const VIEW_FAVORITES = "favorites";
const VIEW_RECENT = "recent";
const VIEW_PLAYLISTS = "playlists";

function sortSongs(songList, sortMode, favorites) {
  const sortedSongs = [...songList];

  if (sortMode === "za") {
    return sortedSongs.sort((a, b) => b.localeCompare(a));
  }

  if (sortMode === "favorites") {
    return sortedSongs.sort((a, b) => {
      const aFavorite = favorites.includes(a) ? 1 : 0;
      const bFavorite = favorites.includes(b) ? 1 : 0;

      if (aFavorite !== bFavorite) return bFavorite - aFavorite;
      return a.localeCompare(b);
    });
  }

  return sortedSongs.sort((a, b) => a.localeCompare(b));
}

function getFilteredSongs({
  songs,
  view,
  favorites,
  recentSongs,
  playlists,
  selectedPlaylist,
  searchTerm,
}) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  let baseSongs = songs;

  if (view === VIEW_FAVORITES) {
    baseSongs = songs.filter((song) => favorites.includes(song));
  }

  if (view === VIEW_RECENT) {
    baseSongs = recentSongs.filter((song) => songs.includes(song));
  }

  if (view === VIEW_PLAYLISTS) {
    baseSongs = (playlists[selectedPlaylist] || []).filter((song) =>
      songs.includes(song),
    );
  }

  if (!normalizedSearch) {
    return baseSongs;
  }

  return baseSongs.filter((song) =>
    song.toLowerCase().includes(normalizedSearch),
  );
}

export default function SongSidebar({
  isOpen,
  onClose,
  songs,
  selected,
  setSong,
  favorites,
  onToggleFavorite,
  recentSongs,
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
  onAddSongToPlaylist,
  onOpenPlaylist,
  onRemoveSongFromPlaylist,
}) {
  const [view, setView] = useState(VIEW_ALL);
  const [sortMode, setSortMode] = useState("az");
  const [searchTerm, setSearchTerm] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState("");

  const playlistNames = useMemo(
    () => Object.keys(playlists).sort((a, b) => a.localeCompare(b)),
    [playlists],
  );

  useEffect(() => {
    if (!selectedPlaylist && playlistNames.length > 0) {
      setSelectedPlaylist(playlistNames[0]);
      return;
    }

    if (selectedPlaylist && !playlistNames.includes(selectedPlaylist)) {
      setSelectedPlaylist(playlistNames[0] || "");
    }
  }, [playlistNames, selectedPlaylist]);

  const visibleSongs = useMemo(() => {
    const filteredSongs = getFilteredSongs({
      songs,
      view,
      favorites,
      recentSongs,
      playlists,
      selectedPlaylist,
      searchTerm,
    });

    if (view === VIEW_RECENT) {
      return filteredSongs;
    }

    return sortSongs(filteredSongs, sortMode, favorites);
  }, [
    favorites,
    playlists,
    recentSongs,
    searchTerm,
    selectedPlaylist,
    songs,
    sortMode,
    view,
  ]);

  const handleCreatePlaylist = () => {
    if (onCreatePlaylist(playlistName)) {
      const trimmedName = playlistName.trim();
      setSelectedPlaylist(trimmedName);
      setPlaylistName("");
      setView(VIEW_PLAYLISTS);
      onOpenPlaylist(trimmedName);
    }
  };

  return (
    <aside
      className={`sidebar no-scrollbar ${isOpen ? "open" : ""}`}
      aria-hidden={!isOpen}
    >
      <div className="library-header">
        <h3 style={{ margin: 0 }}>Your Library</h3>
        <div className="library-header-actions">
          <div className="library-count">{songs.length} tracks</div>
          <button
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close library menu"
          >
            Close
          </button>
        </div>
      </div>

      <input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search songs"
        className="library-input"
      />

      <select
        value={sortMode}
        onChange={(event) => setSortMode(event.target.value)}
        className="library-input"
      >
        <option value="az">Sort: A-Z</option>
        <option value="za">Sort: Z-A</option>
        <option value="favorites">Sort: Favorites First</option>
      </select>

      <div className="library-tabs">
        <button
          className={`library-tab ${view === VIEW_ALL ? "active" : ""}`}
          onClick={() => setView(VIEW_ALL)}
        >
          All
        </button>
        <button
          className={`library-tab ${view === VIEW_FAVORITES ? "active" : ""}`}
          onClick={() => setView(VIEW_FAVORITES)}
        >
          Favorites
        </button>
        <button
          className={`library-tab ${view === VIEW_RECENT ? "active" : ""}`}
          onClick={() => setView(VIEW_RECENT)}
        >
          Recent
        </button>
        <button
          className={`library-tab ${view === VIEW_PLAYLISTS ? "active" : ""}`}
          onClick={() => setView(VIEW_PLAYLISTS)}
        >
          Playlists
        </button>
      </div>

      <div className="library-section">
        <div className="library-section-title">Playlists</div>

        <div className="playlist-actions">
          <input
            value={playlistName}
            onChange={(event) => setPlaylistName(event.target.value)}
            placeholder="New playlist"
            className="library-input"
          />
          <button className="library-action" onClick={handleCreatePlaylist}>
            Create
          </button>
        </div>

        <select
          value={selectedPlaylist}
          onChange={(event) => {
            setSelectedPlaylist(event.target.value);
            setView(VIEW_PLAYLISTS);
          }}
          className="library-input"
        >
          <option value="">Select playlist</option>
          {playlistNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <div className="sidebar-playlist-links">
          {playlistNames.map((name) => (
            <button
              key={name}
              className="sidebar-playlist-link"
              onClick={() => {
                setSelectedPlaylist(name);
                setView(VIEW_PLAYLISTS);
                onOpenPlaylist(name);
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="playlist-actions">
          <button
            className="library-action"
            disabled={!selectedPlaylist || !selected}
            onClick={() => onAddSongToPlaylist(selectedPlaylist, selected)}
          >
            Add Current Song
          </button>
          <button
            className="library-action danger"
            disabled={!selectedPlaylist}
            onClick={() => onDeletePlaylist(selectedPlaylist)}
          >
            Delete Playlist
          </button>
        </div>
      </div>

      <div className="library-results-label">
        {view === VIEW_FAVORITES && `Favorites (${visibleSongs.length})`}
        {view === VIEW_RECENT && `Recently Played (${visibleSongs.length})`}
        {view === VIEW_PLAYLISTS &&
          `${selectedPlaylist || "Playlist"} (${visibleSongs.length})`}
        {view === VIEW_ALL && `Songs (${visibleSongs.length})`}
      </div>

      <div className="song-list">
        {visibleSongs.map((song) => {
          const isFavorite = favorites.includes(song);

          return (
            <div
              key={song}
              className={`song-row ${selected === song ? "active" : ""}`}
            >
              <button className="song-main" onClick={() => setSong(song)}>
                <span className="song-title">{song}</span>
                {recentSongs[0] === song && (
                  <span className="song-badge">Recent</span>
                )}
              </button>

              <IconButton
                className={`song-favorite ${isFavorite ? "active" : ""}`}
                ariaLabel={isFavorite ? "Remove favorite" : "Add favorite"}
                onClick={() => onToggleFavorite(song)}
              >
                {isFavorite ? "♥" : "♡"}
              </IconButton>

              {view === VIEW_PLAYLISTS && selectedPlaylist && (
                <IconButton
                  className="song-remove"
                  ariaLabel="Remove from playlist"
                  onClick={() =>
                    onRemoveSongFromPlaylist(selectedPlaylist, song)
                  }
                >
                  ✕
                </IconButton>
              )}
            </div>
          );
        })}

        {visibleSongs.length === 0 && (
          <div className="library-empty">
            No songs found for this library view yet.
          </div>
        )}
      </div>
    </aside>
  );
}
