import { useMemo, useState } from "react";
import { getPlaylistNames } from "../app/musicLibrary";

export default function PlaylistsPage({ state, actions }) {
  const playlistNames = useMemo(
    () => getPlaylistNames(state.playlists),
    [state.playlists],
  );
  const [playlistName, setPlaylistName] = useState("");

  const handleCreate = () => {
    const trimmedName = playlistName.trim();

    if (actions.createPlaylist(trimmedName)) {
      setPlaylistName("");
      actions.onPlaylistOpen(trimmedName);
    }
  };

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Collections</p>
          <h2>Playlists</h2>
        </div>
      </div>

      <div className="playlist-create-panel">
        <input
          value={playlistName}
          onChange={(event) => setPlaylistName(event.target.value)}
          placeholder="New playlist"
          className="library-input"
        />
        <button className="library-action" onClick={handleCreate}>
          Create
        </button>
      </div>

      <div className="playlist-grid">
        {playlistNames.map((name) => {
          const songCount = state.playlists[name].length;

          return (
            <article key={name} className="playlist-card">
              <button
                className="playlist-card-main"
                onClick={() => actions.onPlaylistOpen(name)}
              >
                <span className="playlist-cover">
                  {name.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{name}</strong>
                  <small>
                    {songCount} {songCount === 1 ? "song" : "songs"}
                  </small>
                </span>
              </button>
              <button
                className="playlist-delete-button"
                onClick={() => actions.deletePlaylist(name)}
              >
                Delete
              </button>
            </article>
          );
        })}

        {playlistNames.length === 0 && (
          <div className="library-empty">Create a playlist to begin.</div>
        )}
      </div>
    </section>
  );
}
