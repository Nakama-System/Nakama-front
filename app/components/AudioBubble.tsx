"use client";

// ═══════════════════════════════════════════════════════════
// components/AudioBubble.tsx — Nakama Chat
// Reproductor de audio dentro de burbuja de chat
// Muestra waveform interactivo y progreso de reproducción
// ═══════════════════════════════════════════════════════════

import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
  url: string;
  duration: number;       // seconds
  waveform?: number[];    // 0-1 normalized
}

const BAR_COUNT = 30;

function formatDur(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function AudioBubble({ url, duration, waveform }: Props) {
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);   // 0-1
  const [curTime, setCurTime]   = useState(0);

  // Build display bars
  const bars: number[] = waveform && waveform.length > 0
    ? resample(waveform, BAR_COUNT)
    : Array.from({ length: BAR_COUNT }, (_, i) =>
        0.1 + 0.7 * Math.abs(Math.sin(i * 0.55 + 1.2)) * Math.random() * 0.5 + 0.1
      );

  function resample(src: number[], n: number): number[] {
    const out: number[] = [];
    const step = src.length / n;
    for (let i = 0; i < n; i++) {
      const start = Math.floor(i * step);
      const end   = Math.ceil((i + 1) * step);
      const slice = src.slice(start, end);
      out.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0.08);
    }
    return out;
  }

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      const dur = audio.duration || duration || 1;
      setProgress(audio.currentTime / dur);
      setCurTime(audio.currentTime);
    });
    audio.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
      setCurTime(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [url, duration]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function seekTo(i: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration || duration || 1;
    audio.currentTime = (i / BAR_COUNT) * dur;
  }

  const playedBars = Math.floor(progress * BAR_COUNT);

  return (
    <div className="chat-bubble-audio">
      <button className="chat-bubble-audio__play" onClick={togglePlay}>
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>

      <div className="chat-bubble-audio__waveform">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`chat-bubble-audio__bar ${i < playedBars ? "chat-bubble-audio__bar--played" : ""}`}
            style={{ "--bar-h": Math.max(0.08, h) } as React.CSSProperties}
            onClick={() => seekTo(i)}
          />
        ))}
      </div>

      <span className="chat-bubble-audio__dur">
        {playing ? formatDur(curTime) : formatDur(duration)}
      </span>
    </div>
  );
}