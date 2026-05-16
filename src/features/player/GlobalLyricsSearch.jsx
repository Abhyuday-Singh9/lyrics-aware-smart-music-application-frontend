import React, { useEffect, useRef, useState } from "react";
import { fetchJson, getErrorMessage } from "../../services/api";

const DEBOUNCE_MS = 300;

function formatSongName(song = "") {
  return song.replace(/\.[^/.]+$/, "");
}

function formatTime(time) {
  if (!Number.isFinite(time)) {
    return "0:00";
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export default function GlobalLyricsSearch({ onSongSelect, setAction }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setMessage("");
      setIsLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const data = await fetchJson(`/search?q=${encodeURIComponent(trimmedQuery)}`);
        setResults(Array.isArray(data) ? data : []);
        setMessage(Array.isArray(data) && data.length === 0 ? "No matches found" : "");
        setIsOpen(true);
      } catch (error) {
        console.error("Global lyric search failed", error);
        setResults([]);
        setMessage(getErrorMessage(error, "Search failed."));
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  function handleSelect(result) {
    onSongSelect(result.song);
    setAction({
      intent: "seek_lyric",
      time: result.time,
    });
    setQuery(result.text);
    setIsOpen(false);
  }

  return (
    <div className="global-search" ref={containerRef}>
      <div className="global-search-shell">
        <div className="global-search-copy">
          <p className="eyebrow">Global Lyric Search</p>
        </div>

        <div className="global-search-input-wrap">
          <span className="global-search-icon" aria-hidden="true">
            {"\u2315"}
          </span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (results.length || message) {
                setIsOpen(true);
              }
            }}
            placeholder="Search song by lyrics..."
            className="global-search-input"
          />
          {query && (
            <button
              type="button"
              className="global-search-clear"
              onClick={() => {
                setQuery("");
                setResults([]);
                setMessage("");
                setIsOpen(false);
              }}
            >
              Clear
            </button>
          )}
          <span className="global-search-status">
            {isLoading
              ? "Searching..."
              : results.length
                ? `${results.length} match${results.length > 1 ? "es" : ""}`
                : ""}
          </span>
        </div>
      </div>

      {isOpen && (results.length > 0 || message) && (
        <div className="global-search-dropdown">
          {results.map((result) => (
            <button
              key={`${result.song}-${result.time}`}
              type="button"
              className="global-search-result"
              onClick={() => handleSelect(result)}
            >
              <div className="global-search-result-top">
                <strong>{formatSongName(result.song)}</strong>
                <span>{formatTime(result.time)}</span>
              </div>
              <div className="global-search-result-bottom">
                <span>{result.text}</span>
              </div>
            </button>
          ))}

          {!results.length && message && (
            <div className="global-search-empty">{message}</div>
          )}
        </div>
      )}
    </div>
  );
}
