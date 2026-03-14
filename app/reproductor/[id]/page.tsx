"use client";

/**
 * app/reproductor/[id]/page.tsx — Nakama · Video Player
 * Reproductor universal: YouTube embed / Vimeo embed / video directo
 * - Controles nativos para video directo
 * - Embed iframe para YouTube y Vimeo
 * - Preview en miniatura al hover sobre related cards
 * - Keyboard shortcuts (solo en modo video directo)
 */

import {
  useState, useEffect, useRef, useCallback,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type SyntheticEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, SkipBack, SkipForward,
  Gauge, PictureInPicture2, Download, Share2,
  Star, Check, Eye, AlertCircle, Film,
  ArrowLeft, ChevronRight, House, Repeat,
} from "lucide-react";
import { useAuth } from "../../context/authContext";
import type { MovieItem } from "../../types/movie";
import "../../styles/reproductor.css";

/* ── Config ───────────────────────────────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SPEEDS   = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type Speed     = typeof SPEEDS[number];

/* ── Video source detection ───────────────────────────── */
type VideoSourceType = "youtube" | "vimeo" | "direct";

function detectVideoType(url: string): VideoSourceType {
  if (!url) return "direct";
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) return "youtube";
  if (url.includes("vimeo.com/"))                                       return "vimeo";
  return "direct";
}

function extractYouTubeId(url: string): string {
  const m =
    url.match(/youtube\.com\/watch\?v=([^&\s]+)/) ??
    url.match(/youtu\.be\/([^?\s]+)/);
  return m?.[1] ?? "";
}

function extractVimeoId(url: string): string {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ?? "";
}

/* ── Helpers ──────────────────────────────────────────── */
function formatTime(s: number): string {
  if (isNaN(s) || s < 0) return "0:00";
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function bearerHeader(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const CAT_PALETTE: Record<string, { accent: string; bg: string }> = {
  accion:    { accent: "#e63946", bg: "rgba(230,57,70,.12)"   },
  aventura:  { accent: "#ff9f43", bg: "rgba(255,159,67,.12)"  },
  diversion: { accent: "#26de81", bg: "rgba(38,222,129,.12)"  },
  amor:      { accent: "#fd79a8", bg: "rgba(253,121,168,.12)" },
  familia:   { accent: "#74b9ff", bg: "rgba(116,185,255,.12)" },
  comedia:   { accent: "#26de81", bg: "rgba(38,222,129,.12)"  },
  drama:     { accent: "#a29bfe", bg: "rgba(162,155,254,.12)" },
  terror:    { accent: "#e63946", bg: "rgba(230,57,70,.12)"   },
  "sci-fi":  { accent: "#74b9ff", bg: "rgba(116,185,255,.12)" },
  animacion: { accent: "#ff9f43", bg: "rgba(255,159,67,.12)"  },
  romance:   { accent: "#fd79a8", bg: "rgba(253,121,168,.12)" },
};

/* ═══════════════════════════════════════════════════════
   StarRating
   ═══════════════════════════════════════════════════════ */
interface StarRatingProps {
  value:  number;
  onVote: (n: number) => void;
  voted:  boolean;
  size?:  number;
}

function StarRating({ value, onVote, voted, size = 16 }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  return (
    <div className="rp-stars">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          className={["rp-star", n <= Math.round(hover || value) ? "on" : "", voted ? "locked" : ""]
            .filter(Boolean).join(" ")}
          onMouseEnter={() => !voted && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => !voted && onVote(n)}
          title={voted ? "Ya votaste" : `${n} estrella${n > 1 ? "s" : ""}`}
        >
          <Star size={size} fill={n <= Math.round(hover || value) ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EmbedPlayer — YouTube o Vimeo
   ═══════════════════════════════════════════════════════ */
interface EmbedPlayerProps {
  url:       string;
  type:      "youtube" | "vimeo";
  thumbnail: string;
  title:     string;
}

function EmbedPlayer({ url, type, thumbnail, title }: EmbedPlayerProps) {
  const [started, setStarted] = useState(false);

  const embedSrc = type === "youtube"
    ? `https://www.youtube.com/embed/${extractYouTubeId(url)}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`
    : `https://player.vimeo.com/video/${extractVimeoId(url)}?autoplay=1&byline=0&portrait=0`;

  if (!started) {
    return (
      <div
        className="rp-embed-poster"
        onClick={() => setStarted(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setStarted(true); }}
        aria-label={`Reproducir ${title}`}
        style={{ cursor: "pointer", position: "relative", width: "100%", aspectRatio: "16/9", background: "#000" }}
      >
        {thumbnail && (
          <img
            src={thumbnail}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        <div className="rp-idle-play" style={{
          position:        "absolute",
          inset:           0,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "rgba(0,0,0,.35)",
        }}>
          <div style={{
            width:           64,
            height:          64,
            borderRadius:    "50%",
            background:      "rgba(0,0,0,.7)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            backdropFilter:  "blur(4px)",
          }}>
            <Play size={28} fill="#fff" color="#fff" />
          </div>
        </div>

        {/* Badge fuente */}
        <div style={{
          position:     "absolute",
          top:          12,
          right:        12,
          background:   type === "youtube" ? "#ff0000cc" : "#1ab7eacc",
          color:        "#fff",
          fontSize:     11,
          fontWeight:   700,
          padding:      "3px 8px",
          borderRadius: 4,
          backdropFilter: "blur(4px)",
        }}>
          {type === "youtube" ? "▶ YouTube" : "🎬 Vimeo"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", aspectRatio: "16/9", background: "#000" }}>
      <iframe
        src={embedSrc}
        title={title}
        width="100%"
        height="100%"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        style={{ border: "none", display: "block" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MiniPreview floating tooltip
   ═══════════════════════════════════════════════════════ */
interface MiniPreviewProps {
  movie:   MovieItem | null;
  visible: boolean;
  x:       number;
  y:       number;
}

function MiniPreview({ movie, visible, x, y }: MiniPreviewProps) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const type   = movie ? detectVideoType(movie.videoUrl) : "direct";

  useEffect(() => {
    const v = vidRef.current;
    if (!v || !movie?.videoUrl || type !== "direct") return;
    if (visible) {
      v.src = movie.videoUrl;
      v.currentTime = 0;
      v.muted = true;
      void v.play().catch(() => {});
    } else {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
  }, [visible, movie, type]);

  if (!movie) return null;

  const pal  = CAT_PALETTE[movie.category] ?? { accent: "#e63946", bg: "rgba(230,57,70,.12)" };
  const tipW = 260;
  const tipH = 175;
  let left   = x + 16;
  let top    = y - tipH / 2;
  if (typeof window !== "undefined") {
    if (left + tipW > window.innerWidth - 12)  left = x - tipW - 16;
    if (top < 8)                               top  = 8;
    if (top + tipH > window.innerHeight - 8)   top  = window.innerHeight - tipH - 8;
  }

  return (
    <div className={`rp-mini-preview${visible ? " visible" : ""}`} style={{ left, top }}>
      {/* Para YouTube/Vimeo mostramos solo el thumbnail en el mini-preview */}
      {type === "direct" ? (
        <video
          ref={vidRef}
          className="rp-mini-preview__video"
          muted playsInline preload="none"
          poster={movie.thumbnail}
        />
      ) : (
        <img
          src={movie.thumbnail}
          alt={movie.title}
          className="rp-mini-preview__video"
          style={{ objectFit: "cover" }}
        />
      )}
      <div className="rp-mini-preview__info">
        <div className="rp-mini-preview__title">{movie.title}</div>
        <div className="rp-mini-preview__meta">
          <span style={{ color: pal.accent }}>{movie.category}</span>
          <span>·</span><span>{movie.year}</span>
          <span>·</span><span>{movie.duration}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RelatedCard
   ═══════════════════════════════════════════════════════ */
interface RelatedCardProps {
  movie:     MovieItem;
  isCurrent: boolean;
  onSelect:  (m: MovieItem) => void;
  onHover:   (m: MovieItem | null, x: number, y: number) => void;
}

function RelatedCard({ movie, isCurrent, onSelect, onHover }: RelatedCardProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pal        = CAT_PALETTE[movie.category] ?? { accent: "#e63946", bg: "rgba(230,57,70,.12)" };
  const vtype      = detectVideoType(movie.videoUrl);

  const handleMouseEnter = (e: ReactMouseEvent) => {
    // Solo intentar preview de video nativo — YouTube/Vimeo solo muestran thumbnail
    if (vtype === "direct") {
      const v = previewRef.current;
      if (v && movie.videoUrl) {
        v.src         = movie.videoUrl;
        v.muted       = true;
        v.currentTime = 0;
        hoverTimer.current = setTimeout(() => {
          void v.play().catch(() => {});
        }, 400);
      }
    }
    onHover(movie, e.clientX, e.clientY);
  };

  const handleMouseMove  = (e: ReactMouseEvent) => onHover(movie, e.clientX, e.clientY);

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    const v = previewRef.current;
    if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    onHover(null, 0, 0);
  };

  return (
    <div
      className={`rp-related-card${isCurrent ? " active" : ""}`}
      onClick={() => onSelect(movie)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(movie); }}
      aria-label={`Ver ${movie.title}`}
    >
      <div className="rp-related-card__thumb">
        {isCurrent && <span className="rp-now-playing-badge">Reproduciendo</span>}
        <img
          src={movie.thumbnail}
          alt={movie.title}
          className="rp-related-card__img"
          loading="lazy"
          onError={(e: SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = "none";
          }}
        />
        {/* Solo preview de video nativo */}
        {vtype === "direct" && (
          <video
            ref={previewRef}
            className="rp-related-card__preview"
            muted playsInline preload="none"
            poster={movie.thumbnail}
          />
        )}
        <div className="rp-related-card__play-overlay">
          <Play size={18} color="#fff" fill="#fff" />
        </div>
        {/* Badge tipo de fuente */}
        <span style={{
          position:     "absolute",
          bottom:       4,
          left:         4,
          fontSize:     9,
          fontWeight:   700,
          padding:      "2px 5px",
          borderRadius: 3,
          background:   vtype === "youtube" ? "#ff0000cc" : vtype === "vimeo" ? "#1ab7eacc" : "rgba(0,0,0,.6)",
          color:        "#fff",
          backdropFilter: "blur(4px)",
        }}>
          {vtype === "youtube" ? "YT" : vtype === "vimeo" ? "Vimeo" : "MP4"}
        </span>
        <span className="rp-related-card__duration">{movie.duration}</span>
      </div>

      <div className="rp-related-card__body">
        <div className="rp-related-card__title">{movie.title}</div>
        <div className="rp-related-card__meta">
          <span className="rp-related-card__cat" style={{ color: pal.accent }}>
            {movie.category}
          </span>
          <span style={{ color: "var(--rp-text-dim)" }}>·</span>
          <span>{movie.year}</span>
        </div>
        <div className="rp-related-card__views">
          <Eye size={10} />
          {movie.views > 999 ? `${(movie.views / 1000).toFixed(1)}K` : movie.views}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DirectVideoPlayer — controles completos para video nativo
   ═══════════════════════════════════════════════════════ */
interface DirectVideoPlayerProps {
  movie:      MovieItem;
  onEnded:    () => void;
  onError:    () => void;
}

function DirectVideoPlayer({ movie, onEnded, onError }: DirectVideoPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const ctrlTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kbdTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging  = useRef(false);

  const [playing,     setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [buffered,    setBuffered]    = useState(0);
  const [volume,      setVolume]      = useState(1);
  const [muted,       setMuted]       = useState(false);
  const [speed,       setSpeed]       = useState<Speed>(1);
  const [buffering,   setBuffering]   = useState(false);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [pip,         setPip]         = useState(false);
  const [showCtrls,   setShowCtrls]   = useState(true);
  const [speedOpen,   setSpeedOpen]   = useState(false);
  const [loop,        setLoop]        = useState(false);
  const [tooltipTime, setTooltipTime] = useState(0);
  const [tooltipLeft, setTooltipLeft] = useState(0);
  const [kbdHint,     setKbdHint]     = useState("");
  const [kbdVisible,  setKbdVisible]  = useState(false);

  const resetCtrlTimer = useCallback(() => {
    setShowCtrls(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowCtrls(false);
    }, 2800);
  }, []);

  const flashHint = (msg: string) => {
    setKbdHint(msg);
    setKbdVisible(true);
    if (kbdTimer.current) clearTimeout(kbdTimer.current);
    kbdTimer.current = setTimeout(() => setKbdVisible(false), 1000);
  };

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play(); else v.pause();
    resetCtrlTimer();
  }, [resetCtrlTimer]);

  const seek = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
    flashHint(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    resetCtrlTimer();
  }, [resetCtrlTimer]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  };

  const setVolCtrl = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted  = val === 0;
  };

  const setSpeedCtrl = (s: Speed) => {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    setSpeed(s);
    setSpeedOpen(false);
    flashHint(`${s}x`);
  };

  const toggleFullscreen = async () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (!document.fullscreenElement) await wrap.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { /* not supported */ }
  };

  const toggleLoop = () => {
    const v = videoRef.current;
    const next = !loop;
    setLoop(next);
    if (v) v.loop = next;
    flashHint(next ? "Repetir: activado" : "Repetir: desactivado");
  };

  const getProgressFraction = (e: ReactMouseEvent): number => {
    const bar = progressRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  useEffect(() => {
    const onFsChange  = () => setFullscreen(Boolean(document.fullscreenElement));
    const onPipEnter  = () => setPip(true);
    const onPipLeave  = () => setPip(false);
    document.addEventListener("fullscreenchange",       onFsChange);
    document.addEventListener("enterpictureinpicture",  onPipEnter);
    document.addEventListener("leavepictureinpicture",  onPipLeave);
    return () => {
      document.removeEventListener("fullscreenchange",       onFsChange);
      document.removeEventListener("enterpictureinpicture",  onPipEnter);
      document.removeEventListener("leavepictureinpicture",  onPipLeave);
    };
  }, []);

  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    switch (e.key) {
      case " ": case "k": e.preventDefault(); togglePlay(); break;
      case "ArrowRight":  e.preventDefault(); seek(10); break;
      case "ArrowLeft":   e.preventDefault(); seek(-10); break;
      case "ArrowUp":
        e.preventDefault();
        setVolCtrl(Math.min(1, volume + 0.1));
        flashHint(`Vol ${Math.round(Math.min(1, volume + 0.1) * 100)}%`);
        break;
      case "ArrowDown":
        e.preventDefault();
        setVolCtrl(Math.max(0, volume - 0.1));
        flashHint(`Vol ${Math.round(Math.max(0, volume - 0.1) * 100)}%`);
        break;
      case "m": toggleMute(); flashHint(muted ? "Sin silencio" : "Silencio"); break;
      case "f": void toggleFullscreen(); break;
      case "p": void togglePip(); break;
      case "r": toggleLoop(); break;
    }
  }, [togglePlay, seek, volume, muted, toggleLoop]);

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const playedPct   = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered    / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className={`rp-player-wrap${!showCtrls ? " hide-controls" : ""}`}
      onMouseMove={resetCtrlTimer}
      onMouseLeave={() => { if (playing) setShowCtrls(false); }}
      onKeyDown={onKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <video
        ref={videoRef}
        className="rp-video"
        src={movie.videoUrl}
        poster={movie.thumbnail}
        preload="metadata"
        playsInline
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrentTime(v.currentTime);
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) { setDuration(v.duration); setBuffering(false); v.loop = loop; }
        }}
        onPlay={() => { setPlaying(true); resetCtrlTimer(); }}
        onPause={() => { setPlaying(false); setShowCtrls(true); }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onEnded={onEnded}
        onVolumeChange={() => {
          const v = videoRef.current;
          if (v) { setVolume(v.volume); setMuted(v.muted); }
        }}
        onError={onError}
      />

      {/* Idle overlay */}
      <div
        className={`rp-idle-overlay${playing ? " hidden" : ""}`}
        onClick={togglePlay}
        style={{ cursor: "pointer", pointerEvents: playing ? "none" : "all" }}
      >
        <img src={movie.thumbnail} alt="" className="rp-idle-poster" />
        <div className="rp-idle-play" style={{ pointerEvents: "none" }}>
          <Play size={28} fill="currentColor" />
        </div>
      </div>

      {/* Buffering */}
      <div className={`rp-buffering${buffering ? " visible" : ""}`}>
        <div className="rp-buffering__ring" />
      </div>

      {/* Keyboard hint */}
      <div className={`rp-kbd-hint${kbdVisible && kbdHint ? " visible" : ""}`}>
        {kbdHint}
      </div>

      {/* Controls */}
      <div className="rp-controls">
        {/* Progress */}
        <div
          ref={progressRef}
          className="rp-progress"
          role="slider"
          aria-label="Progreso"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          onMouseMove={(e) => {
            const frac = getProgressFraction(e);
            const bar  = progressRef.current;
            if (bar) setTooltipLeft(e.clientX - bar.getBoundingClientRect().left);
            setTooltipTime(frac * duration);
            if (isDragging.current && videoRef.current)
              videoRef.current.currentTime = frac * duration;
          }}
          onMouseDown={(e) => {
            isDragging.current = true;
            if (videoRef.current)
              videoRef.current.currentTime = getProgressFraction(e) * duration;
          }}
          onMouseUp={() => { isDragging.current = false; }}
          onMouseLeave={() => { isDragging.current = false; }}
        >
          <div className="rp-progress__track">
            <div className="rp-progress__buffered" style={{ width: `${bufferedPct}%` }} />
            <div className="rp-progress__played"   style={{ width: `${playedPct}%` }} />
            <div className="rp-progress__thumb"    style={{ left: `${playedPct}%` }} />
          </div>
          <div className="rp-progress__tooltip" style={{ left: tooltipLeft }}>
            {formatTime(tooltipTime)}
          </div>
        </div>

        {/* Buttons */}
        <div className="rp-ctrl-row">
          <button type="button" className="rp-ctrl-btn" onClick={() => seek(-10)} title="Retroceder 10s">
            <SkipBack size={16} />
          </button>
          <button type="button" className="rp-ctrl-btn" onClick={togglePlay}>
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button type="button" className="rp-ctrl-btn" onClick={() => seek(10)} title="Adelantar 10s">
            <SkipForward size={16} />
          </button>

          <div className="rp-vol-cluster">
            <button type="button" className="rp-ctrl-btn" onClick={toggleMute}>
              <VolumeIcon size={16} />
            </button>
            <div className="rp-vol-slider-wrap">
              <input
                type="range" className="rp-vol-slider"
                min={0} max={1} step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => setVolCtrl(parseFloat(e.target.value))}
                aria-label="Volumen"
              />
            </div>
          </div>

          <span className="rp-time">
            <strong>{formatTime(currentTime)}</strong> / {formatTime(duration)}
          </span>

          <div className="rp-ctrl-spacer" />
          <span className="rp-quality-badge">HD</span>

          <div className={`rp-speed-wrap${speedOpen ? " open" : ""}`}>
            <button type="button" className="rp-ctrl-btn" onClick={() => setSpeedOpen((o) => !o)} title="Velocidad">
              <Gauge size={16} />
            </button>
            <div className="rp-speed-menu">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`rp-speed-opt${speed === s ? " active" : ""}`}
                  onClick={() => setSpeedCtrl(s)}
                >
                  {s === 1 ? "Normal" : `${s}×`}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`rp-ctrl-btn${loop ? " active" : ""}`}
            onClick={toggleLoop}
            title="Repetir (r)"
          >
            <Repeat size={16} />
          </button>

          <button
            type="button"
            className={`rp-ctrl-btn${pip ? " active" : ""}`}
            onClick={() => { void togglePip(); }}
            title="Picture-in-Picture (p)"
          >
            <PictureInPicture2 size={16} />
          </button>

          <button
            type="button"
            className="rp-ctrl-btn"
            onClick={() => { void toggleFullscreen(); }}
            title="Pantalla completa (f)"
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PLAYER PAGE
   ═══════════════════════════════════════════════════════ */
export default function ReproductorPage() {
  const params  = useParams();
  const router  = useRouter();
  const { token, isAuthenticated } = useAuth();
  const movieId = params?.id as string | undefined;

  const [movie,    setMovie]    = useState<MovieItem | null>(null);
  const [related,  setRelated]  = useState<MovieItem[]>([]);
  const [loadingM, setLoadingM] = useState(true);
  const [errorM,   setErrorM]   = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  const [rating, setRating] = useState(0);
  const [votes,  setVotes]  = useState(0);
  const [voted,  setVoted]  = useState(false);

  const [previewMovie, setPreviewMovie] = useState<MovieItem | null>(null);
  const [previewPos,   setPreviewPos]   = useState({ x: 0, y: 0 });
  const [previewVis,   setPreviewVis]   = useState(false);

  /* ── fetch ─────────────────────────────────────────── */
  const loadMovie = useCallback(async (id: string) => {
    setLoadingM(true); setErrorM(null); setVideoError(false);
    try {
      const res  = await fetch(`${API_BASE}/moviesup/${id}`, {
        headers: bearerHeader(token), credentials: "include",
      });
      if (!res.ok) throw new Error("Película no encontrada o no publicada");
      const data = await res.json() as MovieItem;
      setMovie(data);
      setRating(data.rating);
      setVotes(data.votesCount);
      setVoted(data.userVoted ?? false);
    } catch (e) {
      setErrorM(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoadingM(false);
    }
  }, [token]);

  const loadRelated = useCallback(async (cat: string, currentId: string) => {
    try {
      const res  = await fetch(`${API_BASE}/moviesup?category=${cat}&limit=20`, {
        headers: bearerHeader(token), credentials: "include",
      });
      const data = await res.json() as { items: MovieItem[] };
      setRelated((data.items ?? []).filter((m) => m.id !== currentId));
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { if (movieId) void loadMovie(movieId); }, [movieId, loadMovie]);
  useEffect(() => { if (movie) void loadRelated(movie.category, movie.id); }, [movie, loadRelated]);

  /* ── vote ───────────────────────────────────────────── */
  const handleVote = async (n: number) => {
    if (!isAuthenticated || !movie || voted) return;
    const prev = { rating, votes };
    setRating(parseFloat(((rating * votes + n) / (votes + 1)).toFixed(1)));
    setVotes((v) => v + 1);
    setVoted(true);
    try {
      const res  = await fetch(`${API_BASE}/moviesup/${movie.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...bearerHeader(token) },
        credentials: "include",
        body: JSON.stringify({ rating: n }),
      });
      const data = await res.json() as { ok: boolean; newRating: number; votesCount: number };
      if (data.ok) { setRating(data.newRating); setVotes(data.votesCount); }
      else { setRating(prev.rating); setVotes(prev.votes); setVoted(false); }
    } catch {
      setRating(prev.rating); setVotes(prev.votes); setVoted(false);
    }
  };

  /* ── download ───────────────────────────────────────── */
  const handleDownload = async () => {
    if (!movie) return;
    const res  = await fetch(`${API_BASE}/moviesup/${movie.id}/download`, {
      method: "POST", headers: bearerHeader(token), credentials: "include",
    });
    const data = await res.json() as { ok: boolean; downloadUrl: string; filename?: string };
    if (data.ok) {
      const a      = document.createElement("a");
      a.href       = data.downloadUrl;
      a.download   = data.filename ?? movie.title;
      a.click();
    }
  };

  const handleEnded = () => {
    if (related.length > 0) router.push(`/reproductor/${related[0].id}`);
  };

  const handleSelectRelated = (m: MovieItem) => router.push(`/reproductor/${m.id}`);

  const handleHover = (m: MovieItem | null, x: number, y: number) => {
    if (m) { setPreviewMovie(m); setPreviewPos({ x, y }); setPreviewVis(true); }
    else   { setPreviewVis(false); }
  };

  /* ── guards ─────────────────────────────────────────── */
  if (loadingM) return (
    <div className="rp-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Film size={40} color="var(--rp-accent)" />
        <span style={{ color: "var(--rp-text-muted)", fontSize: 13 }}>Cargando película…</span>
      </div>
    </div>
  );

  if (errorM || !movie) return (
    <div className="rp-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--rp-accent)" }}>
        <AlertCircle size={40} />
        <span style={{ fontSize: 14 }}>{errorM ?? "Película no encontrada"}</span>
        <button type="button" className="rp-info__btn" onClick={() => router.back()}>
          <ArrowLeft size={13} /> Volver
        </button>
      </div>
    </div>
  );

  const pal    = CAT_PALETTE[movie.category] ?? { accent: "#e63946", bg: "rgba(230,57,70,.12)" };
  const vtype  = detectVideoType(movie.videoUrl);

  return (
    <div className="rp-page" tabIndex={0} style={{ outline: "none" }}>
      <div className="rp-layout">

        {/* ═══════ LEFT MAIN COLUMN ═══════ */}
        <div className="rp-main">

          {/* Topbar */}
          <div className="rp-topbar">
            <a href="/" className="rp-topbar__back" title="Inicio" aria-label="Inicio">
              <House size={15} />
            </a>
            <button type="button" className="rp-topbar__back" onClick={() => router.back()} title="Volver">
              <ArrowLeft size={15} />
            </button>
            <span className="rp-topbar__crumb-sep" style={{ margin: "0 2px" }}>|</span>
            <div className="rp-topbar__crumb">
              <a href="/peliculas" className="rp-topbar__crumb-item">Volver</a>
              <ChevronRight size={11} className="rp-topbar__crumb-sep" />
              <span className="rp-topbar__crumb-item" onClick={() => router.back()} style={{ cursor: "pointer" }}>
                {movie.category}
              </span>
              <ChevronRight size={11} className="rp-topbar__crumb-sep" />
              <span className="rp-topbar__crumb-item rp-topbar__crumb-item--active">{movie.title}</span>
            </div>
          </div>

          {/* ─── Universal Player ─── */}
          {vtype === "direct" ? (
            <DirectVideoPlayer
              movie={movie}
              onEnded={handleEnded}
              onError={() => setVideoError(true)}
            />
          ) : (
            <EmbedPlayer
              url={movie.videoUrl}
              type={vtype}
              thumbnail={movie.thumbnail}
              title={movie.title}
            />
          )}

          {/* Error de video nativo */}
          {videoError && vtype === "direct" && (
            <div className="rp-error" style={{ marginTop: 8 }}>
              <AlertCircle size={20} />
              <span>No se pudo cargar el video. Verificá la URL.</span>
            </div>
          )}

          {/* Movie info */}
          <div className="rp-info">
            <div className="rp-info__top">
              <h1 className="rp-info__title">{movie.title}</h1>
              <div className="rp-info__actions">
                {movie.canDownload && (
                  <button type="button" className="rp-info__btn rp-info__btn--primary" onClick={() => { void handleDownload(); }}>
                    <Download size={13} /> Descargar
                  </button>
                )}
                <button type="button" className="rp-info__btn" title="Compartir">
                  <Share2 size={13} /> Compartir
                </button>
              </div>
            </div>

            <div className="rp-info__meta">
              <span
                className="rp-info__chip"
                style={{ color: pal.accent, borderColor: pal.accent + "55", background: pal.bg }}
              >
                {movie.category}
              </span>
              <span className="rp-info__sep" />
              <span style={{ fontSize: 12, color: "var(--rp-text-muted)" }}>{movie.year}</span>
              <span className="rp-info__sep" />
              <span style={{ fontSize: 12, color: "var(--rp-text-muted)" }}>{movie.duration}</span>
              <span className="rp-info__sep" />
              {/* Badge de fuente */}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                background: vtype === "youtube" ? "#ff000022" : vtype === "vimeo" ? "#1ab7ea22" : "rgba(255,255,255,.08)",
                color:      vtype === "youtube" ? "#ff4444"   : vtype === "vimeo" ? "#1ab7ea"   : "var(--rp-text-muted)",
                border:     `1px solid ${vtype === "youtube" ? "#ff444444" : vtype === "vimeo" ? "#1ab7ea44" : "rgba(255,255,255,.1)"}`,
              }}>
                {vtype === "youtube" ? "▶ YouTube" : vtype === "vimeo" ? "🎬 Vimeo" : "🔗 Directo"}
              </span>
              <span className="rp-info__sep" />
              <span className="rp-info__views">
                <Eye size={11} />
                {movie.views.toLocaleString("es")} vistas
              </span>
            </div>

            <p className="rp-info__desc">{movie.description}</p>
          </div>

          {/* Rating */}
          <div className="rp-rating-row">
            <span className="rp-rating-label">Calificación</span>
            <StarRating value={rating} onVote={(n) => { void handleVote(n); }} voted={voted} size={18} />
            <span className="rp-rating-score">{rating.toFixed(1)}</span>
            <span className="rp-rating-count">({votes.toLocaleString("es")} votos)</span>
            {voted && (
              <span className="rp-rating-voted">
                <Check size={11} /> Votado
              </span>
            )}
            {!isAuthenticated && (
              <span style={{ fontSize: 11, color: "var(--rp-text-dim)" }}>
                Iniciá sesión para votar
              </span>
            )}
          </div>

        </div>

        {/* ═══════ SIDEBAR ═══════ */}
        <aside className="rp-sidebar">
          <div className="rp-sidebar__head">
            <span className="rp-sidebar__title">A CONTINUACIÓN</span>
            <span className="rp-sidebar__count">{related.length} títulos</span>
          </div>

          <div className="rp-sidebar__list">
            <RelatedCard
              key={movie.id}
              movie={movie}
              isCurrent={true}
              onSelect={() => {}}
              onHover={handleHover}
            />

            {related.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--rp-text-dim)", fontSize: 12 }}>
                Sin contenido relacionado
              </div>
            ) : (
              related.map((m) => (
                <RelatedCard
                  key={m.id}
                  movie={m}
                  isCurrent={false}
                  onSelect={handleSelectRelated}
                  onHover={handleHover}
                />
              ))
            )}
          </div>
        </aside>

      </div>

      <MiniPreview movie={previewMovie} visible={previewVis} x={previewPos.x} y={previewPos.y} />
    </div>
  );
}