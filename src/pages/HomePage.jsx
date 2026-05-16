import { ROUTES } from "../app/routes";
import IconButton from "../components/IconButton";

function SongCard({ song, isFavorite, isRecent, onPlay, onFavorite }) {
  return (
    <article className="song-card">
      <button className="song-card-main" onClick={() => onPlay(song)}>
        <span className="cover-art">{song.slice(0, 1).toUpperCase()}</span>
        <span>
          <strong>{song.replace(".mp3", "")}</strong>
          <small>{isRecent ? "Recently played" : "From your library"}</small>
        </span>
      </button>

      <IconButton
        className={isFavorite ? "active" : ""}
        ariaLabel={isFavorite ? "Remove favorite" : "Add favorite"}
        onClick={() => onFavorite(song)}
      >
        {isFavorite ? "♥" : "♡"}
      </IconButton>
    </article>
  );
}

export default function HomePage({ state, actions }) {
  const recentSongs = state.recentSongs.filter((song) =>
    state.songs.includes(song),
  );
  const featuredSongs = recentSongs.length ? recentSongs : state.songs;
  const favoriteCount = state.favorites.length;
  const playlistCount = Object.keys(state.playlists).length;

  return (
    <section className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Good to hear you</p>
          <h2>Jump back into your music</h2>
          <p>
            Pick a track, read synced lyrics, or let chorus mode find the
            memorable parts for quick playback.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => actions.onNavigate(ROUTES.PLAYER)}
        >
          Open Player
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <span>{state.songs.length}</span>
          <small>Songs</small>
        </div>
        <div className="stat-tile">
          <span>{favoriteCount}</span>
          <small>Favorites</small>
        </div>
        <div className="stat-tile">
          <span>{playlistCount}</span>
          <small>Playlists</small>
        </div>
      </div>

      <section>
        <div className="section-heading">
          <h2>{recentSongs.length ? "Recently Played" : "All Songs"}</h2>
          <button
            className="text-button"
            onClick={() => actions.onNavigate(ROUTES.PLAYER)}
          >
            View player
          </button>
        </div>

        <div className="song-card-grid">
          {featuredSongs.map((song) => (
            <SongCard
              key={song}
              song={song}
              isFavorite={state.favorites.includes(song)}
              isRecent={recentSongs.includes(song)}
              onPlay={actions.onSongSelect}
              onFavorite={actions.toggleFavorite}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
