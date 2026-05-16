import { useCallback, useEffect, useRef, useState } from "react";
import { ROUTES } from "../../app/routes";
import { API_BASE_URL, getSongUrl } from "../../services/api";
import IconButton from "../IconButton";

const ICON_PREVIOUS = "\u23ee";
const ICON_PLAY = "\u25b6";
const ICON_PAUSE = "\u23f8";
const ICON_NEXT = "\u23ed";
const ICON_OPEN = "\u2197";

function getDisplayName(song) {
  return song.replace(/\.[^/.]+$/, "");
}

function formatTime(time) {
  if (!Number.isFinite(time)) return "0:00";

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function findActiveSection(sections, currentTime) {
  return sections.find(
    (section) => currentTime >= section.start && currentTime < section.end,
  );
}

function getSectionSnapshot(section) {
  if (!section) return null;

  return {
    end: section.end,
    start: section.start,
    type: section.type,
  };
}

export default function MiniPlayerBar({ state, actions }) {
  const audioRef = useRef(null);
  const playSessionRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const song = state.selectedSong;

  const startPlaybackSession = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;

    playSessionRef.current = {
      section: getSectionSnapshot(findActiveSection(state.sections, audio.currentTime)),
      song,
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      startedAtSeconds: audio.currentTime,
    };
  }, [song, state.sections]);

  const flushPlaybackSession = useCallback((source = "mini_player") => {
    const audio = audioRef.current;
    const session = playSessionRef.current;

    if (!audio || !session) return;

    const playedSeconds = Math.max((Date.now() - session.startedAtMs) / 1000, 0);
    playSessionRef.current = null;

    if (playedSeconds < 0.5) return;

    fetch(`${API_BASE_URL}/history`, {
      body: JSON.stringify({
        endedAt: new Date().toISOString(),
        endedAtSeconds: audio.currentTime,
        playedSeconds,
        section: session.section,
        song: session.song,
        source,
        startedAt: session.startedAt,
        startedAtSeconds: session.startedAtSeconds,
      }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch((err) => console.error("Failed to save mini player history", err));
  }, []);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    playSessionRef.current = null;
  }, [song]);

  useEffect(() => {
    return () => flushPlaybackSession("mini_player_unmount");
  }, [flushPlaybackSession]);

  if (!song) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      actions.setAction({
        intent: "play_song",
        restart: false,
        song,
      });
      audio.play().catch(() => {});
      return;
    }

    actions.setAction({
      intent: "pause_song",
      song,
    });
    audio.pause();
  };

  const handleProgressClick = (event) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(duration * ratio, duration));
  };

  return (
    <aside className="mini-player-bar" aria-label="Mini player">
      <audio
        ref={audioRef}
        src={getSongUrl(song)}
        onEnded={() => {
          setIsPlaying(false);
          flushPlaybackSession("mini_player_ended");
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPause={() => {
          setIsPlaying(false);
          flushPlaybackSession("mini_player_pause");
        }}
        onPlay={() => {
          setIsPlaying(true);
          startPlaybackSession();
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />

      <div className="mini-player-track">
        <span className="mini-cover">{getDisplayName(song).slice(0, 1).toUpperCase()}</span>
        <span className="mini-copy">
          <strong>{getDisplayName(song)}</strong>
          <small>{formatTime(currentTime)} / {formatTime(duration)}</small>
        </span>
      </div>

      <IconButton
        className="mini-open-button"
        ariaLabel="Previous track"
        onClick={actions.onPlayPrevious}
      >
        {ICON_PREVIOUS}
      </IconButton>

      <IconButton
        className="mini-play-button"
        ariaLabel={isPlaying ? "Pause" : "Play"}
        onClick={handlePlayPause}
      >
        {isPlaying ? ICON_PAUSE : ICON_PLAY}
      </IconButton>

      <IconButton
        className="mini-open-button"
        ariaLabel="Next track"
        onClick={actions.onPlayNext}
      >
        {ICON_NEXT}
      </IconButton>

      <button className="mini-progress" onClick={handleProgressClick} aria-label="Seek">
        <span style={{ width: `${progress}%` }} />
      </button>

      <IconButton
        className="mini-open-button"
        ariaLabel="Open player"
        onClick={() => actions.onNavigate(ROUTES.PLAYER)}
      >
        {ICON_OPEN}
      </IconButton>
    </aside>
  );
}
