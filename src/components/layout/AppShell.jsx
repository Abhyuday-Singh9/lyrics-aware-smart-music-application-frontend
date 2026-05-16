import { useState } from "react";
import { ROUTES } from "../../app/routes";
import MiniPlayerBar from "./MiniPlayerBar";
import SongSidebar from "./SongSidebar";

const NAV_ITEMS = [
  { id: ROUTES.HOME, label: "Home" },
  { id: ROUTES.PLAYER, label: "Now Playing" },
  { id: ROUTES.PLAYLISTS, label: "Playlists" },
];

function isNavActive(activeRoute, itemId) {
  if (itemId === ROUTES.PLAYLISTS) {
    return (
      activeRoute === ROUTES.PLAYLISTS ||
      activeRoute === ROUTES.PLAYLIST_DETAIL
    );
  }

  return activeRoute === itemId;
}

export default function AppShell({
  activeRoute,
  background,
  state,
  actions,
  children,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);
  const showMiniPlayer = activeRoute !== ROUTES.PLAYER && state.selectedSong;

  return (
    <div
      className={`app-shell ${isMenuOpen ? "menu-open" : ""} ${
        showMiniPlayer ? "has-mini-player" : ""
      }`}
      style={{
        background,
        transition: "background 1.5s ease",
      }}
    >
      <button
        className={`menu-backdrop ${isMenuOpen ? "visible" : ""}`}
        onClick={closeMenu}
        aria-label="Close library menu"
      />

      <SongSidebar
        isOpen={isMenuOpen}
        onClose={closeMenu}
        songs={state.songs}
        selected={state.selectedSong}
        setSong={(song) => {
          actions.onSongSelect(song);
          closeMenu();
        }}
        favorites={state.favorites}
        onToggleFavorite={actions.toggleFavorite}
        recentSongs={state.recentSongs}
        playlists={state.playlists}
        onCreatePlaylist={actions.createPlaylist}
        onDeletePlaylist={actions.deletePlaylist}
        onAddSongToPlaylist={actions.addSongToPlaylist}
        onOpenPlaylist={(playlistName) => {
          actions.onPlaylistOpen(playlistName);
          closeMenu();
        }}
        onRemoveSongFromPlaylist={actions.removeSongFromPlaylist}
      />

      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title-row">
            <button
              className="menu-toggle"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close library menu" : "Open library menu"}
            >
              <span />
              <span />
              <span />
            </button>

            <div>
              <p className="eyebrow">AI Music</p>
              <h1>Music Studio</h1>
            </div>
          </div>

          <nav className="page-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-pill ${isNavActive(activeRoute, item.id) ? "active" : ""}`}
                onClick={() => {
                  actions.onNavigate(item.id);
                  closeMenu();
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        {state.appError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "rgba(137, 30, 30, 0.88)",
              border: "1px solid rgba(255,255,255,0.16)",
              color: "#fff4f4",
            }}
          >
            <span>{state.appError}</span>
            <button
              type="button"
              onClick={actions.clearAppError}
              style={{
                border: "none",
                borderRadius: "8px",
                padding: "6px 10px",
                background: "rgba(255,255,255,0.14)",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {children}
      </main>

      {showMiniPlayer && <MiniPlayerBar state={state} actions={actions} />}
    </div>
  );
}
