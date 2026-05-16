import { useRef, useState } from "react";
import IconButton from "../components/IconButton";
import GlobalLyricsSearch from "../features/player/GlobalLyricsSearch";
import Lyrics from "../features/player/Lyrics";
import Player from "../features/player/Player";
import QueryBox from "../features/player/QueryBox";
import { API_BASE_URL, fetchJson, getDisplayError } from "../services/api";

const ICON_SHUFFLE = "\u21c6";
const TARGET_SAMPLE_RATE = 16000;
const VOICE_CAPTURE_MS = 5000;

function encodeWav(samples, sampleRate) {
  const pcmBuffer = new ArrayBuffer(samples.length * 2);
  const pcmView = new DataView(pcmBuffer);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    pcmView.setInt16(
      index * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true,
    );
  }

  const wavBuffer = new ArrayBuffer(44 + pcmBuffer.byteLength);
  const wavView = new DataView(wavBuffer);
  const writeText = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      wavView.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  wavView.setUint32(4, 36 + pcmBuffer.byteLength, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  wavView.setUint32(16, 16, true);
  wavView.setUint16(20, 1, true);
  wavView.setUint16(22, 1, true);
  wavView.setUint32(24, sampleRate, true);
  wavView.setUint32(28, sampleRate * 2, true);
  wavView.setUint16(32, 2, true);
  wavView.setUint16(34, 16, true);
  writeText(36, "data");
  wavView.setUint32(40, pcmBuffer.byteLength, true);

  new Uint8Array(wavBuffer, 44).set(new Uint8Array(pcmBuffer));

  return new Blob([wavBuffer], { type: "audio/wav" });
}

function downsampleAudioBuffer(samples, sourceSampleRate, targetSampleRate) {
  if (sourceSampleRate === targetSampleRate) {
    return samples;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const result = new Float32Array(outputLength);

  let outputIndex = 0;
  let inputIndex = 0;

  while (outputIndex < outputLength) {
    const nextInputIndex = Math.min(
      samples.length,
      Math.round((outputIndex + 1) * ratio),
    );
    let sum = 0;
    let count = 0;

    for (let index = inputIndex; index < nextInputIndex; index += 1) {
      sum += samples[index];
      count += 1;
    }

    result[outputIndex] = count > 0 ? sum / count : samples[inputIndex] || 0;
    outputIndex += 1;
    inputIndex = nextInputIndex;
  }

  return result;
}

async function recordVoiceSnippet(durationMs) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not supported in this browser");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: true,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silenceGain = audioContext.createGain();
  const chunks = [];

  processor.onaudioprocess = (event) => {
    const channelData = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(channelData));
  };

  source.connect(processor);
  silenceGain.gain.value = 0;
  processor.connect(silenceGain);
  silenceGain.connect(audioContext.destination);

  await new Promise((resolve) => window.setTimeout(resolve, durationMs));

  processor.disconnect();
  source.disconnect();
  silenceGain.disconnect();
  stream.getTracks().forEach((track) => track.stop());
  await audioContext.close();

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!totalLength) {
    throw new Error("No speech detected");
  }

  const samples = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    samples.set(chunk, offset);
    offset += chunk.length;
  });

  const normalizedSamples = downsampleAudioBuffer(
    samples,
    audioContext.sampleRate,
    TARGET_SAMPLE_RATE,
  );

  return encodeWav(normalizedSamples, TARGET_SAMPLE_RATE);
}

function VoiceMicButton({ song, setAction }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const activeRunRef = useRef(0);

  const labels = {
    idle: "Voice Range",
    processing: "Processing...",
    recording: "Recording...",
  };

  async function handleVoiceCapture() {
    if (!song || status !== "idle") {
      return;
    }

    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    setMessage("");
    setStatus("recording");

    try {
      const audioBlob = await recordVoiceSnippet(VOICE_CAPTURE_MS);

      if (activeRunRef.current !== runId) {
        return;
      }

      setStatus("processing");

      const voiceResponse = await fetch(`${API_BASE_URL}/voice`, {
        method: "POST",
        headers: {
          "Content-Type": "audio/wav",
        },
        body: audioBlob,
      });
      const voicePayload = await voiceResponse.json().catch(() => ({}));

      if (!voiceResponse.ok || voicePayload.success === false) {
        throw new Error(voicePayload.error || "Voice recognition failed");
      }

      const recognizedText =
        typeof voicePayload.text === "string" ? voicePayload.text.trim() : "";
      const parsed = voicePayload.parsed;

      if (!recognizedText) {
        setMessage("No speech detected");
        return;
      }

      if (
        !parsed ||
        parsed.mode !== "lyrics" ||
        typeof parsed.start !== "string" ||
        typeof parsed.end !== "string"
      ) {
        setMessage(`Command not recognized. Heard: "${recognizedText}"`);
        return;
      }

      const queryAction = await fetchJson("/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          song,
          mode: "lyrics",
          start: parsed.start,
          end: parsed.end,
        }),
      });

      setAction(queryAction);
      setMessage(`Heard: "${recognizedText}"`);
    } catch (error) {
      console.error("Voice control failed", error);
      setMessage(getDisplayError(error, "Voice control failed.").message);
    } finally {
      if (activeRunRef.current === runId) {
        setStatus("idle");
      }
    }
  }

  return (
    <div className="voice-control">
      <button
        type="button"
        onClick={handleVoiceCapture}
        disabled={!song || status !== "idle"}
        className={`voice-mic-button ${status}`}
        aria-live="polite"
      >
        <span aria-hidden="true">{"\u{1F3A4}"}</span>
        <span>{labels[status]}</span>
      </button>

      <p className="voice-control-message">
        {message || 'Try: "from hello to goodbye"'}
      </p>
    </div>
  );
}

export default function PlayerPage({ state, actions }) {
  return (
    <section className="player-page">
      <div className="player-workspace">
        <GlobalLyricsSearch
          onSongSelect={actions.onSongSelect}
          setAction={actions.setAction}
        />

        <div className="player-toolbar">
          <div className="player-toolbar-copy">
            <p className="eyebrow">Playback</p>
          </div>

          <div className="mode-row" role="group" aria-label="Playback controls">
            <button
              onClick={actions.onChorusOnlyToggle}
              className={`mode-toggle ${state.chorusOnlyMode ? "active" : ""}`}
            >
              {state.chorusOnlyMode ? "Play Full Song" : "Chorus Only Mode"}
            </button>
            <IconButton
              onClick={() =>
                actions.onPlaybackModeChange(
                  state.playbackMode === "shuffle" ? "normal" : "shuffle",
                )
              }
              className={`mode-toggle mode-toggle-icon ${state.playbackMode === "shuffle" ? "active" : ""}`}
              title={`Shuffle ${state.playbackMode === "shuffle" ? "off" : "on"}`}
              ariaLabel={`Shuffle ${state.playbackMode === "shuffle" ? "off" : "on"}`}
            >
              {ICON_SHUFFLE}
            </IconButton>
            <button
              onClick={actions.onAutoNextToggle}
              className={`mode-toggle ${state.autoNextEnabled ? "active" : ""}`}
            >
              Auto Next: {state.autoNextEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <div className="player-query-stack">
          <QueryBox
            songs={state.songs}
            song={state.selectedSong}
            setSong={actions.onSongSelect}
            setAction={actions.setAction}
          />

          <VoiceMicButton
            song={state.selectedSong}
            setAction={actions.setAction}
          />
        </div>

        <Player
          action={state.action}
          song={state.selectedSong}
          chorusOnlyMode={state.chorusOnlyMode}
          sections={state.sections}
          setLoading={actions.setLoading}
          onSongEnded={actions.onSongEnded}
          onPlayNext={actions.onPlayNext}
          onPlayPrevious={actions.onPlayPrevious}
          onThemeChange={actions.onThemeChange}
        />
      </div>

      <Lyrics song={state.selectedSong} setAction={actions.setAction} />
    </section>
  );
}
