"use client";

// ═══════════════════════════════════════════════════════════
// ChatUIComponents.tsx
// Componentes de UI puros: burbujas, audio, efímeros, wallpaper,
// delete confirm, forward modal y utilidades visuales
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Smile,
  Mic,
  MicOff,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  Check,
  CheckCheck,
  Lock,
  BellOff,
  X,
  Flame,
  Timer,
  Eye,
  EyeOff,
  Settings2,
  Shield,
  Paperclip,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  FileVideo,
  Image as ImageIcon,
  CheckSquare,
  Square,
  XCircle,
  Ban,
  Flag,
  ShieldAlert,
  Trash2,
  Forward,
  Edit3,
  Copy,
  Share2,
  ScrollText,
  FileText,
  ChevronRight,
  Users,
  Globe,
  Bell,
  UserX,
} from "lucide-react";

const API = "https://nakama-backend-render.onrender.com";

// ── Tipos exportados ──────────────────────────────────────
export type RoomType = "private" | "group" | "community";
export type EphemeralDuration = 5 | 10 | 30 | 60 | 0;

export interface EphemeralConfig {
  duration: EphemeralDuration;
  oneTimeView: boolean;
  recipients: any[];
}

export interface UploadedFile {
  url: string;
  thumbnailUrl?: string;
  type: "image" | "video" | "gif" | "audio";
  width?: number;
  height?: number;
  duration?: number;
  mimeType: string;
  size: number;
  waveform?: number[];
}

export interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderVideo?: string;
  content: string;
  type: "text" | "image" | "video" | "gif" | "audio" | "file" | "ephemeral";
  fileUrl?: string;
  thumbUrl?: string;
  duration?: number;
  waveform?: number[];
  ephemeral?: boolean;
  ephConfig?: EphemeralConfig;
  ephViewed?: boolean;
  replyTo?: Message | null;
  reactions: { emoji: string; userIds: string[] }[];
  status: "sent" | "delivered" | "read";
  isSystem: boolean;
  deleted: boolean;
  edited?: boolean;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  _id: string;
  isReadOnly?: boolean;
  type: "private" | "group" | "community";
  name: string;
  avatarUrl?: string;
  profileVideo?: { url: string; thumbnailUrl?: string } | null;
  lastMessage?: string;
  lastTime?: string;
  unread: number;
  online?: boolean;
  memberCount?: number;
  theme?: string;
  pinned?: boolean;
  muted?: boolean;
  isBlocked?: boolean;
  otherId?: string;
  wallpaper?: string;
}

export interface NakamaSocket {
  on(event: string, cb: (...args: any[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  disconnect(): void;
}

// ── Constantes ────────────────────────────────────────────
export const EPHEMERAL_DURATIONS: {
  value: EphemeralDuration;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: 5, label: "5 seg", icon: "⚡", color: "#f87171" },
  { value: 10, label: "10 seg", icon: "🔥", color: "#fb923c" },
  { value: 30, label: "30 seg", icon: "⏱", color: "#facc15" },
  { value: 60, label: "1 min", icon: "🕐", color: "#4ade80" },
  { value: 0, label: "1 vista", icon: "👁", color: "#a78bfa" },
];

export const DEFAULT_EPHEMERAL: EphemeralConfig = {
  duration: 10,
  oneTimeView: true,
  recipients: [],
};

export const WALLPAPERS: {
  id: string;
  label: string;
  preview: string;
  bg?: string;
  bgColor?: string;
  bgSize?: string;
}[] = [
  { id: "none", label: "Sin fondo", preview: "transparent" },
  {
    id: "dots",
    label: "Puntos",
    preview: "#1a1a2e",
    bgColor: "#0d0d1a",
    bg: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
    bgSize: "22px 22px",
  },
  {
    id: "lines",
    label: "Líneas",
    preview: "#0d1117",
    bgColor: "#0d1117",
    bg: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 14px)",
  },
  {
    id: "grid",
    label: "Cuadrícula",
    preview: "#0a0a18",
    bgColor: "#0a0a18",
    bg: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
    bgSize: "28px 28px",
  },
  {
    id: "aurora",
    label: "Aurora",
    preview: "linear-gradient(135deg,#0d0d1a,#1a0a28)",
    bg: "linear-gradient(135deg, #0d0d1a 0%, #1a0a28 50%, #0a1628 100%)",
  },
  {
    id: "sunset",
    label: "Atardecer",
    preview: "linear-gradient(135deg,#1a0a00,#2d0a0a)",
    bg: "linear-gradient(135deg, #1a0a00 0%, #2d0a0a 50%, #1a0505 100%)",
  },
  {
    id: "forest",
    label: "Bosque",
    preview: "linear-gradient(135deg,#0d1f0f,#0a1a0d)",
    bg: "linear-gradient(135deg, #0d1f0f 0%, #0a1a0d 60%, #061008 100%)",
  },
  {
    id: "ocean",
    label: "Océano",
    preview: "linear-gradient(135deg,#0a1628,#062040)",
    bg: "linear-gradient(135deg, #0a1628 0%, #062040 60%, #041830 100%)",
  },
  {
    id: "pink",
    label: "Sakura",
    preview: "linear-gradient(135deg,#1a0a10,#280820)",
    bg: "linear-gradient(135deg, #1a0a10 0%, #280820 60%, #180610 100%)",
  },
];

export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "acoso", label: "Acoso o bullying" },
  { value: "contenido_inapropiado", label: "Contenido inapropiado" },
  { value: "violencia", label: "Violencia" },
  { value: "odio", label: "Discurso de odio" },
  { value: "desinformacion", label: "Desinformación" },
  { value: "otro", label: "Otro motivo" },
];

// ── Helper: detecta si una URL es video o gif animado ────
export function isAnimatedUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|gif)(\?|$)/i.test(url);
}

// ── Power bar util ────────────────────────────────────────
const POWER_LEVELS = [
  { at: 0, color: "#4ade80", label: "Iniciando..." },
  { at: 20, color: "#a3e635", label: "Cargando..." },
  { at: 45, color: "#facc15", label: "Aumentando poder..." },
  { at: 65, color: "#fb923c", label: "¡Nivel crítico!" },
  { at: 80, color: "#f87171", label: "¡SUPER NAKAMA!" },
  { at: 95, color: "#e879f9", label: "¡ULTRA INSTINCT!" },
];
export function getPowerLevel(progress: number) {
  let current = POWER_LEVELS[0];
  for (const lvl of POWER_LEVELS) {
    if (progress >= lvl.at) current = lvl;
    else break;
  }
  return current;
}

export function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(secs % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

// ══════════════════════════════════════════════════════════
// UserAvatar — soporta video (.mp4/.webm/.mov) y gif (.gif)
// ══════════════════════════════════════════════════════════
export function UserAvatar({
  src,
  videoSrc,
  alt,
  size = 36,
  className = "",
  fallback,
}: {
  src?: string;
  videoSrc?: string;
  alt: string;
  size?: number;
  className?: string;
  fallback?: string;
}) {
  const divStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: "50%",
    overflow: "hidden",
    display: "inline-block",
    flexShrink: 0,
    position: "relative",
    background: videoSrc || src ? "transparent" : "rgba(255,255,255,0.08)",
    verticalAlign: "middle",
  };

  // GIFs se renderizan como <img> (ya se animan solos sin JS)
  // Videos (.mp4/.webm/.mov) se renderizan como <video autoPlay muted loop>
  if (videoSrc) {
    const isGif = /\.gif(\?|$)/i.test(videoSrc);
    return (
      <div style={divStyle} className={`nakama-avatar-wrap ${className}`}>
        {isGif ? (
          <img
            src={videoSrc}
            alt={alt}
            width={size}
            height={size}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <video
            src={videoSrc}
            width={size}
            height={size}
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        )}
      </div>
    );
  }

  if (src)
    return (
      <div style={divStyle} className={`nakama-avatar-wrap ${className}`}>
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );

  return (
    <div
      style={{
        ...divStyle,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      className={`nakama-avatar-wrap ${className}`}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.85)",
          fontWeight: 700,
          fontSize: size * 0.38,
        }}
      >
        {fallback ?? alt[0]?.toUpperCase()}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// EphemeralSettingsPanel
// ══════════════════════════════════════════════════════════
export function EphemeralSettingsPanel({
  config,
  onChange,
  onClose,
}: {
  config: EphemeralConfig;
  onChange: (c: EphemeralConfig) => void;
  onClose: () => void;
}) {
  return (
    <div className="eph-settings-panel">
      <div className="eph-settings-panel__header">
        <Flame size={14} className="eph-flame-icon" />
        <span>Ajustes de mensaje temporal</span>
        <button
          onClick={onClose}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(240,240,248,0.5)",
            display: "flex",
          }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="eph-settings-section">
        <div className="eph-settings-label">
          <Timer size={11} /> Duración visible
        </div>
        <div className="eph-dur-grid">
          {EPHEMERAL_DURATIONS.map((d) => (
            <button
              key={d.value}
              className={`eph-dur-btn ${config.duration === d.value ? "eph-dur-btn--active" : ""}`}
              style={
                config.duration === d.value
                  ? {
                      borderColor: d.color,
                      color: d.color,
                      background: `${d.color}18`,
                    }
                  : {}
              }
              onClick={() => onChange({ ...config, duration: d.value })}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="eph-settings-section">
        <div className="eph-settings-row">
          <div>
            <div className="eph-settings-label">
              <Eye size={11} /> Vista única
            </div>
            <div className="eph-settings-hint">
              Se destruye después de verse una vez
            </div>
          </div>
          <button
            className={`eph-switch ${config.oneTimeView ? "eph-switch--on" : ""}`}
            onClick={() =>
              onChange({ ...config, oneTimeView: !config.oneTimeView })
            }
          >
            <span className="eph-switch__knob" />
          </button>
        </div>
      </div>
      <div className="eph-settings-info">
        <Shield size={10} />
        <span>No se puede reenviar · Se destruye automáticamente</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// EphemeralViewer
// ══════════════════════════════════════════════════════════
export function EphemeralViewer({
  messageId,
  caption,
  config,
  senderName,
  onClose,
}: {
  messageId: string;
  caption?: string;
  config: EphemeralConfig;
  senderName: string;
  onClose: () => void;
}) {
  const [realImageUrl, setRealImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [held, setHeld] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(config.duration || 0);
  const [destroyed, setDestroyed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function registerView() {
      setLoading(true);
      const token = localStorage.getItem("nakama_token");
      try {
        const res = await fetch(`${API}/ephemeral/${messageId}/view`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.alreadyViewed || data.destroyed) setDestroyed(true);
          else setServerError(data.message || "Error del servidor");
          return;
        }
        setRealImageUrl(data.imageUrl);
        if (data.destroyed) setDestroyed(true);
      } catch {
        setServerError("Error de red");
      } finally {
        setLoading(false);
      }
    }
    registerView();
  }, [messageId]); // eslint-disable-line

  useEffect(
    () => () => {
      clearInterval(timerRef.current!);
      clearTimeout(holdRef.current!);
    },
    [],
  );

  async function destroyOnServer() {
    const token = localStorage.getItem("nakama_token");
    try {
      await fetch(`${API}/ephemeral/${messageId}/destroy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }

  function startHold() {
    if (!realImageUrl || destroyed || loading) return;
    holdRef.current = setTimeout(() => {
      setHeld(true);
      setStarted(true);
      if (config.duration > 0) {
        setTimeLeft(config.duration);
        timerRef.current = setInterval(() => {
          setTimeLeft((p) => {
            if (p <= 1) {
              clearInterval(timerRef.current!);
              setDestroyed(true);
              destroyOnServer();
              return 0;
            }
            return p - 1;
          });
        }, 1000);
      }
    }, 150);
  }

  function stopHold() {
    clearTimeout(holdRef.current!);
    setHeld(false);
    if (config.oneTimeView && started) {
      setDestroyed(true);
      clearInterval(timerRef.current!);
      destroyOnServer();
    }
  }

  const dur = EPHEMERAL_DURATIONS.find((d) => d.value === config.duration);
  const pct = config.duration > 0 ? (timeLeft / config.duration) * 100 : 100;
  const strokeColor = pct > 60 ? "#4ade80" : pct > 30 ? "#facc15" : "#f87171";

  return (
    <div
      className="eph-viewer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !started) onClose();
      }}
    >
      <div className="eph-viewer">
        <div className="eph-viewer__header">
          <div className="eph-viewer__from">
            <Flame size={13} style={{ color: "#f87171" }} />
            <span>{senderName}</span>
          </div>
          <div className="eph-viewer__tags">
            {config.oneTimeView && (
              <span className="eph-tag eph-tag--red">
                <Eye size={9} /> 1 vez
              </span>
            )}
            {dur && (
              <span
                className="eph-tag"
                style={{
                  background: `${dur.color}22`,
                  color: dur.color,
                  border: `1px solid ${dur.color}44`,
                }}
              >
                {dur.icon} {dur.label}
              </span>
            )}
          </div>
          {!started && (
            <button className="eph-viewer__close" onClick={onClose}>
              <X size={15} />
            </button>
          )}
        </div>
        <div className="eph-viewer__body">
          {loading && !destroyed && (
            <div className="eph-hold-prompt">
              <div className="eph-hold-ring">
                <div className="eph-hold-ring__pulse" />
                <Loader2
                  size={22}
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    animation: "spin 1.5s linear infinite",
                  }}
                />
              </div>
              <p className="eph-hold-text">Cargando mensaje…</p>
            </div>
          )}
          {serverError && !loading && !destroyed && (
            <div className="eph-destroyed">
              <div className="eph-destroyed__icon">
                <X size={44} style={{ color: "#f87171" }} />
              </div>
              <h3>No se pudo cargar</h3>
              <p>{serverError}</p>
              <button className="eph-destroyed__close" onClick={onClose}>
                Cerrar
              </button>
            </div>
          )}
          {destroyed && (
            <div className="eph-destroyed">
              <div className="eph-destroyed__icon">
                <Flame size={44} style={{ color: "#f87171" }} />
              </div>
              <h3>Mensaje destruido</h3>
              <p>Este contenido ya no está disponible</p>
              <button className="eph-destroyed__close" onClick={onClose}>
                Cerrar
              </button>
            </div>
          )}
          {!loading && !serverError && !destroyed && !held && (
            <div className="eph-hold-prompt">
              <div className="eph-hold-ring">
                <div className="eph-hold-ring__pulse" />
                <Lock size={22} style={{ color: "rgba(255,255,255,0.4)" }} />
              </div>
              <p className="eph-hold-text">Mantené presionado para ver</p>
              <p className="eph-hold-sub">
                {config.oneTimeView
                  ? "👁 Vista única — se destruye al soltar"
                  : `⏱ Visible por ${dur?.label}`}
              </p>
            </div>
          )}
          {!loading && !serverError && !destroyed && held && realImageUrl && (
            <div className="eph-viewer__image-wrap">
              <img
                src={realImageUrl}
                alt="temporal"
                className="eph-viewer__img"
              />
              {caption && <div className="eph-viewer__caption">{caption}</div>}
              {config.duration > 0 && started && (
                <div className="eph-timer-ring">
                  <svg viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="17"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="17"
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="3"
                      strokeDasharray={`${pct} 100`}
                      strokeLinecap="round"
                      transform="rotate(-90 20 20)"
                      style={{
                        transition: "stroke-dasharray 0.9s linear, stroke 0.3s",
                      }}
                    />
                  </svg>
                  <span
                    className="eph-timer-num"
                    style={{ color: strokeColor }}
                  >
                    {timeLeft}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        {!destroyed && !loading && !serverError && (
          <div className="eph-viewer__hold-zone">
            <button
              className={`eph-hold-btn ${held ? "eph-hold-btn--active" : ""}`}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
            >
              <Eye size={16} />
              <span>{held ? "Viendo..." : "Mantener para ver"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// EphemeralBubble
// ══════════════════════════════════════════════════════════
export function EphemeralBubble({
  isMine,
  senderName,
  config,
  imageUrl,
  caption,
  createdAt,
  viewed,
  onView,
}: {
  isMine: boolean;
  senderName: string;
  config: EphemeralConfig;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  viewed: boolean;
  onView: () => void;
}) {
  const dur = EPHEMERAL_DURATIONS.find((d) => d.value === config.duration);
  const time = new Date(createdAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      className={`eph-bubble ${isMine ? "eph-bubble--mine" : "eph-bubble--theirs"} ${viewed || isMine ? "eph-bubble--consumed" : ""}`}
      onClick={() => !isMine && !viewed && onView()}
    >
      <div className="eph-bubble__icon">
        {viewed || isMine ? (
          <EyeOff size={16} style={{ color: "rgba(255,255,255,0.25)" }} />
        ) : (
          <Flame size={16} className="eph-bubble__flame-icon" />
        )}
      </div>
      <div className="eph-bubble__body">
        <span className="eph-bubble__label">
          {isMine
            ? "Mensaje temporal enviado"
            : viewed
              ? "Ya viste este mensaje"
              : "Mensaje temporal"}
        </span>
        <span className="eph-bubble__meta">
          {dur?.icon} {dur?.label}
          {config.oneTimeView ? " · 1 vista" : ""}
        </span>
      </div>
      <span className="eph-bubble__time">{time}</span>
      {!isMine && !viewed && (
        <div className="eph-bubble__tap-hint">
          <Eye size={11} />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// AudioBubble
// ══════════════════════════════════════════════════════════
const AUD_BAR_COUNT = 30;

export function AudioBubble({
  url,
  duration,
  waveform,
}: {
  url: string;
  duration: number;
  waveform?: number[];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [curTime, setCurTime] = useState(0);

  function resampleBars(src: number[], n: number): number[] {
    const out: number[] = [];
    const step = src.length / n;
    for (let i = 0; i < n; i++) {
      const slice = src.slice(Math.floor(i * step), Math.ceil((i + 1) * step));
      out.push(
        slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0.08,
      );
    }
    return out;
  }

  const bars: number[] =
    waveform && waveform.length > 0
      ? resampleBars(waveform, AUD_BAR_COUNT)
      : Array.from({ length: AUD_BAR_COUNT }, (_, i) =>
          Math.max(
            0.08,
            0.1 + 0.7 * Math.abs(Math.sin(i * 0.55 + 1.2)) * 0.5 + 0.1,
          ),
        );

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
    } else
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
  }

  function seekTo(i: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = (i / AUD_BAR_COUNT) * (audio.duration || duration || 1);
  }

  const playedBars = Math.floor(progress * AUD_BAR_COUNT);
  return (
    <div className="chat-bubble-audio">
      <button className="chat-bubble-audio__play" onClick={togglePlay}>
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <div className="chat-bubble-audio__waveform">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`chat-bubble-audio__bar${i < playedBars ? " chat-bubble-audio__bar--played" : ""}`}
            style={{ "--bar-h": Math.max(0.08, h) } as React.CSSProperties}
            onClick={() => seekTo(i)}
          />
        ))}
      </div>
      <span className="chat-bubble-audio__dur">
        {playing ? formatDuration(curTime) : formatDuration(duration)}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// AudioRecorder
// ══════════════════════════════════════════════════════════
type AudioPhase =
  | { phase: "idle" }
  | { phase: "recording"; startTime: number; duration: number }
  | {
      phase: "preview";
      blob: Blob;
      duration: number;
      localUrl: string;
      waveform: number[];
    }
  | {
      phase: "uploading";
      blob: Blob;
      duration: number;
      localUrl: string;
      waveform: number[];
      progress: number;
    }
  | {
      phase: "error";
      blob: Blob;
      duration: number;
      localUrl: string;
      waveform: number[];
      errorMsg: string;
    };

export function AudioRecorder({
  onAudioSend,
  disabled,
}: {
  onAudioSend: (file: UploadedFile) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<AudioPhase>({ phase: "idle" });
  const [permDenied, setPermDenied] = useState(false);
  const [bars, setBars] = useState<number[]>(Array(AUD_BAR_COUNT).fill(0.05));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);

  const stopEverything = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    clearInterval(durationIntervalRef.current!);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    mediaRecorderRef.current = null;
    waveformSamplesRef.current = [];
    setBars(Array(AUD_BAR_COUNT).fill(0.05));
  }, []);

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    stopEverything();
    setState({ phase: "idle" });
  }, [stopEverything]);
  useEffect(
    () => () => {
      stopEverything();
      xhrRef.current?.abort();
    },
    [stopEverything],
  );

  const startRecording = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermDenied(false);
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg;codecs=opus";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      const startTime = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const localUrl = URL.createObjectURL(blob);
        const duration = Math.round((Date.now() - startTime) / 1000);
        const raw = waveformSamplesRef.current;
        const step = Math.max(1, Math.floor(raw.length / AUD_BAR_COUNT));
        const waveform: number[] = [];
        for (let i = 0; i < AUD_BAR_COUNT; i++) {
          const slice = raw.slice(i * step, (i + 1) * step);
          waveform.push(
            slice.length
              ? slice.reduce((a, b) => a + b, 0) / slice.length
              : 0.05,
          );
        }
        setState({ phase: "preview", blob, duration, localUrl, waveform });
        setBars(waveform);
        stopEverything();
      };
      recorder.start(100);
      setState({ phase: "recording", startTime, duration: 0 });
      durationIntervalRef.current = setInterval(() => {
        setState((prev) =>
          prev.phase === "recording"
            ? { ...prev, duration: Math.round((Date.now() - startTime) / 1000) }
            : prev,
        );
      }, 500);
      const bufLen = analyser.frequencyBinCount;
      const dataArr = new Uint8Array(bufLen);
      function drawFrame() {
        animFrameRef.current = requestAnimationFrame(drawFrame);
        analyser.getByteFrequencyData(dataArr);
        const newBars = Array.from({ length: AUD_BAR_COUNT }, (_, i) =>
          Math.max(
            0.05,
            dataArr[Math.floor((i / AUD_BAR_COUNT) * bufLen)] / 255,
          ),
        );
        setBars(newBars);
        waveformSamplesRef.current.push(
          newBars.reduce((a, b) => a + b, 0) / AUD_BAR_COUNT,
        );
      }
      drawFrame();
    } catch (err: any) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      )
        setPermDenied(true);
    }
  }, [disabled, stopEverything]);

  const stopRecording = useCallback(() => {
    clearInterval(durationIntervalRef.current!);
    mediaRecorderRef.current?.stop();
  }, []);

  const uploadAndSend = useCallback(() => {
    const s = state as any;
    if (!s.blob) return;
    setState((prev) => ({ ...prev, phase: "uploading", progress: 0 }) as any);
    const token = localStorage.getItem("nakama_token");
    const ext = s.blob.type.includes("webm") ? "webm" : "ogg";
    const formData = new FormData();
    formData.append("file", s.blob, `audio.${ext}`);
    formData.append("type", "audio");
    formData.append("duration", String(s.duration));
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable)
        setState((prev) =>
          prev.phase === "uploading"
            ? { ...prev, progress: Math.round((e.loaded / e.total) * 95) }
            : prev,
        );
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          onAudioSend({
            url: data.url || data.secure_url,
            type: "audio",
            mimeType: s.blob.type,
            size: s.blob.size,
            duration: s.duration,
            waveform: s.waveform,
          });
          reset();
        } catch {
          setState(
            (prev) =>
              ({
                ...prev,
                phase: "error",
                errorMsg: "Respuesta inválida",
              }) as any,
          );
        }
      } else {
        try {
          setState(
            (prev) =>
              ({
                ...prev,
                phase: "error",
                errorMsg:
                  JSON.parse(xhr.responseText).message || `Error ${xhr.status}`,
              }) as any,
          );
        } catch {
          setState(
            (prev) =>
              ({
                ...prev,
                phase: "error",
                errorMsg: `Error ${xhr.status}`,
              }) as any,
          );
        }
      }
    });
    xhr.addEventListener("error", () =>
      setState(
        (prev) =>
          ({ ...prev, phase: "error", errorMsg: "Error de red" }) as any,
      ),
    );
    xhr.open("POST", `${API}/uploads/chat-file`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  }, [state, onAudioSend, reset]);

  if (state.phase === "idle") {
    return (
      <button
        className={`chat-icon-btn aud-mic-btn${permDenied ? " aud-mic-btn--denied" : ""}${disabled ? " aud-mic-btn--disabled" : ""}`}
        onClick={startRecording}
        disabled={disabled}
        title={permDenied ? "Permiso denegado" : "Grabar audio"}
      >
        {permDenied ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    );
  }
  if (state.phase === "recording") {
    return (
      <div className="aud-recording-bar">
        <button className="aud-cancel-rec-btn" onClick={reset} title="Cancelar">
          <Trash2 size={15} />
        </button>
        <div className="aud-waveform aud-waveform--live">
          {bars.map((h, i) => (
            <div
              key={i}
              className="aud-bar aud-bar--live"
              style={{ "--bar-h": h } as React.CSSProperties}
            />
          ))}
        </div>
        <span className="aud-duration aud-duration--rec">
          <span className="aud-rec-dot" />
          {formatDuration(state.duration)}
        </span>
        <button
          className="aud-send-btn"
          onClick={stopRecording}
          title="Detener"
        >
          <Send size={16} />
        </button>
      </div>
    );
  }
  const s = state as any;
  const isUpl = state.phase === "uploading";
  const isErr = state.phase === "error";
  const playedBars = isUpl
    ? Math.floor((state.progress / 100) * AUD_BAR_COUNT)
    : 0;
  return (
    <div className="aud-preview-bar">
      <button className="aud-cancel-rec-btn" onClick={reset} title="Descartar">
        <X size={15} />
      </button>
      <div className="aud-waveform aud-waveform--preview">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`aud-bar aud-bar--preview${i < playedBars ? " aud-bar--filled" : ""}`}
            style={{ "--bar-h": h } as React.CSSProperties}
          />
        ))}
      </div>
      <span className="aud-duration">
        {isUpl ? `${state.progress}%` : formatDuration(s.duration)}
      </span>
      {isUpl ? (
        <div className="aud-uploading-label">
          <Loader2
            size={14}
            style={{ animation: "spin 0.8s linear infinite" }}
          />
        </div>
      ) : isErr ? (
        <button
          className="aud-send-btn aud-send-btn--retry"
          onClick={uploadAndSend}
          title="Reintentar"
        >
          <RefreshCw size={14} />
        </button>
      ) : (
        <button
          className="aud-send-btn"
          onClick={uploadAndSend}
          title="Enviar audio"
        >
          <Send size={16} />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ImageUploadButton
// ══════════════════════════════════════════════════════════
type UploadPhase =
  | { phase: "idle" }
  | { phase: "preview"; file: File; localUrl: string }
  | { phase: "uploading"; file: File; localUrl: string; progress: number }
  | { phase: "error"; file: File; localUrl: string; errorMsg: string }
  | { phase: "done"; result: UploadedFile; localUrl: string };

export function ImageUploadButton({
  onFileSend,
  onEphemeralSend,
  disabled,
}: {
  onFileSend: (file: UploadedFile, caption?: string) => void;
  onEphemeralSend?: (
    file: UploadedFile,
    caption: string | undefined,
    config: EphemeralConfig,
  ) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [state, setState] = useState<UploadPhase>({ phase: "idle" });
  const [caption, setCaption] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [ephEnabled, setEphEnabled] = useState(false);
  const [ephConfig, setEphConfig] =
    useState<EphemeralConfig>(DEFAULT_EPHEMERAL);
  const [showEphSettings, setShowEphSettings] = useState(false);

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    if (state.phase !== "idle") {
      const s = state as any;
      if (s.localUrl) URL.revokeObjectURL(s.localUrl);
    }
    setState({ phase: "idle" });
    setCaption("");
    setShowPanel(false);
    setEphEnabled(false);
    setShowEphSettings(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [state]);

  const uploadFile = useCallback((file: File): Promise<UploadedFile> => {
    const localUrl = URL.createObjectURL(file);
    setState({ phase: "uploading", file, localUrl, progress: 0 });
    const token = localStorage.getItem("nakama_token");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", file.type.startsWith("video/") ? "video" : "image");
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable)
          setState((prev) =>
            prev.phase === "uploading"
              ? { ...prev, progress: Math.round((e.loaded / e.total) * 92) }
              : prev,
          );
      });
      xhr.addEventListener("load", () => {
        setState((prev) =>
          prev.phase === "uploading" ? { ...prev, progress: 100 } : prev,
        );
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              url: data.url || data.secure_url,
              thumbnailUrl: data.thumbnailUrl || data.thumbnail_url,
              type: file.type.startsWith("video/")
                ? "video"
                : file.type === "image/gif"
                  ? "gif"
                  : "image",
              mimeType: file.type,
              size: file.size,
              width: data.width,
              height: data.height,
              duration: data.duration,
            });
          } catch {
            reject(new Error("Respuesta inválida"));
          }
        } else {
          try {
            reject(
              new Error(
                JSON.parse(xhr.responseText).message || `Error ${xhr.status}`,
              ),
            );
          } catch {
            reject(new Error(`Error HTTP ${xhr.status}`));
          }
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Error de red")));
      xhr.addEventListener("abort", () => reject(new Error("Cancelado")));
      xhr.open("POST", `${API}/uploads/chat-file`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        alert("Solo imágenes o videos.");
        return;
      }
      if (file.type.startsWith("image/") && file.size > 10 * 1024 * 1024) {
        alert("Imagen máx 10 MB.");
        return;
      }
      if (file.type.startsWith("video/") && file.size > 100 * 1024 * 1024) {
        alert("Video máx 100 MB.");
        return;
      }
      const localUrl = URL.createObjectURL(file);
      setState({ phase: "preview", file, localUrl });
      setShowPanel(true);
    },
    [],
  );

  const handleUploadAndSend = useCallback(async () => {
    const s = state as any;
    if (!s.file) return;
    try {
      const result = await uploadFile(s.file);
      setState({ phase: "done", result, localUrl: s.localUrl });
      setTimeout(() => {
        if (ephEnabled && onEphemeralSend)
          onEphemeralSend(result, caption.trim() || undefined, {
            ...ephConfig,
            recipients: [],
          });
        else onFileSend(result, caption.trim() || undefined);
        reset();
      }, 500);
    } catch (err: any) {
      if (err.message === "Cancelado") return;
      setState((prev) =>
        (prev as any).file
          ? {
              phase: "error",
              file: (prev as any).file,
              localUrl: (prev as any).localUrl,
              errorMsg: err.message,
            }
          : prev,
      );
    }
  }, [
    state,
    caption,
    ephEnabled,
    ephConfig,
    uploadFile,
    onFileSend,
    onEphemeralSend,
    reset,
  ]);

  const powerLevel =
    state.phase === "uploading" ? getPowerLevel(state.progress) : null;
  const selDur = EPHEMERAL_DURATIONS.find(
    (d) => d.value === ephConfig.duration,
  );

  return (
    <>
      <button
        className="chat-icon-btn"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        title="Adjuntar imagen o video"
      >
        <Paperclip size={18} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {showPanel && state.phase !== "idle" && (
        <div
          className="niu-panel-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) reset();
          }}
        >
          <div className="niu-panel">
            <div className="niu-panel__top-bar">
              <button
                className={`niu-eph-toggle ${ephEnabled ? "niu-eph-toggle--on" : ""}`}
                onClick={() => {
                  setEphEnabled((v) => !v);
                  if (!ephEnabled) setShowEphSettings(true);
                  else setShowEphSettings(false);
                }}
              >
                <Flame
                  size={13}
                  className={ephEnabled ? "niu-flame-active" : ""}
                />
                <span>{ephEnabled ? "Temporal ON" : "Hacer temporal"}</span>
                {ephEnabled && selDur && (
                  <span
                    className="niu-eph-badge"
                    style={{
                      background: `${selDur.color}28`,
                      color: selDur.color,
                    }}
                  >
                    {selDur.icon} {selDur.label}
                    {ephConfig.oneTimeView ? " · 1 vista" : ""}
                  </span>
                )}
              </button>
              {ephEnabled && (
                <button
                  className="niu-eph-settings-btn"
                  onClick={() => setShowEphSettings((v) => !v)}
                >
                  <Settings2 size={13} />
                </button>
              )}
            </div>
            {ephEnabled && showEphSettings && (
              <EphemeralSettingsPanel
                config={ephConfig}
                onChange={setEphConfig}
                onClose={() => setShowEphSettings(false)}
              />
            )}
            <div className="niu-panel__header">
              <span className="niu-panel__title">
                {state.phase === "uploading"
                  ? "Subiendo..."
                  : state.phase === "error"
                    ? "Error al subir"
                    : state.phase === "done"
                      ? "¡Enviado!"
                      : ephEnabled
                        ? "Enviar temporal"
                        : "Enviar archivo"}
              </span>
              <button className="niu-panel__close" onClick={reset}>
                <X size={16} />
              </button>
            </div>
            <div className="niu-panel__preview">
              {(state as any).file?.type?.startsWith("video/") ? (
                <video
                  src={(state as any).localUrl}
                  className="niu-panel__media"
                  controls={state.phase === "preview"}
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={(state as any).localUrl}
                  alt="preview"
                  className="niu-panel__media"
                />
              )}
              {ephEnabled && state.phase === "preview" && (
                <div className="niu-eph-preview-badge">
                  <Flame size={11} /> Temporal
                  {ephConfig.oneTimeView && " · 1 vista"}
                </div>
              )}
              {state.phase === "uploading" && (
                <div className="niu-panel__upload-overlay">
                  <div className="niu-power-bar-wrap">
                    <div
                      className="niu-power-bar"
                      style={
                        {
                          "--pw-color": powerLevel!.color,
                          "--pw-pct": `${state.progress}%`,
                        } as React.CSSProperties
                      }
                    >
                      <div className="niu-power-bar__fill" />
                      <div className="niu-power-bar__glow" />
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="niu-power-bar__particle"
                          style={{ "--p-i": i } as React.CSSProperties}
                        />
                      ))}
                    </div>
                    <div
                      className="niu-power-bar__label"
                      style={{ color: powerLevel!.color }}
                    >
                      {powerLevel!.label}
                    </div>
                    <div
                      className="niu-power-bar__pct"
                      style={{ color: powerLevel!.color }}
                    >
                      {state.progress}%
                    </div>
                  </div>
                </div>
              )}
              {state.phase === "error" && (
                <div className="niu-panel__error-overlay">
                  <span style={{ fontSize: "2rem" }}>⚠️</span>
                  <span>{(state as any).errorMsg}</span>
                </div>
              )}
            </div>
            {(state.phase === "preview" || state.phase === "error") && (
              <input
                className="niu-panel__caption"
                placeholder={
                  ephEnabled
                    ? "Caption (no se puede copiar)..."
                    : "Agregar un caption (opcional)..."
                }
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={300}
              />
            )}
            <div className="niu-panel__info">
              {(state as any).file?.type?.startsWith("video/") ? (
                <FileVideo size={13} style={{ color: "#a78bfa" }} />
              ) : (
                <ImageIcon size={13} style={{ color: "#67e8f9" }} />
              )}
              <span>{(state as any).file?.name}</span>
              <span className="niu-panel__size">
                {((state as any).file?.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
            <div className="niu-panel__actions">
              {state.phase === "preview" && (
                <>
                  <button className="niu-btn niu-btn--cancel" onClick={reset}>
                    <X size={14} /> Cancelar
                  </button>
                  <button
                    className={`niu-btn ${ephEnabled ? "niu-btn--ephemeral" : "niu-btn--send"}`}
                    onClick={handleUploadAndSend}
                  >
                    {ephEnabled ? (
                      <>
                        <Flame size={13} /> Enviar temporal
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Enviar
                      </>
                    )}
                  </button>
                </>
              )}
              {state.phase === "uploading" && (
                <button className="niu-btn niu-btn--cancel" onClick={reset}>
                  <X size={14} /> Cancelar subida
                </button>
              )}
              {state.phase === "error" && (
                <>
                  <button className="niu-btn niu-btn--cancel" onClick={reset}>
                    <X size={14} /> Descartar
                  </button>
                  <button
                    className="niu-btn niu-btn--retry"
                    onClick={() =>
                      setState({
                        phase: "preview",
                        file: (state as any).file,
                        localUrl: (state as any).localUrl,
                      })
                    }
                  >
                    <RefreshCw size={14} /> Reintentar
                  </button>
                </>
              )}
              {state.phase === "done" && (
                <div className="niu-done-label">
                  <Loader2
                    size={14}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />{" "}
                  Enviando...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════
// MessageBubble
// ══════════════════════════════════════════════════════════
export function MessageBubble({
  msg,
  isMine,
  showName,
  prevMsg,
  selectMode,
  selected,
  onToggleSelect,
  onLongPress,
  onEdit,
  onDelete,
  onForward,
  onViewEphemeral,
}: {
  msg: Message;
  isMine: boolean;
  showName: boolean;
  prevMsg?: Message;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onDelete: (forAll: boolean) => void;
  onForward: () => void;
  onViewEphemeral?: (msg: Message) => void;
}) {
  const [showCtx, setShowCtx] = useState(false);
  const [showDelOpts, setShowDelOpts] = useState(false);
  const showAvatar = !isMine && (!prevMsg || prevMsg.senderId !== msg.senderId);
  const time = new Date(msg.createdAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function statusIcon() {
    if (!isMine) return null;
    if (msg.status === "read")
      return <CheckCheck size={13} className="chat-bubble__read" />;
    if (msg.status === "delivered")
      return <CheckCheck size={13} className="chat-bubble__delivered" />;
    return <Check size={13} className="chat-bubble__sent" />;
  }

  function renderContent() {
    if (msg.deleted)
      return (
        <p className="chat-bubble__text chat-bubble__text--deleted">
          Mensaje eliminado
        </p>
      );
    if (msg.ephemeral || msg.type === "ephemeral")
      return (
        <EphemeralBubble
          isMine={isMine}
          senderName={msg.senderName}
          config={msg.ephConfig ?? DEFAULT_EPHEMERAL}
          imageUrl={msg.fileUrl ?? ""}
          caption={msg.content || undefined}
          createdAt={msg.createdAt}
          viewed={msg.ephViewed ?? false}
          onView={() => onViewEphemeral?.(msg)}
        />
      );
    if (msg.type === "audio" && msg.fileUrl)
      return (
        <AudioBubble
          url={msg.fileUrl}
          duration={msg.duration ?? 0}
          waveform={msg.waveform}
        />
      );
    if (msg.type === "image" && msg.fileUrl)
      return (
        <img src={msg.fileUrl} alt="imagen" className="chat-bubble__img" />
      );
    if (msg.type === "video" && msg.fileUrl)
      return (
        <video
          src={msg.fileUrl}
          className="chat-bubble__img"
          controls
          playsInline
          style={{ maxWidth: "240px", borderRadius: "8px" }}
        />
      );
    if (msg.type === "gif" && msg.fileUrl)
      return <img src={msg.fileUrl} alt="gif" className="chat-bubble__img" />;
    return <p className="chat-bubble__text">{msg.content}</p>;
  }

  return (
    <div
      className={`chat-bubble-wrap ${isMine ? "chat-bubble-wrap--mine" : "chat-bubble-wrap--theirs"} ${selected ? "chat-bubble-wrap--selected" : ""} ${selectMode ? "chat-bubble-wrap--selectable" : ""}`}
      onClick={() => {
        if (selectMode) onToggleSelect();
      }}
      onMouseDown={() => {
        longPressTimer.current = setTimeout(() => onLongPress(), 500);
      }}
      onMouseUp={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onTouchStart={() => {
        longPressTimer.current = setTimeout(() => onLongPress(), 500);
      }}
      onTouchEnd={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!msg.deleted && !msg.isSystem) setShowCtx(true);
      }}
    >
      {selectMode && (
        <div className="chat-bubble__checkbox">
          {selected ? (
            <CheckSquare size={18} className="chat-bubble__checkbox--checked" />
          ) : (
            <Square size={18} />
          )}
        </div>
      )}
      {showAvatar && (
        <div className="chat-bubble__avatar">
          <UserAvatar
            videoSrc={
              msg.senderVideo ||
              (msg.senderAvatar &&
              /\.(mp4|webm|mov|gif)(\?|$)/i.test(msg.senderAvatar)
                ? msg.senderAvatar
                : undefined)
            }
            src={
              !msg.senderVideo &&
              msg.senderAvatar &&
              !/\.(mp4|webm|mov|gif)(\?|$)/i.test(msg.senderAvatar)
                ? msg.senderAvatar
                : undefined
            }
            alt={msg.senderName}
            size={28}
          />
        </div>
      )}
      <div className="chat-bubble__col">
        <div
          className={`chat-bubble ${isMine ? "chat-bubble--mine" : "chat-bubble--theirs"} ${!showAvatar && !isMine ? "chat-bubble--continued" : ""} ${msg.deleted ? "chat-bubble--deleted" : ""}`}
        >
          {showName && !isMine && showAvatar && (
            <span className="chat-bubble__name">{msg.senderName}</span>
          )}
          {renderContent()}
          <div className="chat-bubble__meta">
            {msg.edited && !msg.deleted && (
              <span className="chat-bubble__edited">editado</span>
            )}
            <span className="chat-bubble__time">{time}</span>
            {statusIcon()}
          </div>
        </div>
        {!msg.deleted && !msg.isSystem && !selectMode && (
          <button
            className="chat-bubble__quick-action"
            onClick={(e) => {
              e.stopPropagation();
              setShowCtx(true);
            }}
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>
      {showCtx && (
        <div
          className={`chat-ctx-menu ${isMine ? "chat-ctx-menu--mine" : "chat-ctx-menu--theirs"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="chat-ctx-menu__overlay"
            onClick={() => {
              setShowCtx(false);
              setShowDelOpts(false);
            }}
          />
          <div className="chat-ctx-menu__box">
            {!showDelOpts ? (
              <>
                <button
                  className="chat-ctx-menu__item"
                  onClick={() => {
                    navigator.clipboard?.writeText(msg.content).catch(() => {});
                    setShowCtx(false);
                  }}
                >
                  <Copy size={14} /> Copiar
                </button>
                <button
                  className="chat-ctx-menu__item"
                  onClick={() => {
                    onForward();
                    setShowCtx(false);
                  }}
                >
                  <Forward size={14} /> Reenviar
                </button>
                <button
                  className="chat-ctx-menu__item"
                  onClick={() => {
                    onLongPress();
                    setShowCtx(false);
                  }}
                >
                  <CheckSquare size={14} /> Seleccionar
                </button>
                <button
                  className="chat-ctx-menu__item"
                  onClick={() => {
                    navigator.share?.({ text: msg.content }).catch(() => {});
                    setShowCtx(false);
                  }}
                >
                  <Share2 size={14} /> Compartir
                </button>
                {isMine && !msg.deleted && (
                  <button
                    className="chat-ctx-menu__item"
                    onClick={() => {
                      onEdit();
                      setShowCtx(false);
                    }}
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                )}
                <button
                  className="chat-ctx-menu__item chat-ctx-menu__item--danger"
                  onClick={() => setShowDelOpts(true)}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </>
            ) : (
              <>
                <p className="chat-ctx-menu__delete-title">
                  ¿Eliminar mensaje?
                </p>
                <button
                  className="chat-ctx-menu__item"
                  onClick={() => {
                    onDelete(false);
                    setShowCtx(false);
                    setShowDelOpts(false);
                  }}
                >
                  Eliminar para mí
                </button>
                {isMine && (
                  <button
                    className="chat-ctx-menu__item chat-ctx-menu__item--danger"
                    onClick={() => {
                      onDelete(true);
                      setShowCtx(false);
                      setShowDelOpts(false);
                    }}
                  >
                    Eliminar para todos
                  </button>
                )}
                <button
                  className="chat-ctx-menu__item chat-ctx-menu__item--cancel"
                  onClick={() => setShowDelOpts(false)}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// WallpaperPicker
// ══════════════════════════════════════════════════════════
export function WallpaperPicker({
  currentWallpaper,
  onSelect,
  onClose,
}: {
  currentWallpaper: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div
        className="chat-modal chat-modal--wallpaper"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-modal__header">
          <ImageIcon size={20} />
          <h2>Fondo del chat</h2>
          <button className="chat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="chat-modal__hint" style={{ padding: "0 20px 8px" }}>
          El fondo se aplica solo a esta conversación.
        </p>
        <div className="chat-wallpaper-grid">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              className={`chat-wallpaper-card ${currentWallpaper === w.id ? "chat-wallpaper-card--active" : ""}`}
              onClick={() => onSelect(w.id)}
            >
              <div
                className="chat-wallpaper-card__preview"
                style={{
                  backgroundColor:
                    (w as any).bgColor ??
                    (w.preview?.startsWith("#") ? w.preview : "transparent"),
                  background:
                    (w as any).bg?.startsWith("linear") ||
                    (w as any).bg?.startsWith("radial") ||
                    (w as any).bg?.startsWith("repeating")
                      ? (w as any).bg
                      : w.preview?.startsWith("linear")
                        ? w.preview
                        : undefined,
                  backgroundSize: (w as any).bgSize || "cover",
                }}
              >
                <div className="chat-wallpaper-card__bubbles">
                  <div className="chat-wallpaper-card__bub chat-wallpaper-card__bub--theirs" />
                  <div className="chat-wallpaper-card__bub chat-wallpaper-card__bub--mine" />
                  <div
                    className="chat-wallpaper-card__bub chat-wallpaper-card__bub--theirs"
                    style={{ width: "55%" }}
                  />
                </div>
              </div>
              <span>{w.label}</span>
              {currentWallpaper === w.id && (
                <Check size={12} className="chat-wallpaper-card__check" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DeleteConfirmModal
// ══════════════════════════════════════════════════════════
export function DeleteConfirmModal({
  count,
  onDeleteForMe,
  onDeleteForAll,
  onClose,
}: {
  count: number;
  onDeleteForMe: () => void;
  onDeleteForAll: () => void;
  onClose: () => void;
}) {
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div
        className="chat-modal chat-modal--confirm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-modal__header">
          <Trash2 size={20} />
          <h2>
            Eliminar {count} mensaje{count !== 1 ? "s" : ""}
          </h2>
          <button className="chat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            padding: "12px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <button
            className="chat-modal__submit"
            style={{ background: "rgba(255,255,255,0.08)" }}
            onClick={onDeleteForMe}
          >
            Eliminar para mí
          </button>
          <button
            className="chat-modal__submit chat-modal__submit--block"
            onClick={onDeleteForAll}
          >
            Eliminar para todos
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ForwardModal
// ══════════════════════════════════════════════════════════
export function ForwardModal({
  messages: msgs,
  conversations,
  onForward,
  onClose,
}: {
  messages: Message[];
  conversations: Conversation[];
  onForward: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const filtered = conversations.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) && !c.isBlocked,
  );
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal__header">
          <Forward size={20} />
          <h2>
            Reenviar {msgs.length} mensaje{msgs.length !== 1 ? "s" : ""}
          </h2>
          <button className="chat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div
          className="chat-search chat-modal__search"
          style={{ margin: "0 16px 8px" }}
        >
          <span style={{ color: "rgba(240,240,248,0.4)", display: "flex" }}>
            <Flag size={15} />
          </span>
          <input
            className="chat-search__input"
            placeholder="Buscar conversación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="chat-modal__results">
          {filtered.map((c) => (
            <div
              key={c._id}
              className={`chat-modal__result ${selected.has(c._id) ? "chat-modal__result--selected" : ""}`}
              onClick={() =>
                setSelected((prev) => {
                  const n = new Set(prev);
                  n.has(c._id) ? n.delete(c._id) : n.add(c._id);
                  return n;
                })
              }
            >
              <div className="chat-modal__result-avatar">
                <UserAvatar
                  videoSrc={
                    c.avatarUrl &&
                    /\.(mp4|webm|mov|gif)(\?|$)/i.test(c.avatarUrl)
                      ? c.avatarUrl
                      : undefined
                  }
                  src={
                    c.avatarUrl &&
                    !/\.(mp4|webm|mov|gif)(\?|$)/i.test(c.avatarUrl)
                      ? c.avatarUrl
                      : undefined
                  }
                  alt={c.name}
                  size={32}
                />
              </div>
              <div className="chat-modal__result-info">
                <span className="chat-modal__result-name">{c.name}</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {c.type === "private"
                    ? "Chat privado"
                    : c.type === "group"
                      ? "Grupo"
                      : "Comunidad"}
                </span>
              </div>
              {selected.has(c._id) && (
                <Check size={16} className="chat-modal__check" />
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="chat-modal__no-results">Sin resultados</div>
          )}
        </div>
        <button
          className="chat-modal__submit"
          disabled={selected.size === 0}
          onClick={() => onForward([...selected])}
        >
          <Forward size={15} /> Reenviar a {selected.size} chat
          {selected.size !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PrivacyModal
// ══════════════════════════════════════════════════════════
export function PrivacyModal({ onClose }: { onClose: () => void }) {
  const sections = [
    {
      icon: <Shield size={18} />,
      title: "Datos que recopilamos",
      content:
        "Recopilamos información necesaria para el funcionamiento de la plataforma: nombre de usuario, dirección de correo electrónico, avatar y datos de actividad dentro de la app. No vendemos ni compartimos tus datos con terceros.",
    },
    {
      icon: <Lock size={18} />,
      title: "Encriptación de mensajes",
      content:
        "Todos los mensajes privados utilizan encriptación de extremo a extremo. Nakama no puede leer el contenido de tus conversaciones privadas. Los mensajes grupales están encriptados en tránsito.",
    },
    {
      icon: <FileText size={18} />,
      title: "Uso de la información",
      content:
        "Tu información se utiliza exclusivamente para personalizar tu experiencia, conectarte con otros usuarios y mejorar nuestros servicios. Nunca usaremos tus datos para publicidad de terceros.",
    },
    {
      icon: <Bell size={18} />,
      title: "Notificaciones",
      content:
        "Podés gestionar las notificaciones en cualquier momento desde la configuración. Las notificaciones del sistema son enviadas solo por administradores autorizados.",
    },
    {
      icon: <Users size={18} />,
      title: "Datos de terceros",
      content:
        "Si conectás redes sociales (TikTok, Instagram, Facebook), solo accedemos a los datos de perfil público necesarios para sugerencias de contacto. Podés desconectarlas en cualquier momento.",
    },
    {
      icon: <Trash2 size={18} />,
      title: "Eliminación de datos",
      content:
        "Podés solicitar la eliminación completa de tu cuenta y todos tus datos en cualquier momento desde Configuración > Cuenta > Eliminar cuenta. El proceso tarda hasta 30 días.",
    },
  ];
  return (
    <div className="chat-modal-overlay chat-privacy-overlay" onClick={onClose}>
      <div
        className="chat-modal chat-privacy-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-privacy-modal__header">
          <div className="chat-privacy-modal__title-wrap">
            <div className="chat-privacy-modal__icon-wrap">
              <ScrollText size={22} />
            </div>
            <div>
              <h2 className="chat-privacy-modal__title">
                Política de Privacidad
              </h2>
              <span className="chat-privacy-modal__version">
                Versión 2.0 · Actualizada enero 2025
              </span>
            </div>
          </div>
          <button className="chat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="chat-privacy-modal__intro">
          <p>
            En <strong>Nakama</strong> tu privacidad es nuestra prioridad.
          </p>
        </div>
        <div className="chat-privacy-modal__sections">
          {sections.map((s, i) => (
            <div key={i} className="chat-privacy-section">
              <div className="chat-privacy-section__header">
                <span className="chat-privacy-section__icon">{s.icon}</span>
                <span className="chat-privacy-section__title">{s.title}</span>
                <ChevronRight
                  size={14}
                  className="chat-privacy-section__arrow"
                />
              </div>
              <p className="chat-privacy-section__content">{s.content}</p>
            </div>
          ))}
        </div>
        <div className="chat-privacy-modal__footer">
          <p>
            ¿Tenés preguntas? Contactanos en{" "}
            <strong>privacidad@nakama.app</strong>
          </p>
          <button
            className="chat-modal__submit chat-privacy-modal__accept"
            onClick={onClose}
          >
            <Check size={15} /> Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// BlockReportModal
// ══════════════════════════════════════════════════════════
export function BlockReportModal({
  targetUserId,
  targetUsername,
  chatId,
  isBlocked,
  onBlock,
  onClose,
}: {
  targetUserId: string;
  targetUsername: string;
  chatId: string;
  isBlocked: boolean;
  onBlock: (id: string, currently: boolean) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"block" | "report">("block");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleReport() {
    if (!reason) return setError("Seleccioná un motivo.");
    setSubmitting(true);
    setError("");
    const token = localStorage.getItem("nakama_token");
    try {
      const res = await fetch(`${API}/chats/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId, chatId, reason, details }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Error al enviar reporte.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Error de red.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div
        className="chat-modal chat-modal--block-report"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-modal__header">
          <ShieldAlert size={20} />
          <h2>@{targetUsername}</h2>
          <button className="chat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="chat-block-report-tabs">
          <button
            className={`chat-block-report-tab ${tab === "block" ? "active" : ""}`}
            onClick={() => setTab("block")}
          >
            <Ban size={14} /> {isBlocked ? "Desbloquear" : "Bloquear"}
          </button>
          <button
            className={`chat-block-report-tab ${tab === "report" ? "active" : ""}`}
            onClick={() => setTab("report")}
          >
            <Flag size={14} /> Reportar
          </button>
        </div>
        {tab === "block" && (
          <div className="chat-block-report-body">
            {isBlocked ? (
              <>
                <p>
                  ¿Querés desbloquear a <strong>@{targetUsername}</strong>?
                </p>
                <p className="chat-block-report-hint">
                  Podrá volverte a enviar mensajes.
                </p>
                <button
                  className="chat-modal__submit chat-modal__submit--unblock"
                  onClick={() => onBlock(targetUserId, true)}
                >
                  Desbloquear
                </button>
              </>
            ) : (
              <>
                <p>
                  ¿Bloqueás a <strong>@{targetUsername}</strong>?
                </p>
                <ul className="chat-block-report-list">
                  <li>No podrá enviarte mensajes</li>
                  <li>No verá tu estado en línea</li>
                  <li>Podés desbloquearlo cuando quieras</li>
                </ul>
                <button
                  className="chat-modal__submit chat-modal__submit--block"
                  onClick={() => onBlock(targetUserId, false)}
                >
                  <Ban size={15} /> Bloquear a @{targetUsername}
                </button>
              </>
            )}
          </div>
        )}
        {tab === "report" && (
          <div className="chat-block-report-body">
            {submitted ? (
              <div className="chat-block-report-success">
                <span className="chat-block-report-success__icon">✅</span>
                <p>Reporte enviado.</p>
                <button className="chat-modal__submit" onClick={onClose}>
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <p className="chat-block-report-label">
                  ¿Por qué reportás a <strong>@{targetUsername}</strong>?
                </p>
                <div className="chat-block-report-reasons">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      className={`chat-block-report-reason ${reason === r.value ? "active" : ""}`}
                      onClick={() => setReason(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="chat-block-report-details"
                  placeholder="Detalles adicionales (opcional)..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                {error && <p className="chat-block-report-error">{error}</p>}
                <button
                  className="chat-modal__submit chat-modal__submit--report"
                  disabled={!reason || submitting}
                  onClick={handleReport}
                >
                  {submitting ? (
                    <span className="btn-spinner" />
                  ) : (
                    <>
                      <Flag size={14} /> Enviar reporte
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ChatView
// ══════════════════════════════════════════════════════════
export function ChatView({
  conv,
  messages,
  input,
  setInput,
  onSend,
  onKeyDown,
  typing,
  currentUserId,
  messagesEnd,
  inputRef,
  onBack,
  socketRef,
  onFileSend,
  onAudioSend,
  onEphemeralSend,
  contacts,
  onViewEphemeral,
  onOpenBlockReport,
  selectMode,
  selectedMsgs,
  onToggleSelect,
  onExitSelect,
  onDeleteSelected,
  onForwardSelected,
  onEditMsg,
  onDeleteMsg,
  onForwardMsg,
  editingMsg,
  onCancelEdit,
  onChangeWallpaper,
  currentWallpaper,
}: {
  conv: Conversation;
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  typing: boolean;
  currentUserId: string;
  userRole: string;
  messagesEnd: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onBack: () => void;
  socketRef: React.RefObject<NakamaSocket | null>;
  onFileSend: (file: UploadedFile, caption?: string) => void;
  onAudioSend: (file: UploadedFile) => void;
  onEphemeralSend: (
    file: UploadedFile,
    caption: string | undefined,
    config: EphemeralConfig,
  ) => void;
  contacts: any[];
  onViewEphemeral: (msg: Message) => void;
  onOpenBlockReport: (id: string, name: string) => void;
  selectMode: boolean;
  selectedMsgs: Set<string>;
  onToggleSelect: (id: string) => void;
  onExitSelect: () => void;
  onDeleteSelected: (forAll: boolean) => void;
  onForwardSelected: () => void;
  onEditMsg: (msg: Message) => void;
  onDeleteMsg: (id: string, forAll: boolean) => void;
  onForwardMsg: (msg: Message) => void;
  editingMsg: Message | null;
  onCancelEdit: () => void;
  onChangeWallpaper: (wallId: string) => void;
  currentWallpaper: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<
    null | "me" | "all"
  >(null);

  const wallpaper =
    WALLPAPERS.find((w) => w.id === currentWallpaper) ?? WALLPAPERS[0];
  const wallpaperStyle: React.CSSProperties =
    wallpaper.id !== "none"
      ? ({
          "--wall-bg": wallpaper.bg ?? "",
          "--wall-bg-color": wallpaper.bgColor ?? "transparent",
          "--wall-bg-size": wallpaper.bgSize ?? "cover",
          "--wall-active": "1",
        } as React.CSSProperties)
      : ({ "--wall-active": "0" } as React.CSSProperties);

  const hasSelectedMine = [...selectedMsgs].some((id) => {
    const msg = messages.find((m) => m._id === id);
    return msg?.senderId === currentUserId;
  });

  // ── Helper local para el header del chat ─────────────
  const convIsAnimated =
    conv.avatarUrl && /\.(mp4|webm|mov|gif)(\?|$)/i.test(conv.avatarUrl);

  return (
    <div className="chat-view">
      <div className="chat-view__header">
        <button className="chat-icon-btn chat-view__back" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="chat-view__header-info">
          <div className="chat-view__header-avatar-wrap">
            <UserAvatar
              videoSrc={convIsAnimated ? conv.avatarUrl : undefined}
              src={!convIsAnimated ? conv.avatarUrl : undefined}
              alt={conv.name}
              size={36}
            />
            {conv.type === "private" && conv.online && (
              <span className="chat-view__online-dot" />
            )}
          </div>
          <div>
            <div className="chat-view__header-name">
              {conv.name}
              {conv.type === "private" && (
                <Lock size={11} className="chat-view__lock" />
              )}
              {conv.isBlocked && (
                <Ban size={11} className="chat-view__blocked-icon" />
              )}
            </div>
            <div className="chat-view__header-sub">
              {typing ? (
                <span className="chat-view__typing">escribiendo...</span>
              ) : conv.type === "private" ? (
                <span>
                  {conv.isBlocked
                    ? "Bloqueado"
                    : conv.online
                      ? "En línea"
                      : "Desconectado"}
                </span>
              ) : (
                <span>{conv.memberCount?.toLocaleString()} miembros</span>
              )}
            </div>
          </div>
        </div>
        <div className="chat-view__header-actions">
          {conv.type === "private" && !conv.isBlocked && !selectMode && (
            <>
              <button className="chat-icon-btn">
                <Phone size={18} />
              </button>
              <button className="chat-icon-btn">
                <Video size={18} />
              </button>
            </>
          )}
          {selectMode ? (
            <button
              className="chat-icon-btn chat-view__select-cancel"
              onClick={onExitSelect}
            >
              <XCircle size={20} />
              <span style={{ fontSize: "0.8rem" }}>Cancelar</span>
            </button>
          ) : (
            <div className="chat-view__menu-wrap">
              <button
                className="chat-icon-btn"
                onClick={() => setShowMenu((v) => !v)}
              >
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <div
                  className="chat-view__dropdown"
                  onClick={() => setShowMenu(false)}
                >
                  {conv.type === "private" && conv.otherId && (
                    <>
                      <button
                        className={`chat-view__dropdown-item ${conv.isBlocked ? "chat-view__dropdown-item--unblock" : "chat-view__dropdown-item--block"}`}
                        onClick={() =>
                          onOpenBlockReport(conv.otherId!, conv.name)
                        }
                      >
                        <Ban size={14} />{" "}
                        {conv.isBlocked ? "Desbloquear" : "Bloquear"}
                      </button>
                      <button
                        className="chat-view__dropdown-item chat-view__dropdown-item--report"
                        onClick={() =>
                          onOpenBlockReport(conv.otherId!, conv.name)
                        }
                      >
                        <Flag size={14} /> Reportar
                      </button>
                    </>
                  )}
                  <button
                    className="chat-view__dropdown-item"
                    onClick={() => setShowWallpaperPicker(true)}
                  >
                    <ImageIcon size={14} /> Cambiar fondo
                  </button>
                  <button className="chat-view__dropdown-item">
                    <BellOff size={14} /> Silenciar
                  </button>
                  {conv.type === "private" && conv.otherId && (
                    <button
                      className="chat-view__dropdown-item chat-view__dropdown-item--delete-contact"
                      onClick={() => {
                        if (
                          confirm(`¿Eliminar a @${conv.name} de tus contactos?`)
                        )
                          (window as any).__nakama_deleteContact?.(
                            conv.otherId!,
                          );
                      }}
                    >
                      <UserX size={14} /> Eliminar contacto
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectMode && selectedMsgs.size > 0 && (
        <div className="chat-select-bar">
          <span className="chat-select-bar__count">
            {selectedMsgs.size} seleccionado{selectedMsgs.size !== 1 ? "s" : ""}
          </span>
          <div className="chat-select-bar__actions">
            <button
              className="chat-select-bar__btn"
              onClick={onForwardSelected}
            >
              <Forward size={16} /> Reenviar
            </button>
            <button
              className="chat-select-bar__btn"
              onClick={() => {
                const text = [...selectedMsgs]
                  .map(
                    (id) => messages.find((m) => m._id === id)?.content ?? "",
                  )
                  .join("\n");
                navigator.clipboard?.writeText(text).catch(() => {});
              }}
            >
              <Copy size={16} /> Copiar
            </button>
            {hasSelectedMine && (
              <button
                className="chat-select-bar__btn chat-select-bar__btn--delete"
                onClick={() => setShowDeleteConfirm("all")}
              >
                <Trash2 size={16} /> Eliminar
              </button>
            )}
            {!hasSelectedMine && (
              <button
                className="chat-select-bar__btn chat-select-bar__btn--delete"
                onClick={() => onDeleteSelected(false)}
              >
                <Trash2 size={16} /> Eliminar para mí
              </button>
            )}
          </div>
        </div>
      )}

      {conv.isBlocked && (
        <div className="chat-blocked-banner">
          <Shield size={16} />
          <span>
            Bloqueaste a <strong>@{conv.name}</strong>. No puede enviarte
            mensajes.
          </span>
        </div>
      )}

      <div
        className="chat-view__messages"
        style={wallpaperStyle}
        data-wall={wallpaper.id}
      >
        {messages.length === 0 ? (
          <div className="chat-view__messages-empty">
            <Lock size={24} />
            <p>Los mensajes están encriptados de extremo a extremo</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isMine={msg.senderId === currentUserId}
              showName={conv.type !== "private"}
              prevMsg={messages[i - 1]}
              selectMode={selectMode}
              selected={selectedMsgs.has(msg._id)}
              onToggleSelect={() => onToggleSelect(msg._id)}
              onLongPress={() => onToggleSelect(msg._id)}
              onEdit={() => onEditMsg(msg)}
              onDelete={(forAll) => onDeleteMsg(msg._id, forAll)}
              onForward={() => onForwardMsg(msg)}
              onViewEphemeral={onViewEphemeral}
            />
          ))
        )}
        {typing && (
          <div className="chat-typing-indicator">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {editingMsg && (
        <div className="chat-edit-bar">
          <Edit3 size={14} />
          <div className="chat-edit-bar__text">
            <span className="chat-edit-bar__label">Editando mensaje</span>
            <span className="chat-edit-bar__preview">
              {editingMsg.content.slice(0, 60)}
              {editingMsg.content.length > 60 ? "…" : ""}
            </span>
          </div>
          <button className="chat-icon-btn" onClick={onCancelEdit}>
            <X size={16} />
          </button>
        </div>
      )}

      {conv.isBlocked ? (
        <div className="chat-view__blocked-input">
          <Ban size={16} /> No podés enviar mensajes a este usuario
        </div>
      ) : (conv as any).isReadOnly ? (
        <div
          className="chat-view__blocked-input"
          style={{ gap: 10, justifyContent: "center" }}
        >
          <Shield
            size={15}
            style={{ color: "rgba(230,57,70,0.6)", flexShrink: 0 }}
          />
          <span style={{ color: "rgba(240,240,248,0.45)", fontSize: "0.8rem" }}>
            Mensaje de Nakama · solo lectura
          </span>
        </div>
      ) : (
        <div className="chat-view__input-bar">
          <ImageUploadButton
            onFileSend={onFileSend}
            onEphemeralSend={onEphemeralSend}
            disabled={conv.isBlocked}
          />
          <button className="chat-icon-btn">
            <Smile size={18} />
          </button>
          <div className="chat-view__input-wrap">
            <textarea
              ref={inputRef}
              className="chat-view__input"
              placeholder={
                editingMsg ? "Editá tu mensaje..." : "Escribí un mensaje..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
            />
          </div>
          {input.trim() ? (
            <button className="chat-send-btn" onClick={onSend}>
              {editingMsg ? <Check size={18} /> : <Send size={18} />}
            </button>
          ) : (
            <AudioRecorder
              onAudioSend={onAudioSend}
              disabled={conv.isBlocked}
            />
          )}
        </div>
      )}

      {showWallpaperPicker && (
        <WallpaperPicker
          currentWallpaper={currentWallpaper}
          onSelect={(id) => {
            onChangeWallpaper(id);
            setShowWallpaperPicker(false);
          }}
          onClose={() => setShowWallpaperPicker(false)}
        />
      )}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={selectedMsgs.size}
          onDeleteForMe={() => {
            onDeleteSelected(false);
            setShowDeleteConfirm(null);
          }}
          onDeleteForAll={() => {
            onDeleteSelected(true);
            setShowDeleteConfirm(null);
          }}
          onClose={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
