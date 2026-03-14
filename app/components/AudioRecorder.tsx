"use client";

// ═══════════════════════════════════════════════════════════
// components/AudioRecorder.tsx — Nakama Chat
// Grabador de audio estilo WhatsApp:
//  - Click en mic → comienza a grabar
//  - Waveform animado en tiempo real (visualizer)
//  - Deslizar a la derecha para cancelar
//  - Botón de enviar o cancelar
//  - Sube via XHR con progreso
// ═══════════════════════════════════════════════════════════

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Mic, MicOff, Send, X, Trash2, Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type AudioFile = {
  url: string;
  duration: number;
  mimeType: string;
  size: number;
  waveform?: number[]; // normalized 0-1 values for display
};

interface Props {
  onAudioSend: (audio: AudioFile) => void;
  disabled?: boolean;
}

type RecordState =
  | { phase: "idle" }
  | { phase: "recording"; startTime: number; duration: number }
  | { phase: "preview";   blob: Blob; duration: number; localUrl: string; waveform: number[] }
  | { phase: "uploading"; blob: Blob; duration: number; localUrl: string; waveform: number[]; progress: number }
  | { phase: "error";     blob: Blob; duration: number; localUrl: string; waveform: number[]; errorMsg: string };

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AudioRecorder({ onAudioSend, disabled }: Props) {
  const [state, setState]             = useState<RecordState>({ phase: "idle" });
  const [permissionDenied, setPermDenied] = useState(false);

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const streamRef         = useRef<MediaStream | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const animFrameRef      = useRef<number>(0);
  const durationRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const xhrRef            = useRef<XMLHttpRequest | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);

  // Visual bars state (real-time waveform)
  const [bars, setBars]   = useState<number[]>(Array(30).fill(0.05));
  const BAR_COUNT = 30;

  // ── Cleanup ───────────────────────────────────────────────
  const stopEverything = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    clearInterval(durationRef.current!);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    streamRef.current  = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    mediaRecorderRef.current = null;
    waveformSamplesRef.current = [];
    setBars(Array(BAR_COUNT).fill(0.05));
  }, []);

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    stopEverything();
    setState({ phase: "idle" });
  }, [stopEverything]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopEverything();
    xhrRef.current?.abort();
  }, [stopEverything]);

  // ── Start recording ───────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermDenied(false);

      // Audio context for visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg;codecs=opus";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const localUrl = URL.createObjectURL(blob);
        const duration = Math.round((Date.now() - startTime) / 1000);
        // Downsample collected waveform to BAR_COUNT points
        const raw  = waveformSamplesRef.current;
        const step = Math.max(1, Math.floor(raw.length / BAR_COUNT));
        const waveform: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const slice = raw.slice(i * step, (i + 1) * step);
          waveform.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0.05);
        }
        setState({ phase: "preview", blob, duration, localUrl, waveform });
        setBars(waveform);
        stopEverything();
      };

      const startTime = Date.now();
      recorder.start(100);

      setState({ phase: "recording", startTime, duration: 0 });

      // Duration ticker
      durationRef.current = setInterval(() => {
        setState(prev =>
          prev.phase === "recording"
            ? { ...prev, duration: Math.round((Date.now() - startTime) / 1000) }
            : prev
        );
      }, 500);

      // Visualizer loop
      const bufLen = analyser.frequencyBinCount;
      const dataArr = new Uint8Array(bufLen);

      function drawFrame() {
        animFrameRef.current = requestAnimationFrame(drawFrame);
        analyser.getByteFrequencyData(dataArr);
        const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
          const idx = Math.floor((i / BAR_COUNT) * bufLen);
          const val = dataArr[idx] / 255;
          return Math.max(0.05, val);
        });
        setBars(newBars);
        // Sample for waveform export
        const avg = newBars.reduce((a, b) => a + b, 0) / BAR_COUNT;
        waveformSamplesRef.current.push(avg);
      }
      drawFrame();

    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermDenied(true);
      }
    }
  }, [disabled, stopEverything]);

  // ── Stop recording → go to preview ───────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(durationRef.current!);
    mediaRecorderRef.current?.stop();
  }, []);

  // ── Upload & send ─────────────────────────────────────────
  const uploadAndSend = useCallback(() => {
    const s = state as any;
    if (!s.blob) return;

    setState(prev => ({
      phase:    "uploading",
      blob:     (prev as any).blob,
      duration: (prev as any).duration,
      localUrl: (prev as any).localUrl,
      waveform: (prev as any).waveform,
      progress: 0,
    }));

    const token = localStorage.getItem("nakama_token");
    const ext  = s.blob.type.includes("webm") ? "webm" : "ogg";
    const formData = new FormData();
    formData.append("file", s.blob, `audio.${ext}`);
    formData.append("type", "audio");
    formData.append("duration", String(s.duration));

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 95);
        setState(prev =>
          prev.phase === "uploading" ? { ...prev, progress: pct } : prev
        );
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const result: AudioFile = {
            url:      data.url || data.secure_url,
            duration: s.duration,
            mimeType: s.blob.type,
            size:     s.blob.size,
            waveform: s.waveform,
          };
          onAudioSend(result);
          reset();
        } catch {
          setState(prev => ({
            ...prev,
            phase:    "error",
            errorMsg: "Respuesta inválida del servidor",
          }) as any);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          setState(prev => ({ ...prev, phase: "error", errorMsg: err.message || `Error ${xhr.status}` }) as any);
        } catch {
          setState(prev => ({ ...prev, phase: "error", errorMsg: `Error ${xhr.status}` }) as any);
        }
      }
    });

    xhr.addEventListener("error", () =>
      setState(prev => ({ ...prev, phase: "error", errorMsg: "Error de red" }) as any)
    );
    xhr.addEventListener("abort", () => {});

    xhr.open("POST", `${API}/uploads/chat-file`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  }, [state, onAudioSend, reset]);

  // ─── Render ───────────────────────────────────────────────

  // IDLE: just show mic button
  if (state.phase === "idle") {
    return (
      <button
        className={`chat-icon-btn aud-mic-btn ${disabled ? "aud-mic-btn--disabled" : ""} ${permissionDenied ? "aud-mic-btn--denied" : ""}`}
        onMouseDown={startRecording}
        onTouchStart={startRecording}
        disabled={disabled}
        title={permissionDenied ? "Permiso de micrófono denegado" : "Mantener para grabar"}
      >
        {permissionDenied ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    );
  }

  // RECORDING: show full recording bar
  if (state.phase === "recording") {
    return (
      <div className="aud-recording-bar">
        {/* Cancel (swipe left sim) */}
        <button className="aud-cancel-rec-btn" onClick={reset} title="Cancelar">
          <Trash2 size={15} />
        </button>

        {/* Waveform */}
        <div className="aud-waveform aud-waveform--live">
          {bars.map((h, i) => (
            <div
              key={i}
              className="aud-bar aud-bar--live"
              style={{ "--bar-h": h } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Duration */}
        <span className="aud-duration aud-duration--rec">
          <span className="aud-rec-dot" />
          {formatDuration(state.duration)}
        </span>

        {/* Stop / send */}
        <button className="aud-send-btn" onClick={stopRecording} title="Detener y previsualizar">
          <Send size={16} />
        </button>
      </div>
    );
  }

  // PREVIEW / UPLOADING / ERROR: show preview bar
  const s = state as any;
  const isUploading = state.phase === "uploading";
  const isError     = state.phase === "error";

  return (
    <div className="aud-preview-bar">
      {/* Discard */}
      <button className="aud-cancel-rec-btn" onClick={reset} title="Descartar">
        <X size={15} />
      </button>

      {/* Waveform preview (static bars) */}
      <div className="aud-waveform aud-waveform--preview">
        {bars.map((h, i) => {
          const filled = isUploading
            ? i < Math.floor((state.progress / 100) * BAR_COUNT)
            : false;
          return (
            <div
              key={i}
              className={`aud-bar aud-bar--preview ${filled ? "aud-bar--filled" : ""}`}
              style={{ "--bar-h": h } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* Duration */}
      <span className="aud-duration">
        {isUploading
          ? `${state.progress}%`
          : formatDuration(s.duration)}
      </span>

      {/* Actions */}
      {isUploading ? (
        <div className="aud-uploading-label">
          <Loader2 size={14} className="niu-spin" />
        </div>
      ) : isError ? (
        <button
          className="aud-send-btn aud-send-btn--retry"
          onClick={uploadAndSend}
          title="Reintentar"
        >
          <span style={{ fontSize: "0.7rem" }}>↺</span>
        </button>
      ) : (
        <button className="aud-send-btn" onClick={uploadAndSend} title="Enviar audio">
          <Send size={16} />
        </button>
      )}

      {isError && (
        <span className="aud-error-label">{s.errorMsg}</span>
      )}
    </div>
  );
}