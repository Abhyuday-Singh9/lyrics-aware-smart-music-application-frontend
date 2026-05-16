import React from "react";
import { ROUTES } from "../app/routes";
import IconButton from "../components/IconButton";

function getDisplayName(song) {
  return song.replace(/\.[^/.]+$/, "");
}

export default function PlaylistDetailPage({ state, actions }) {
  const playlistName = state.selectedPlaylistName;
  const playlistSongs = (state.playlists[playlistName] || []).filter((song) =>
    state.songs.includes(song),
  );

  const handlePlayPause = (song) => {
    const isSelectedSong = state.selectedSong === song;
    const isPlaying =
      isSelectedSong &&
      state.action?.intent === "play_song" &&
      state.action.song === song;

    actions.onSongSelect(song, ROUTES.PLAYER);
    actions.setAction({
      intent: isPlaying ? "pause_song" : "play_song",
      restart: !isSelectedSong,
      song,
    });
  };

  if (!playlistName || !state.playlists[playlistName]) {
    return (
      <section className="page-stack">
        <button
          className="text-button back-button"
          onClick={() => actions.onNavigate(ROUTES.PLAYLISTS)}
        >
          Back to Playlists
        </button>
        <div className="library-empty">Select a playlist to view its songs.</div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <button
        className="text-button back-button"
        onClick={() => actions.onNavigate(ROUTES.PLAYLISTS)}
      >
        Back to Playlists
      </button>

      <div className="playlist-hero">
        <span className="playlist-cover large">
          {playlistName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="eyebrow">Playlist</p>
          <h2>{playlistName}</h2>
          <p>
            {playlistSongs.length}{" "}
            {playlistSongs.length === 1 ? "song" : "songs"}
          </p>
        </div>
        <button
          className="playlist-delete-button"
          onClick={() => actions.deletePlaylist(playlistName)}
        >
          Delete
        </button>
      </div>

      <div className="section-heading">
        <h3>Songs</h3>
        <button
          className="primary-button"
          disabled={!state.selectedSong}
          onClick={() =>
            actions.addSongToPlaylist(playlistName, state.selectedSong)
          }
        >
          Add Current Song
        </button>
      </div>

      <div className="playlist-song-list">
        {playlistSongs.map((song, index) => {
          const isFavorite = state.favorites.includes(song);
          const isSelectedSong = state.selectedSong === song;
          const isPlaying =
            isSelectedSong &&
            state.action?.intent === "play_song" &&
            state.action.song === song;
          const displayName = getDisplayName(song);

          return (
            <article
              key={song}
              className={`playlist-track-card ${isPlaying ? "active" : ""}`}
            >
              <IconButton
                className={`track-play-button ${isPlaying ? "active" : ""}`}
                ariaLabel={isPlaying ? "Pause" : "Play"}
                onClick={() => handlePlayPause(song)}
              >
                {isPlaying ? "❚❚" : "▶"}
              </IconButton>

              <button
                className="playlist-track-main"
                onClick={() => actions.onSongSelect(song, ROUTES.PLAYER)}
              >
                <span className="track-index">{index + 1}</span>
                <span className="track-cover">
                  <span>{displayName.slice(0, 1).toUpperCase()}</span>
                </span>
                <span className="track-copy">
                  <strong>{displayName}</strong>
                  <small>{isSelectedSong ? "Selected" : playlistName}</small>
                </span>
              </button>

              <div className="track-meta">
                {isPlaying && <span className="song-badge">Playing</span>}
                <span className="track-format">MP3</span>
                <IconButton
                  className={`track-action-button ${isFavorite ? "active" : ""}`}
                  ariaLabel={isFavorite ? "Remove favorite" : "Add favorite"}
                  onClick={() => actions.toggleFavorite(song)}
                >
                  {isFavorite ? "♥" : "♡"}
                </IconButton>
                <IconButton
                  className="song-remove"
                  ariaLabel="Remove from playlist"
                  onClick={() =>
                    actions.removeSongFromPlaylist(playlistName, song)
                  }
                >
                  ✕
                </IconButton>
              </div>
            </article>
          );
        })}

        {playlistSongs.length === 0 && (
          <div className="library-empty">
            This playlist is ready for its first song.
          </div>
        )}
      </div>
    </section>
  );
}
