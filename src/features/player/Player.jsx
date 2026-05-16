import { useCallback, useEffect, useRef, useState } from "react";
import { API, getSongUrl } from "../../services/api";
import IconButton from "../../components/IconButton";

const SECTION_OFFSET_SECONDS = 1;
const DEFAULT_THEME = "default";
const ICON_PREVIOUS = "\u23ee";
const ICON_PLAY = "\u25b6";
const ICON_PAUSE = "\u23f8";
const ICON_NEXT = "\u23ed";
const ICON_SKIP = "\u23ed";
const ICON_LOOP = "\u21bb";

function getDisplayName(song = "") {
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

function getSectionColor(type = "") {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("chorus")) return "#ffd54f";
  if (lowerType.includes("verse")) return "#42a5f5";
  if (lowerType.includes("bridge")) return "#ab47bc";
  return "#757575";
}

function getChorusSections(sections) {
  return sections.filter((section) =>
    section.type?.toLowerCase().includes("chorus"),
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

export default function Player({
  action,
  song,
  chorusOnlyMode,
  sections = [],
  setLoading,
  onSongEnded,
  onPlayNext,
  onPlayPrevious,
  onThemeChange,
}) {
  const audioRef = useRef(null);
  const stopTimeoutRef = useRef(null);
  const dnaBarRef = useRef(null);
  const playSessionRef = useRef(null);

  const [isLooping, setIsLooping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);

  const startPlaybackSession = () => {
    const audio = audioRef.current;
    if (!audio || !song) return;

    playSessionRef.current = {
      section: getSectionSnapshot(findActiveSection(sections, audio.currentTime)),
      song,
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      startedAtSeconds: audio.currentTime,
    };
  };

  const flushPlaybackSession = useCallback((source = "player") => {
    const audio = audioRef.current;
    const session = playSessionRef.current;

    if (!audio || !session) return;

    const endedAtSeconds = audio.currentTime;
    const playedSeconds = Math.max(
      (Date.now() - session.startedAtMs) / 1000,
      0,
    );

    playSessionRef.current = null;

    if (playedSeconds < 0.5) return;

    const payload = {
      endedAt: new Date().toISOString(),
      endedAtSeconds,
      playedSeconds,
      section: session.section,
      song: session.song,
      source,
      startedAt: session.startedAt,
      startedAtSeconds: session.startedAtSeconds,
    };

    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(`${API}/history`, blob);
      return;
    }

    setLoading?.((current) => ({ ...current, history: true }));

    fetch(`${API}/history`, {
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    })
      .catch((err) => console.error("Failed to save playback history", err))
      .finally(() =>
        setLoading?.((current) => ({ ...current, history: false })),
      );
  }, [setLoading]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

      const audio = audioRef.current;
      if (!audio) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (audio.paused) audio.play();
        else audio.pause();
      } else if (e.code === "ArrowRight") {
        audio.currentTime = Math.min(audio.currentTime + 5, duration);
      } else if (e.code === "ArrowLeft") {
        audio.currentTime = Math.max(audio.currentTime - 5, 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration]);

  useEffect(() => {
    const handleBeforeUnload = () => flushPlaybackSession("page_unload");

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushPlaybackSession("player_unmount");
    };
  }, [flushPlaybackSession]);

  useEffect(() => {
    setIsPlaying(false);
  }, [song]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!chorusOnlyMode && action === null) {
      audio.pause();
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      return;
    }

    if (!action || typeof action !== "object" || !action.intent) return;

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    if (action.intent === "play_song") {
      if (action.song === song && action.restart) {
        audio.currentTime = 0;
      }
      audio.play().catch(() => {});
    }

    if (action.intent === "pause_song") {
      audio.pause();
    }

    if (action.intent === "seek_lyric" && action.time != null) {
      audio.currentTime = Math.max(action.time - SECTION_OFFSET_SECONDS, 0);
      audio.play().catch(() => {});
    }

    if (
      !chorusOnlyMode &&
      action.intent === "play_range" &&
      action.startTime != null
    ) {
      audio.currentTime = Math.max(
        action.startTime - SECTION_OFFSET_SECONDS,
        0,
      );
      audio.play().catch(() => {});
    }

    if (chorusOnlyMode && action.intent === "sections") {
      const choruses = getChorusSections(
        Array.isArray(action.sections) ? action.sections : [],
      );

      if (!choruses.length) return;
      let index = 0;

      function playNextSection() {
        if (index >= choruses.length) {
          audio.pause();
          return;
        }

        const { start, end } = choruses[index];
        audio.currentTime = Math.max(start - SECTION_OFFSET_SECONDS, 0);
        audio.play().catch(() => {});

        stopTimeoutRef.current = setTimeout(
          () => {
            index += 1;
            playNextSection();
          },
          (end - start) * 1000,
        );
      }

      playNextSection();
    }

    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, [action, chorusOnlyMode, song]);

  useEffect(() => {
    if (action?.intent === "play_range" && action.loop === true) {
      setIsLooping(true);
    }
  }, [action]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const currentPlaybackTime = audio.currentTime;
    setCurrentTime(currentPlaybackTime);

    if (sections.length > 0) {
      const activeSection = findActiveSection(sections, currentPlaybackTime);
      onThemeChange(
        activeSection ? activeSection.type.toLowerCase() : DEFAULT_THEME,
      );
    }

    if (!chorusOnlyMode && action?.intent === "play_range" && action.endTime) {
      if (currentPlaybackTime >= action.endTime) {
        if (isLooping) {
          audio.currentTime = Math.max(
            action.startTime - SECTION_OFFSET_SECONDS,
            0,
          );
          audio.play().catch(() => {});
        } else {
          audio.pause();
          audio.currentTime = action.endTime - 0.1;
        }
      }
    }
  };

  const handleDNAClick = (event) => {
    if (!audioRef.current || !dnaBarRef.current) return;
    const rect = dnaBarRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;

    audioRef.current.currentTime = percentage * duration;
    audioRef.current.play().catch(() => {});
  };

  const skipIntro = () => {
    if (!audioRef.current || !sections.length) return;
    const introSection = sections.find((section) => section.type === "intro");
    if (introSection) {
      audioRef.current.currentTime = introSection.end;
      audioRef.current.play().catch(() => {});
    }
  };

  const btnStyle = {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    background: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "12px",
    backdropFilter: "blur(5px)",
    transition: "0.2s",
  };

  const activeSection = findActiveSection(sections, currentTime);
  const isIntroPlaying = activeSection?.type === "intro";

  return (
    <div
      className="player-card"
      style={{
        background: "rgba(0, 0, 0, 0.6)",
        padding: "18px 20px 24px",
        borderRadius: "20px",
        marginBottom: "20px",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        width: "650px",
      }}
    >
      <div
        className="player-status-row"
        style={{
          justifyContent: "center",
          marginBottom: song ? "16px" : 0,
        }}
      >
        <span className="player-status-pill">
          {isPlaying ? "Playing" : "Paused"}
        </span>
        <span className="player-status-pill subtle">
          {activeSection?.type || "Full track"}
        </span>
      </div>

      {song && (
        <>
          <audio
            ref={audioRef}
            src={getSongUrl(song)}
            onEnded={() => {
              setIsPlaying(false);
              flushPlaybackSession("ended");
              onSongEnded?.(song);
            }}
            onPause={() => {
              setIsPlaying(false);
              flushPlaybackSession("pause");
            }}
            onPlay={() => {
              setIsPlaying(true);
              startPlaybackSession();
            }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(event) => setDuration(event.target.duration)}
            style={{ display: "none" }}
          />

          <div
            ref={dnaBarRef}
            onClick={handleDNAClick}
            className="player-timeline"
            style={{
              width: "100%",
              height: "14px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "999px",
              marginBottom: "16px",
              display: "flex",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.05)",
            }}
          >
            {sections.map((section, index) => {
              const widthPct = ((section.end - section.start) / duration) * 100;

              return (
                <div
                  key={index}
                  title={section.type}
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: getSectionColor(section.type),
                    borderRight: "1px solid rgba(7, 7, 7, 0.55)",
                    opacity: 0.88,
                    transition: "background 0.2s ease, opacity 0.2s ease",
                  }}
                />
              );
            })}

            <div
              style={{
                position: "absolute",
                top: "-3px",
                bottom: "-3px",
                left: `${(currentTime / duration) * 100}%`,
                width: "3px",
                background: "#fff",
                borderRadius: "999px",
                boxShadow: "0 0 10px rgba(255,255,255,0.7)",
                transform: "translateX(-50%)",
                transition: "left 0.14s ease-out",
              }}
            />
          </div>

          <div className="player-timeline-meta">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div
            className="player-controls"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <IconButton
              ariaLabel="Previous track"
              style={{ ...btnStyle, fontSize: "18px", padding: "8px 16px" }}
              onClick={onPlayPrevious}
              disabled={!song}
            >
              {ICON_PREVIOUS}
            </IconButton>

            <IconButton
              ariaLabel={isPlaying ? "Pause" : "Play"}
              style={{ ...btnStyle, fontSize: "18px", padding: "8px 16px" }}
              onClick={() => {
                if (audioRef.current?.paused) audioRef.current.play();
                else audioRef.current?.pause();
              }}
            >
              {isPlaying ? ICON_PAUSE : ICON_PLAY}
            </IconButton>

            <IconButton
              ariaLabel="Next track"
              style={{ ...btnStyle, fontSize: "18px", padding: "8px 16px" }}
              onClick={onPlayNext}
              disabled={!song}
            >
              {ICON_NEXT}
            </IconButton>

            {isIntroPlaying && (
              <button
                style={{
                  ...btnStyle,
                  background: "#444",
                  border: "1px solid #777",
                }}
                className="player-text-action"
                onClick={skipIntro}
              >
                Skip Intro
              </button>
            )}

            <div
              style={{
                width: "2px",
                background: "rgba(255,255,255,0.2)",
                margin: "0 5px",
                borderRadius: "2px",
              }}
            />

            <IconButton
              onClick={() => setIsLooping(!isLooping)}
              ariaLabel={isLooping ? "Disable loop" : "Enable loop"}
              style={{
                ...btnStyle,
                background: isLooping ? "#ffd54f" : "rgba(255, 255, 255, 0.1)",
                color: isLooping ? "#000" : "#fff",
                fontSize: "18px",
              }}
            >
              {ICON_LOOP}
            </IconButton>
          </div>

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <p className="eyebrow" style={{ marginBottom: 0 }}>
              Now Playing
            </p>
            <h3
              style={{
                margin: 0,
                fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
                lineHeight: 1.05,
                maxWidth: "100%",
                textWrap: "balance",
              }}
            >
              {getDisplayName(song)}
            </h3>
          </div>
        </>
      )}
    </div>
  );
}
