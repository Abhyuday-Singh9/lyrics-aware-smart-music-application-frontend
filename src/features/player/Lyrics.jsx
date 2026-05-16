import React, { useEffect, useRef, useState } from "react";
import { fetchJson, getErrorMessage } from "../../services/api";

function findCurrentIndex(lyrics, time) {
  let low = 0;
  let high = lyrics.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (
      mid === lyrics.length - 1 ||
      (time >= lyrics[mid].time && time < lyrics[mid + 1].time)
    ) {
      return mid;
    }

    if (time < lyrics[mid].time) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return 0;
}

function scrollLineIntoView(container, lineElement, index, previousIndex) {
  if (!container || !lineElement) return;

  const lineRect = lineElement.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const offset =
    lineRect.top -
    containerRect.top -
    containerRect.height / 2 +
    lineRect.height / 2;

  container.scrollBy({
    top: offset,
    behavior: Math.abs(index - previousIndex) > 3 ? "auto" : "smooth",
  });
}

export default function Lyrics({ song, setAction }) {
  const [lyrics, setLyrics] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const containerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!song) {
      setLyrics([]);
      setCurrentIndex(0);
      setErrorMessage("");
      return;
    }

    setIsLoading(true);

    fetchJson(`/lyrics/${encodeURIComponent(song)}`)
      .then((data) => {
        setLyrics(Array.isArray(data) ? data : []);
        setCurrentIndex(0);
        setErrorMessage("");
      })
      .catch((err) => {
        console.error("Lyrics fetch failed", err);
        setLyrics([]);
        setCurrentIndex(0);
        setErrorMessage(getErrorMessage(err, "Failed to load lyrics."));
      })
      .finally(() => setIsLoading(false));
  }, [song]);

  useEffect(() => {
    audioRef.current = document.querySelector("audio");
  }, [song]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || lyrics.length === 0) return;

    let lastIndex = -1;

    const interval = setInterval(() => {
      const syncedTime = audio.currentTime + 0.1;
      const index = findCurrentIndex(lyrics, syncedTime);

      if (index !== lastIndex) {
        const previousIndex = lastIndex;
        lastIndex = index;

        setCurrentIndex(index);
        scrollLineIntoView(
          containerRef.current,
          document.getElementById(`line-${index}`),
          index,
          previousIndex,
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [lyrics]);

  function handleClick(line) {
    if (line?.time == null) return;

    setAction({
      intent: "seek_lyric",
      time: line.time,
    });
  }

  return (
    <div
      className="lyrics-panel"
    >
      <div
        ref={containerRef}
        className="lyrics-card no-scrollbar"
        style={{
          overflowY: "auto",
          padding: "20px",
          textAlign: "center",
          borderRadius: "12px",
          background: "#111",
          color: "#fff",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          width: "650px",
          height: "300px",
        }}
      >
        <div className="card-header lyrics-header">
          <div>
            <p className="eyebrow">Lyrics</p>
            <h3>{song ? song.replace(/\.[^/.]+$/, "") : "No song selected"}</h3>
          </div>
          <small className="card-helper">
            {lyrics.length ? `${lyrics.length} lines` : "Tap to seek"}
          </small>
        </div>

        {isLoading && <div className="lyrics-empty">Loading lyrics...</div>}

        {!isLoading && errorMessage && (
          <div className="lyrics-empty">{errorMessage}</div>
        )}

        {!isLoading && !errorMessage && !lyrics.length && (
          <div className="lyrics-empty">No lyrics.</div>
        )}

        {!isLoading &&
          !errorMessage &&
          lyrics.map((line, i) => {
          const distance = Math.abs(i - currentIndex);

          return (
            <div
              key={i}
              id={`line-${i}`}
              className="lyrics-line"
              onClick={() => handleClick(line)}
              style={{
                padding: "8px 0",
                cursor: "pointer",
                transition: "all 0.25s ease",
                fontSize:
                  i === currentIndex
                    ? "clamp(1.1rem, 3vw, 22px)"
                    : "clamp(0.95rem, 2.3vw, 16px)",
                fontWeight: i === currentIndex ? "bold" : "normal",
                opacity:
                  distance === 0
                    ? 1
                    : distance === 1
                      ? 0.7
                      : distance === 2
                        ? 0.4
                        : 0.2,
                transform: i === currentIndex ? "scale(1.05)" : "scale(1)",
                color: i === currentIndex ? "#ffd54f" : "#ccc",
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
