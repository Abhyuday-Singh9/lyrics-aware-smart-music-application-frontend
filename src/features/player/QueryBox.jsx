import { useEffect, useState } from "react";
import { fetchJson, getDisplayError } from "../../services/api";

function buildRequestBody({ song, start, end }) {
  return {
    song,
    mode: "lyrics",
    start,
    end,
  };
}

export default function QueryBox({ songs, song, setSong, setAction }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [debouncedStart, setDebouncedStart] = useState("");
  const [debouncedEnd, setDebouncedEnd] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSectionLoading, setIsSectionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStart(start);
      setDebouncedEnd(end);
    }, 300);

    return () => clearTimeout(timer);
  }, [start, end]);

  async function handleSubmit() {
    if (!song || isLoading) return;

    const trimmedStart = debouncedStart.trim();
    const trimmedEnd = debouncedEnd.trim();
    if (!trimmedStart) {
      setErrorMessage("Enter a start lyric before requesting a play range.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const data = await fetchJson("/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildRequestBody({
            song,
            start: trimmedStart,
            end: trimmedEnd,
          }),
        ),
      });

      if (data.intent === "not_found") {
        setErrorMessage("Could not match that lyric range in the selected song.");
        return;
      }

      setAction(data);
    } catch (err) {
      console.error("Query failed", err);
      setErrorMessage(getDisplayError(err, "Play range request failed.").message);
    } finally {
      setIsLoading(false);
    }
  }

  async function playSection(section, index = 0, loop = false) {
    if (!song || !section || isSectionLoading) return;

    setErrorMessage("");
    setIsSectionLoading(true);

    try {
      const data = await fetchJson("/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          song,
          mode: "section",
          section,
          index,
        }),
      });

      if (data.intent === "play_range") {
        setAction(loop ? { ...data, loop: true } : data);
      } else {
        setErrorMessage(`No ${section} section was found for this song.`);
        setAction(data);
      }
    } catch (err) {
      console.error("Section query failed", err);
      setErrorMessage(getDisplayError(err, "Section request failed.").message);
    } finally {
      setIsSectionLoading(false);
    }
  }

  async function handleSkipIntro() {
    if (!song || isSectionLoading) return;

    setErrorMessage("");
    setIsSectionLoading(true);
    try {
      const data = await fetchJson("/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          song,
          mode: "section",
          section: "intro",
          index: 0,
        }),
      });

      if (data.intent === "play_range" && data.endTime != null) {
        setAction({
          intent: "play_range",
          startTime: data.endTime + 1,
          endTime: null,
        });
      } else {
        setErrorMessage("No intro section was found to skip.");
        setAction({ intent: "not_found" });
      }
    } catch (err) {
      console.error("Skip intro request failed", err);
      setErrorMessage(getDisplayError(err, "Skip intro request failed.").message);
    } finally {
      setIsSectionLoading(false);
    }
  }

  return (
    <div className="query-card" style={containerStyle}>
      <div className="card-header">
        <div>
          <p className="eyebrow">Quick Actions</p>
        </div>
      </div>

      <select
        value={song}
        onChange={(e) => setSong(e.target.value)}
        style={inputStyle}
        className="query-select"
      >
        <option value="" disabled>
          Choose a song
        </option>
        {songs.map((entry, index) => (
          <option key={index} value={entry}>
            {entry}
          </option>
        ))}
      </select>

      <div className="query-grid">
        <input
          placeholder="Start lyric"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="End lyric"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          style={inputStyle}
        />
      </div>

      <button
        onClick={handleSubmit}
        style={buttonStyle}
        disabled={isLoading}
        className="query-primary-button"
      >
        {isLoading ? "Loading..." : "Play Range"}
      </button>

      {errorMessage && (
        <div
          role="alert"
          style={{
            marginTop: "10px",
            borderRadius: "8px",
            padding: "10px 12px",
            background: "rgba(168, 50, 50, 0.2)",
            border: "1px solid rgba(255, 120, 120, 0.35)",
            color: "#ffd7d7",
            fontSize: "14px",
          }}
        >
          {errorMessage}
        </div>
      )}

      <div style={quickControlsStyle}>
        <button
          onClick={handleSkipIntro}
          style={quickButtonStyle}
          disabled={isSectionLoading}
          className="query-secondary-button"
        >
          Skip Intro
        </button>
        <button
          onClick={() => playSection("chorus")}
          style={quickButtonStyle}
          disabled={isSectionLoading}
          className="query-secondary-button"
        >
          Play Chorus
        </button>
        <button
          onClick={() => playSection("chorus", 0, true)}
          style={quickButtonStyle}
          disabled={isSectionLoading}
          className="query-secondary-button"
        >
          Chorus Loop
        </button>
      </div>
    </div>
  );
}

const containerStyle = {
  background: "#111",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  width: "650px",
  boxSizing: "border-box",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "none",
  background: "#222",
  color: "#fff",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "none",
  background: "#ffd54f",
  color: "#000",
  fontWeight: "bold",
  cursor: "pointer",
};

const quickControlsStyle = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  marginTop: "10px",
};

const quickButtonStyle = {
  padding: "9px 8px",
  borderRadius: "8px",
  border: "none",
  background: "#2a2a2a",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "12px",
};
