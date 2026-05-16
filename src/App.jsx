import React, { useEffect, useMemo, useState } from "react";
import AppShell from "./components/layout/AppShell";
import { ROUTES } from "./app/routes";
import {
  DEFAULT_THEME,
  getBackgroundStyle,
  updateRecentSongs,
} from "./app/musicLibrary";
import HomePage from "./pages/HomePage";
import PlayerPage from "./pages/PlayerPage";
import PlaylistDetailPage from "./pages/PlaylistDetailPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import { fetchJson, getErrorMessage } from "./services/api";
import { validateAction } from "./utils/actions";

export default function App() {
  const [route, setRoute] = useState(ROUTES.HOME);
  const [selectedPlaylistName, setSelectedPlaylistName] = useState("");
  const [songs, setSongs] = useState([]);
  const [song, setSong] = useState("");
  const [action, setAction] = useState(null);
  const [chorusOnlyMode, setChorusOnlyMode] = useState(false);
  const [sections, setSections] = useState([]);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME);
  const [favorites, setFavorites] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [playlists, setPlaylists] = useState({});
  const [playbackMode, setPlaybackMode] = useState("normal");
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [loading, setLoading] = useState({
    history: false,
    library: false,
    query: false,
  });
  const [appError, setAppError] = useState("");

  const safelySetAction = (nextAction) => {
    if (nextAction === null) {
      setAction(null);
      return;
    }

    if (!validateAction(nextAction)) {
      console.warn("Ignored invalid player action", nextAction);
      return;
    }

    setAction(nextAction);
  };

  useEffect(() => {
    setLoading((current) => ({ ...current, library: true }));

    fetchJson("/library")
      .then((library) => {
        setFavorites(library.favorites || []);
        setRecentSongs(library.recentSongs || []);
        setPlaylists(library.playlists || {});
        setAppError("");
      })
      .catch((err) => {
        console.error("Failed to load library", err);
        setAppError(getErrorMessage(err, "Failed to load your library."));
      })
      .finally(() => setLoading((current) => ({ ...current, library: false })));
  }, []);

  useEffect(() => {
    fetchJson("/songs")
      .then((data) => {
        setSongs(data);
        if (data.length > 0) {
          setSong((currentSong) => currentSong || data[0]);
        }
        setAppError("");
      })
      .catch((err) => {
        console.error("Failed to load songs", err);
        setAppError(getErrorMessage(err, "Failed to load songs."));
      });
  }, []);

  useEffect(() => {
    if (!song) {
      setSections([]);
      setActiveTheme(DEFAULT_THEME);
      return;
    }

    setRecentSongs((currentRecents) => updateRecentSongs(currentRecents, song));

    setLoading((current) => ({ ...current, query: true }));

    fetchJson("/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song, mode: "tiktok" }),
    })
      .then((data) => {
        if (data.intent === "sections") {
          setSections(Array.isArray(data.sections) ? data.sections : []);
        }
        setAppError("");
      })
      .catch((err) => {
        console.error("Failed to fetch sections:", err);
        setSections([]);
        setAppError(getErrorMessage(err, "Failed to analyze song sections."));
      })
      .finally(() => setLoading((current) => ({ ...current, query: false })));
  }, [song]);

  useEffect(() => {
    if (chorusOnlyMode && sections.length > 0) {
      safelySetAction({ intent: "sections", sections });
    }
  }, [chorusOnlyMode, sections]);

  const handleSongSelect = (nextSong, nextRoute = ROUTES.PLAYER) => {
    if (!nextSong) return;
    setSong(nextSong);
    setRoute(nextRoute);
  };

  const handleChorusOnlyToggle = () => {
    const newMode = !chorusOnlyMode;
    setChorusOnlyMode(newMode);

    if (newMode && sections.length > 0) {
      safelySetAction({ intent: "sections", sections });
    } else if (!newMode) {
      setAction(null);
    }
  };

  const getPlaybackQueue = (currentSong) => {
    const selectedPlaylistSongs = (
      playlists[selectedPlaylistName] || []
    ).filter((item) => songs.includes(item));

    if (
      selectedPlaylistSongs.length > 0 &&
      selectedPlaylistSongs.includes(currentSong)
    ) {
      return selectedPlaylistSongs;
    }

    return songs;
  };

  const getNextSong = (currentSong) => {
    const queue = getPlaybackQueue(currentSong);
    if (!queue.length) return null;

    const currentIndex = queue.indexOf(currentSong);
    if (currentIndex === -1) return queue[0];

    if (playbackMode === "shuffle") {
      if (queue.length === 1) return queue[0];
      const candidates = queue.filter((item) => item !== currentSong);
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    return queue[(currentIndex + 1) % queue.length];
  };

  const getPreviousSong = (currentSong) => {
    const queue = getPlaybackQueue(currentSong);
    if (!queue.length) return null;

    const currentIndex = queue.indexOf(currentSong);
    if (currentIndex === -1) return queue[0];

    return queue[(currentIndex - 1 + queue.length) % queue.length];
  };

  const handleQueueStep = (direction) => {
    if (!song) return;

    const nextSong =
      direction === "previous" ? getPreviousSong(song) : getNextSong(song);

    if (!nextSong) return;

    setSong(nextSong);
    safelySetAction({
      intent: "play_song",
      restart: true,
      song: nextSong,
    });
  };

  const handleSongEnded = (endedSong) => {
    if (!autoNextEnabled) return;

    const nextSong = getNextSong(endedSong || song);
    if (!nextSong || nextSong === song) return;

    setSong(nextSong);
    safelySetAction({
      intent: "play_song",
      restart: true,
      song: nextSong,
    });
  };

  const applyLibraryState = (library) => {
    setFavorites(library.favorites || []);
    setRecentSongs(library.recentSongs || []);
    setPlaylists(library.playlists || {});
  };

  const toggleFavorite = (targetSong) => {
    const isFavorite = favorites.includes(targetSong);

    setFavorites((currentFavorites) => {
      if (currentFavorites.includes(targetSong)) {
        return currentFavorites.filter((item) => item !== targetSong);
      }

      return [...currentFavorites, targetSong];
    });

    if (isFavorite) {
      fetchJson(`/library/favorites/${encodeURIComponent(targetSong)}`, {
        method: "DELETE",
      })
        .then(applyLibraryState)
        .catch((err) => {
          console.error("Failed to remove favorite", err);
          setAppError(getErrorMessage(err, "Failed to update favorites."));
        });
    } else {
      fetchJson("/library/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song: targetSong }),
      })
        .then(applyLibraryState)
        .catch((err) => {
          console.error("Failed to add favorite", err);
          setAppError(getErrorMessage(err, "Failed to update favorites."));
        });
    }
  };

  const createPlaylist = (playlistName) => {
    const trimmedName = playlistName.trim();
    if (!trimmedName) return false;

    let created = false;

    setPlaylists((currentPlaylists) => {
      if (currentPlaylists[trimmedName]) {
        return currentPlaylists;
      }

      created = true;
      return {
        ...currentPlaylists,
        [trimmedName]: [],
      };
    });

    if (created) {
      fetchJson("/library/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      })
        .then(applyLibraryState)
        .catch((err) => {
          console.error("Failed to create playlist", err);
          setAppError(getErrorMessage(err, "Failed to create playlist."));
        });
    }

    return created;
  };

  const addSongToPlaylist = (playlistName, targetSong) => {
    if (!playlistName || !targetSong) return;

    setPlaylists((currentPlaylists) => {
      const playlistSongs = currentPlaylists[playlistName] || [];

      if (playlistSongs.includes(targetSong)) {
        return currentPlaylists;
      }

      return {
        ...currentPlaylists,
        [playlistName]: [...playlistSongs, targetSong],
      };
    });

    fetchJson(`/library/playlists/${encodeURIComponent(playlistName)}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song: targetSong }),
    })
      .then(applyLibraryState)
      .catch((err) => {
        console.error("Failed to add song to playlist", err);
        setAppError(getErrorMessage(err, "Failed to update playlist."));
      });
  };

  const deletePlaylist = (playlistName) => {
    if (!playlistName) return;

    setPlaylists((currentPlaylists) => {
      return Object.fromEntries(
        Object.entries(currentPlaylists).filter(
          ([name]) => name !== playlistName,
        ),
      );
    });

    if (selectedPlaylistName === playlistName) {
      setSelectedPlaylistName("");
      setRoute(ROUTES.PLAYLISTS);
    }

    fetchJson(`/library/playlists/${encodeURIComponent(playlistName)}`, {
      method: "DELETE",
    })
      .then(applyLibraryState)
      .catch((err) => {
        console.error("Failed to delete playlist", err);
        setAppError(getErrorMessage(err, "Failed to delete playlist."));
      });
  };

  const removeSongFromPlaylist = (playlistName, targetSong) => {
    setPlaylists((currentPlaylists) => ({
      ...currentPlaylists,
      [playlistName]: (currentPlaylists[playlistName] || []).filter(
        (item) => item !== targetSong,
      ),
    }));

    fetchJson(
      `/library/playlists/${encodeURIComponent(
        playlistName,
      )}/songs/${encodeURIComponent(targetSong)}`,
      { method: "DELETE" },
    )
      .then(applyLibraryState)
      .catch((err) => {
        console.error("Failed to remove song from playlist", err);
        setAppError(getErrorMessage(err, "Failed to update playlist."));
      });
  };

  const appState = useMemo(
    () => ({
      action,
      chorusOnlyMode,
      favorites,
      playlists,
      recentSongs,
      sections,
      selectedPlaylistName,
      selectedSong: song,
      songs,
      playbackMode,
      autoNextEnabled,
      appError,
      loading,
    }),
    [
      action,
      chorusOnlyMode,
      favorites,
      appError,
      loading,
      playlists,
      recentSongs,
      sections,
      selectedPlaylistName,
      song,
      songs,
      playbackMode,
      autoNextEnabled,
    ],
  );

  const appActions = {
    addSongToPlaylist,
    createPlaylist,
    deletePlaylist,
    onChorusOnlyToggle: handleChorusOnlyToggle,
    onNavigate: setRoute,
    onPlaylistOpen: (playlistName) => {
      setSelectedPlaylistName(playlistName);
      setRoute(ROUTES.PLAYLIST_DETAIL);
    },
    onAutoNextToggle: () => setAutoNextEnabled((current) => !current),
    onPlaybackModeChange: setPlaybackMode,
    onPlayNext: () => handleQueueStep("next"),
    onPlayPrevious: () => handleQueueStep("previous"),
    onSongSelect: handleSongSelect,
    onSongEnded: handleSongEnded,
    onThemeChange: setActiveTheme,
    removeSongFromPlaylist,
    setAction: safelySetAction,
    clearAppError: () => setAppError(""),
    setLoading,
    toggleFavorite,
  };

  return (
    <AppShell
      activeRoute={route}
      background={getBackgroundStyle(activeTheme)}
      state={appState}
      actions={appActions}
    >
      {route === ROUTES.HOME && (
        <HomePage state={appState} actions={appActions} />
      )}

      {route === ROUTES.PLAYER && (
        <PlayerPage state={appState} actions={appActions} />
      )}

      {route === ROUTES.PLAYLISTS && (
        <PlaylistsPage state={appState} actions={appActions} />
      )}

      {route === ROUTES.PLAYLIST_DETAIL && (
        <PlaylistDetailPage state={appState} actions={appActions} />
      )}
    </AppShell>
  );
}
