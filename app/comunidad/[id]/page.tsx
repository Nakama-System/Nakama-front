"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useParams } from "next/navigation";

import ChallengeButton from "../../components/ChallengeButton";
import EphemeralComposer from "../../components/EphemeralComposer";
// CAMBIO 1: Import de BattleInvitationModal
import BattleInvitationModal from "../../components/BattleInvitationModal";

import {
  ArrowLeft,
  Send,
  Users,
  Heart,
  Settings,
  Shield,
  Star,
  Crown,
  Snowflake,
  Zap,
  UserMinus,
  MoreVertical,
  Search,
  Edit3,
  FileText,
  MessageSquareOff,
  MessageSquare,
  X,
  Check,
  Flag,
  Home,
  Globe,
  UserPlus,
  Lock,
  Loader2,
  AlertCircle,
  Sparkles,
  Activity,
  ChevronDown,
  Sun,
  Moon,
  Waves,
  Cherry,
  Gem,
  Cpu,
  Palette,
  RefreshCw,
  Info,
  MessageCircle,
  TrendingUp,
  Hash,
  Link2,
  Share2,
  ThumbsUp,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Camera,
  Upload,
  Trash2,
  Pencil,
  Timer,
  FlameKindling,
  Clock,
  Image,
  Type,
} from "lucide-react";
import { useAuth } from "../../context/authContext";
import "../../styles/comunidad.css";

const API = "https://nakama-vercel-backend.vercel.app";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "https://nakama-vercel-backend.vercel.app";

export type CommunityTheme =
  | "dark"
  | "light"
  | "ocean"
  | "forest"
  | "sunset"
  | "sakura"
  | "neon"
  | "gold"
  | "galaxy";

interface ThemeDef {
  id: CommunityTheme;
  label: string;
  icon: React.ReactNode;
  pro?: boolean;
  premium?: boolean;
  vars: {
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    accent: string;
    accentFg: string;
    accentMuted: string;
    text: string;
    textSub: string;
    textMuted: string;
    headerBg: string;
    tabActiveFg: string;
    tabActiveBorder: string;
    inputBg: string;
    inputBorder: string;
    inputText: string;
    bubbleSent: string;
    bubbleSentText: string;
    bubbleRecv: string;
    bubbleRecvText: string;
    onlineDot: string;
    dangerFg: string;
  };
}

const THEMES: ThemeDef[] = [
  {
    id: "dark",
    label: "Oscuro",
    icon: <Moon size={16} />,
    vars: {
      bg: "#070714",
      surface: "rgba(255,255,255,0.04)",
      surface2: "rgba(255,255,255,0.07)",
      border: "rgba(255,255,255,0.08)",
      accent: "#e63946",
      accentFg: "#ffffff",
      accentMuted: "rgba(230,57,70,0.15)",
      text: "#f0f0f8",
      textSub: "rgba(240,240,248,0.65)",
      textMuted: "rgba(240,240,248,0.38)",
      headerBg: "rgba(7,7,20,0.92)",
      tabActiveFg: "#e63946",
      tabActiveBorder: "#e63946",
      inputBg: "rgba(255,255,255,0.05)",
      inputBorder: "rgba(255,255,255,0.1)",
      inputText: "#f0f0f8",
      bubbleSent: "linear-gradient(135deg,#e63946,#a855f7)",
      bubbleSentText: "#ffffff",
      bubbleRecv: "rgba(255,255,255,0.06)",
      bubbleRecvText: "#f0f0f8",
      onlineDot: "#34d399",
      dangerFg: "#f87171",
    },
  },
  {
    id: "light",
    label: "Claro",
    icon: <Sun size={16} />,
    vars: {
      bg: "#e8eaf0",
      surface: "rgba(255,255,255,0.75)",
      surface2: "rgba(255,255,255,0.55)",
      border: "rgba(100,110,140,0.15)",
      accent: "#e63946",
      accentFg: "#ffffff",
      accentMuted: "rgba(230,57,70,0.1)",
      text: "#1c1e2e",
      textSub: "rgba(28,30,46,0.68)",
      textMuted: "rgba(28,30,46,0.4)",
      headerBg: "rgba(232,234,240,0.94)",
      tabActiveFg: "#e63946",
      tabActiveBorder: "#e63946",
      inputBg: "rgba(255,255,255,0.8)",
      inputBorder: "rgba(100,110,140,0.18)",
      inputText: "#1c1e2e",
      bubbleSent: "linear-gradient(135deg,#e63946,#c0305a)",
      bubbleSentText: "#ffffff",
      bubbleRecv: "rgba(255,255,255,0.85)",
      bubbleRecvText: "#1c1e2e",
      onlineDot: "#16a34a",
      dangerFg: "#dc2626",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    icon: <Waves size={16} />,
    pro: true,
    vars: {
      bg: "#071525",
      surface: "rgba(14,165,233,0.07)",
      surface2: "rgba(14,165,233,0.12)",
      border: "rgba(14,165,233,0.15)",
      accent: "#0ea5e9",
      accentFg: "#ffffff",
      accentMuted: "rgba(14,165,233,0.15)",
      text: "#e0f2fe",
      textSub: "rgba(224,242,254,0.65)",
      textMuted: "rgba(224,242,254,0.38)",
      headerBg: "rgba(7,21,37,0.94)",
      tabActiveFg: "#38bdf8",
      tabActiveBorder: "#0ea5e9",
      inputBg: "rgba(14,165,233,0.06)",
      inputBorder: "rgba(14,165,233,0.2)",
      inputText: "#e0f2fe",
      bubbleSent: "linear-gradient(135deg,#0284c7,#0ea5e9)",
      bubbleSentText: "#ffffff",
      bubbleRecv: "rgba(14,165,233,0.1)",
      bubbleRecvText: "#e0f2fe",
      onlineDot: "#4ade80",
      dangerFg: "#f87171",
    },
  },
  {
    id: "forest",
    label: "Forest",
    icon: <Sparkles size={16} />,
    pro: true,
    vars: {
      bg: "#0a1a0e",
      surface: "rgba(34,197,94,0.06)",
      surface2: "rgba(34,197,94,0.1)",
      border: "rgba(34,197,94,0.12)",
      accent: "#22c55e",
      accentFg: "#ffffff",
      accentMuted: "rgba(34,197,94,0.12)",
      text: "#dcfce7",
      textSub: "rgba(220,252,231,0.65)",
      textMuted: "rgba(220,252,231,0.38)",
      headerBg: "rgba(10,26,14,0.94)",
      tabActiveFg: "#4ade80",
      tabActiveBorder: "#22c55e",
      inputBg: "rgba(34,197,94,0.05)",
      inputBorder: "rgba(34,197,94,0.18)",
      inputText: "#dcfce7",
      bubbleSent: "linear-gradient(135deg,#16a34a,#22c55e)",
      bubbleSentText: "#ffffff",
      bubbleRecv: "rgba(34,197,94,0.08)",
      bubbleRecvText: "#dcfce7",
      onlineDot: "#4ade80",
      dangerFg: "#f87171",
    },
  },
  {
    id: "sakura",
    label: "Sakura",
    icon: <Cherry size={16} />,
    premium: true,
    vars: {
      bg: "#1a0d14",
      surface: "rgba(244,114,182,0.06)",
      surface2: "rgba(244,114,182,0.1)",
      border: "rgba(244,114,182,0.12)",
      accent: "#f472b6",
      accentFg: "#ffffff",
      accentMuted: "rgba(244,114,182,0.12)",
      text: "#fce7f3",
      textSub: "rgba(252,231,243,0.65)",
      textMuted: "rgba(252,231,243,0.38)",
      headerBg: "rgba(26,13,20,0.94)",
      tabActiveFg: "#f9a8d4",
      tabActiveBorder: "#f472b6",
      inputBg: "rgba(244,114,182,0.05)",
      inputBorder: "rgba(244,114,182,0.18)",
      inputText: "#fce7f3",
      bubbleSent: "linear-gradient(135deg,#db2777,#f472b6)",
      bubbleSentText: "#ffffff",
      bubbleRecv: "rgba(244,114,182,0.08)",
      bubbleRecvText: "#fce7f3",
      onlineDot: "#4ade80",
      dangerFg: "#f87171",
    },
  },
  {
    id: "neon",
    label: "Neon",
    icon: <Cpu size={16} />,
    premium: true,
    vars: {
      bg: "#050510",
      surface: "rgba(139,92,246,0.07)",
      surface2: "rgba(139,92,246,0.12)",
      border: "rgba(139,92,246,0.15)",
      accent: "#8b5cf6",
      accentFg: "#ffffff",
      accentMuted: "rgba(139,92,246,0.15)",
      text: "#ede9fe",
      textSub: "rgba(237,233,254,0.65)",
      textMuted: "rgba(237,233,254,0.38)",
      headerBg: "rgba(5,5,16,0.96)",
      tabActiveFg: "#a78bfa",
      tabActiveBorder: "#8b5cf6",
      inputBg: "rgba(139,92,246,0.06)",
      inputBorder: "rgba(139,92,246,0.2)",
      inputText: "#ede9fe",
      bubbleSent: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
      bubbleSentText: "#ffffff",
      bubbleRecv: "rgba(139,92,246,0.1)",
      bubbleRecvText: "#ede9fe",
      onlineDot: "#4ade80",
      dangerFg: "#f87171",
    },
  },
  {
    id: "gold",
    label: "Gold",
    icon: <Crown size={16} />,
    premium: true,
    vars: {
      bg: "#120e00",
      surface: "rgba(234,179,8,0.07)",
      surface2: "rgba(234,179,8,0.12)",
      border: "rgba(234,179,8,0.15)",
      accent: "#eab308",
      accentFg: "#000000",
      accentMuted: "rgba(234,179,8,0.12)",
      text: "#fefce8",
      textSub: "rgba(254,252,232,0.65)",
      textMuted: "rgba(254,252,232,0.38)",
      headerBg: "rgba(18,14,0,0.96)",
      tabActiveFg: "#fde047",
      tabActiveBorder: "#eab308",
      inputBg: "rgba(234,179,8,0.05)",
      inputBorder: "rgba(234,179,8,0.2)",
      inputText: "#fefce8",
      bubbleSent: "linear-gradient(135deg,#ca8a04,#eab308)",
      bubbleSentText: "#ffffff",
      bubbleRecv: "rgba(234,179,8,0.08)",
      bubbleRecvText: "#fefce8",
      onlineDot: "#4ade80",
      dangerFg: "#f87171",
    },
  },
  {
    id: "galaxy",
    label: "Galaxy",
    icon: <Gem size={16} />,
    premium: true,
    vars: {
      bg: "#04001a",
      surface: "rgba(99,102,241,0.07)",
      surface2: "rgba(99,102,241,0.12)",
      border: "rgba(99,102,241,0.14)",
      accent: "#6366f1",
      accentFg: "#ffffff",
      accentMuted: "rgba(99,102,241,0.14)",
      text: "#eef2ff",
      textSub: "rgba(238,242,255,0.65)",
      textMuted: "rgba(238,242,255,0.38)",
      headerBg: "rgba(4,0,26,0.96)",
      tabActiveFg: "#818cf8",
      tabActiveBorder: "#6366f1",
      inputBg: "rgba(99,102,241,0.06)",
      inputBorder: "rgba(99,102,241,0.18)",
      inputText: "#eef2ff",
      bubbleSent: "linear-gradient(135deg,#4f46e5,#6366f1)",
      bubbleSentText: "#ffffff",
      bubbleRecv: "rgba(99,102,241,0.1)",
      bubbleRecvText: "#eef2ff",
      onlineDot: "#4ade80",
      dangerFg: "#f87171",
    },
  },
];

function getTheme(id: CommunityTheme): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

type FrameColor =
  | "none"
  | "red"
  | "blue"
  | "green"
  | "gold"
  | "purple"
  | "black"
  | "orange";

interface CommunityMember {
  _id: string;
  username: string;
  avatarUrl?: string;
  profileVideo?: { url: string };
  role: "admin" | "member";
  hasStar: boolean;
  frameColor: FrameColor;
  frozen: boolean;
  frozenUntil?: string | null;
  msgCount: number;
  joinedAt: string;
  online?: boolean;
}
interface Community {
  _id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  coverUrl?: string;
  creatorId: string;
  memberCount: number;
  likeCount: number;
  isLiked: boolean;
  isMember: boolean;
  messagingOpen: boolean;
  rules: string;
  members: CommunityMember[];
  createdAt: string;
  theme?: CommunityTheme;
}

interface FeedMessage {
  _id: string;
  type: "message" | "join_event" | "ephemeral";
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderVideo?: string;
  senderFrame: FrameColor;
  hasStar: boolean;
  isAdmin: boolean;
  text?: string;
  deleted?: boolean;
  edited?: boolean;
  editedText?: string;
  joinedUsers?: { _id: string; username: string; avatarUrl?: string }[];
  memberNumber?: number;
  thumbnailUrl?: string;
  caption?: string;
  ephemeralDestroyed?: boolean;
  ephemeralViewed?: boolean;
  createdAt: string;
}

interface UserSuggestion {
  _id: string;
  username: string;
  avatarUrl?: string | null;
}
type Panel = "none" | "members" | "settings" | "rules" | "stats" | "invite";

const FRAME_COLORS: Record<FrameColor, string> = {
  none: "rgba(255,255,255,0.14)",
  red: "#e63946",
  blue: "#4cc9f0",
  green: "#34d399",
  gold: "#fbbf24",
  purple: "#a855f7",
  black: "#555",
  orange: "#ff6b35",
};
const FRAME_GLOW: Record<FrameColor, string> = {
  none: "none",
  red: "#e6394666",
  blue: "#4cc9f066",
  green: "#34d39966",
  gold: "#fbbf2466",
  purple: "#a855f766",
  black: "#55555566",
  orange: "#ff6b3566",
};

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "acoso", label: "Acoso o bullying" },
  { value: "contenido_inapropiado", label: "Contenido inapropiado" },
  { value: "violencia", label: "Violencia" },
  { value: "odio", label: "Discurso de odio" },
  { value: "desinformacion", label: "Desinformación" },
  { value: "otro", label: "Otro motivo" },
];

function isVideoOrGif(url?: string) {
  return !!url && /\.(mp4|webm|mov|gif)(\?|$)/i.test(url);
}
function getVideoSrc(m: {
  avatarUrl?: string;
  profileVideo?: { url: string };
}) {
  return (
    m.profileVideo?.url ?? (isVideoOrGif(m.avatarUrl) ? m.avatarUrl : undefined)
  );
}
function getImgSrc(m: { avatarUrl?: string; profileVideo?: { url: string } }) {
  const av = m.avatarUrl;
  return av && !isVideoOrGif(av) ? av : undefined;
}
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ════════════════════════════════════════════════════════
// ImageUploadField — campo de URL + botón subir desde dispositivo
// ════════════════════════════════════════════════════════
function ImageUploadField({
  label,
  value,
  onChange,
  placeholder,
  previewRound,
  uploading,
  setUploading,
  tok,
  showNotif,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder: string;
  previewRound?: boolean;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  tok: () => string;
  showNotif: (text: string, type?: "ok" | "err") => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`${API}/uploads/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
        body: fd,
      });
      const d = await res.json();
      if (d.url) {
        onChange(d.url);
        showNotif("Imagen subida ✓");
      } else {
        showNotif(d.message || "Error al subir imagen", "err");
      }
    } catch {
      showNotif("Error de conexión", "err");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div
        style={{
          fontSize: ".62rem",
          fontWeight: 800,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "#ffffff",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          className="cm-setting-input"
          style={{ flex: 1, minWidth: 0 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <label
          title="Subir desde dispositivo"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 9,
            cursor: uploading ? "not-allowed" : "pointer",
            flexShrink: 0,
            background: "var(--cp-accent-muted)",
            border: "1.5px solid var(--cp-accent)",
            color: "var(--cp-accent)",
            transition: "all .15s",
            opacity: uploading ? 0.6 : 1,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {uploading ? (
            <Loader2
              size={13}
              style={{ animation: "spin .8s linear infinite" }}
            />
          ) : (
            <Upload size={13} />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
        {value ? (
          <div
            style={{
              width: previewRound ? 34 : 52,
              height: 34,
              borderRadius: previewRound ? "50%" : 8,
              overflow: "hidden",
              flexShrink: 0,
              border: "2px solid var(--cp-border)",
              background: "var(--cp-surface2)",
            }}
          >
            {isVideoOrGif(value) ? (
              <video
                src={value}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={value}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.3";
                }}
              />
            )}
          </div>
        ) : (
          <div
            style={{
              width: previewRound ? 34 : 52,
              height: 34,
              borderRadius: previewRound ? "50%" : 8,
              background: "var(--cp-surface2)",
              border: "2px dashed var(--cp-border)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              size={13}
              style={{ color: "#ffffff", opacity: 0.4 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ThemePickerModal
// ════════════════════════════════════════════════════════
function ThemePickerModal({
  currentTheme,
  userRole,
  onSelect,
  onClose,
  saving,
}: {
  currentTheme: CommunityTheme;
  userRole: string;
  onSelect: (t: CommunityTheme) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const isAdmin = ["owner", "admin", "superadmin", "moderator"].includes(
    userRole,
  );
  const canUse = (t: ThemeDef) => {
    if (!t.pro && !t.premium) return true;
    if (
      t.pro &&
      ["user-pro", "user-premium", "admin", "superadmin", "moderator"].includes(
        userRole,
      )
    )
      return true;
    if (t.premium && ["user-premium", "admin", "superadmin"].includes(userRole))
      return true;
    return false;
  };
  return createPortal(
    <div className="cm-theme-picker-overlay" onClick={onClose}>
      <div className="cm-theme-picker-box" onClick={(e) => e.stopPropagation()}>
        <div className="cm-theme-picker-header">
          <div className="cm-theme-picker-header-left">
            <div className="cm-theme-picker-icon">
              <Palette size={18} />
            </div>
            <div>
              <div className="cm-theme-picker-title">Apariencia</div>
              <div className="cm-theme-picker-subtitle">
                {isAdmin
                  ? "Cambia el tema para todos"
                  : "Solo admins pueden cambiar el tema"}
              </div>
            </div>
          </div>
          <button className="cm-theme-picker-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="cm-theme-picker-grid">
          {THEMES.map((t) => {
            const usable = canUse(t);
            const active = currentTheme === t.id;
            return (
              <button
                key={t.id}
                disabled={!usable || !isAdmin || saving}
                onClick={() => onSelect(t.id)}
                className={`cm-theme-picker-item${active ? " cm-theme-picker-item--active" : ""}`}
                style={{
                  border: `1.5px solid ${active ? "var(--cp-accent)" : "var(--cp-border)"}`,
                  opacity: usable ? 1 : 0.45,
                  cursor: usable && isAdmin ? "pointer" : "not-allowed",
                }}
              >
                <div
                  className="cm-theme-picker-swatch"
                  style={{
                    background: t.vars.bg,
                    border: `3px solid ${t.vars.accent}`,
                    color: t.vars.accent,
                  }}
                >
                  {t.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cm-theme-picker-label">
                    <span>{t.label}</span>
                    {t.premium && (
                      <span className="cm-theme-picker-badge-premium">
                        PREMIUM
                      </span>
                    )}
                    {t.pro && !t.premium && (
                      <span className="cm-theme-picker-badge-pro">PRO</span>
                    )}
                  </div>
                  {active && (
                    <div className="cm-theme-picker-active-label">
                      <Check size={10} strokeWidth={3} /> Activo
                    </div>
                  )}
                </div>
                {active && saving && (
                  <Loader2
                    size={14}
                    style={{
                      color: "var(--cp-accent)",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {!isAdmin && (
          <div className="cm-theme-picker-notice">
            <Info
              size={14}
              style={{ color: "var(--cp-accent)", flexShrink: 0 }}
            />
            Solo administradores pueden cambiar el tema
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ════════════════════════════════════════════════════════
// UserAvatar
// ════════════════════════════════════════════════════════
function UserAvatar({
  src,
  videoSrc,
  alt,
  size = 36,
  frame = "none",
  hasStar = false,
  isAdmin = false,
  online = false,
}: {
  src?: string;
  videoSrc?: string;
  alt: string;
  size?: number;
  frame?: FrameColor;
  hasStar?: boolean;
  isAdmin?: boolean;
  online?: boolean;
}) {
  const borderColor = FRAME_COLORS[frame];
  const glow = FRAME_GLOW[frame];
  const hasGlow = frame !== "none";
  const badgeW = Math.max(14, Math.round(size * 0.38));
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${borderColor}`,
          boxShadow: hasGlow
            ? `0 0 12px ${glow}, 0 0 4px ${borderColor}`
            : "none",
          overflow: "hidden",
          background: "var(--cp-surface2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : src ? (
          <img
            src={src}
            alt={alt}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span
            style={{
              fontSize: size * 0.4,
              fontWeight: 800,
              color: "#ffffff",
              background: "linear-gradient(135deg,var(--cp-accent),#a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {alt[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>
      {hasStar ? (
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: badgeW,
            height: badgeW,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--cp-bg)",
            zIndex: 2,
            boxShadow: "0 2px 8px rgba(251,191,36,.55)",
          }}
        >
          <Star
            size={Math.round(badgeW * 0.56)}
            fill="var(--cp-bg)"
            color="var(--cp-bg)"
          />
        </div>
      ) : isAdmin ? (
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: badgeW,
            height: badgeW,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#a855f7,#7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--cp-bg)",
            zIndex: 2,
            boxShadow: "0 2px 8px rgba(168,85,247,.5)",
          }}
        >
          <Shield size={Math.round(badgeW * 0.56)} fill="white" color="white" />
        </div>
      ) : null}
      {online && (
        <span
          style={{
            position: "absolute",
            bottom: 1,
            right: hasStar || isAdmin ? badgeW - 3 : 1,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--cp-online-dot)",
            border: "2px solid var(--cp-bg)",
            zIndex: 3,
            boxShadow: "0 0 8px var(--cp-online-dot)",
          }}
        />
      )}
    </div>
  );
}

function CommunityAvatar({
  avatarUrl,
  name,
  size = 40,
}: {
  avatarUrl?: string;
  name: string;
  size?: number;
}) {
  const isVid = isVideoOrGif(avatarUrl);
  const imgKey = avatarUrl ?? "no-avatar";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        background: "linear-gradient(135deg,var(--cp-accent),#a855f7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2.5px solid var(--cp-border)",
        boxShadow: "0 4px 20px var(--cp-accent-muted)",
      }}
    >
      {avatarUrl ? (
        isVid ? (
          <video
            key={imgKey}
            src={avatarUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            key={imgKey}
            src={avatarUrl}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            referrerPolicy="no-referrer"
          />
        )
      ) : (
        <span
          style={{ fontSize: size * 0.42, fontWeight: 800, color: "white" }}
        >
          {name[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  color,
  onClick,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
  onClick: () => void;
  suffix?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="cm-menu-item"
      style={{ color: color ?? "var(--cp-text-sub)" }}
    >
      {icon} {label} {suffix}
    </button>
  );
}

// ════════════════════════════════════════════════════════
// MemberCard
// ════════════════════════════════════════════════════════
function MemberCard({
  member,
  isCurrentAdmin,
  isCreator,
  currentUserId,
  communityId,
  onUpdate,
  creatorId,
}: {
  member: CommunityMember;
  isCurrentAdmin: boolean;
  isCreator: boolean;
  currentUserId: string;
  communityId: string;
  onUpdate: () => void;
  creatorId: string;
}) {
  const [menu, setMenu] = useState<"none" | "main" | "freeze" | "frame">(
    "none",
  );
  const [freezeDays, setFreezeDays] = useState("1");
  const [loading, setLoading] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tok = () => localStorage.getItem("nakama_token") ?? "";
  const isSelf = String(member._id) === String(currentUserId);
  const isMemAdm = member.role === "admin";
  const memberIsCreator = String(member._id) === String(creatorId);

  const canManage =
    isCurrentAdmin && !isSelf && (isCreator ? true : !memberIsCreator);

  useEffect(() => {
    if (menu === "none") return;
    const h = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu("none");
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menu]);

  const openMenu = (type: "main" | "freeze" | "frame") => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = type === "freeze" ? 220 : type === "frame" ? 228 : 200;
    const idealLeft = rect.right - menuW;
    const clampedLeft = Math.max(
      8,
      Math.min(idealLeft, window.innerWidth - menuW - 8),
    );
    setMenuPos({ top: rect.bottom + 6, right: clampedLeft });
    setMenu(type);
  };

  async function api(path: string, method = "POST", body?: object) {
    setLoading(true);
    try {
      await fetch(`${API}/comunidades/${communityId}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      onUpdate();
    } catch {}
    setLoading(false);
    setMenu("none");
  }

  const frozenLabel = () => {
    if (!member.frozen) return null;
    if (member.frozenUntil === "permanent") return "Perm.";
    if (member.frozenUntil) {
      const d = Math.ceil(
        (new Date(member.frozenUntil).getTime() - Date.now()) / 86400000,
      );
      return d > 0 ? `${d}d` : "Exp.";
    }
    return "❄️";
  };

  const portalBase: React.CSSProperties = {
    position: "fixed",
    top: menuPos.top,
    left: menuPos.right,
    zIndex: 99999,
    background: "var(--cp-bg, #0f0f1a)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 14,
    boxShadow: "0 8px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.08)",
    animation: "dropIn .15s cubic-bezier(.175,.885,.32,1.275)",
  };

  return (
    <>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 12,
          background: member.online
            ? "rgba(52,211,153,0.04)"
            : "#ffffff",
          border: `1px solid ${member.online ? "rgba(52,211,153,0.12)" : "var(--cp-border)"}`,
          transition: "all .2s",
        }}
      >
        <UserAvatar
          videoSrc={getVideoSrc(member)}
          src={getImgSrc(member)}
          alt={member.username}
          size={36}
          frame={member.frameColor}
          hasStar={member.hasStar}
          isAdmin={isMemAdm}
          online={member.online}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: ".8rem",
              fontWeight: 700,
              color: "#ffffff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            @{member.username}
            {memberIsCreator && (
              <span title="Creador">
                <Crown size={11} color="#fbbf24" />
              </span>
            )}
            {isMemAdm && !memberIsCreator && (
              <span title="Admin">
                <Shield size={10} color="#a855f7" />
              </span>
            )}
            {member.hasStar && <Star size={9} fill="#fbbf24" color="#fbbf24" />}
            {member.frozen && <Snowflake size={9} color="#4cc9f0" />}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: ".65rem",
              color: "#ffffff",
              marginTop: 1,
            }}
          >
            <span>{member.msgCount} msgs</span>
            {memberIsCreator && (
              <span style={{ color: "#fbbf24" }}>Creador</span>
            )}
            {isMemAdm && !memberIsCreator && (
              <span style={{ color: "#a855f7" }}>Admin</span>
            )}
            {member.frozen && (
              <span style={{ color: "#4cc9f0" }}>❄️ {frozenLabel()}</span>
            )}
            {member.online && (
              <span style={{ color: "var(--cp-online-dot)" }}>● en línea</span>
            )}
          </div>
        </div>
        {canManage && (
          <button
            ref={btnRef}
            onClick={(e) => {
              e.stopPropagation();
              if (menu !== "none") {
                setMenu("none");
                return;
              }
              openMenu("main");
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background:
                menu !== "none"
                  ? "var(--cp-accent-muted)"
                  : "var(--cp-surface2)",
              border: `1px solid ${menu !== "none" ? "var(--cp-accent)" : "var(--cp-border)"}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color:
                menu !== "none" ? "var(--cp-accent)" : "#ffffff",
              transition: "all .15s",
              flexShrink: 0,
            }}
          >
            <MoreVertical size={13} />
          </button>
        )}
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 12,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
            }}
          >
            <Loader2
              size={16}
              style={{
                animation: "spin .8s linear infinite",
                color: "var(--cp-accent)",
              }}
            />
          </div>
        )}
      </div>

      {canManage &&
        menu === "main" &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              ...portalBase,
              border: "1px solid var(--cp-border)",
              padding: 5,
              minWidth: 192,
            }}
          >
            <MenuItem
              icon={isMemAdm ? <Shield size={12} /> : <Crown size={12} />}
              label={isMemAdm ? "Quitar admin" : "Hacer admin"}
              color={isMemAdm ? "#f87171" : "#fbbf24"}
              onClick={() =>
                api(`/members/${member._id}/role`, "PATCH", {
                  role: isMemAdm ? "member" : "admin",
                })
              }
            />
            <MenuItem
              icon={
                <Star
                  size={12}
                  fill={member.hasStar ? "#fbbf24" : "none"}
                  color="#fbbf24"
                />
              }
              label={member.hasStar ? "Quitar estrella" : "Dar estrella"}
              color="#fbbf24"
              onClick={() =>
                api(
                  `/members/${member._id}/star`,
                  member.hasStar ? "DELETE" : "POST",
                )
              }
            />
            <MenuItem
              icon={
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: FRAME_COLORS[member.frameColor],
                    border: "1.5px solid rgba(255,255,255,0.2)",
                  }}
                />
              }
              label="Cambiar marco"
              color="#a855f7"
              onClick={() => openMenu("frame")}
              suffix={
                <ChevronDown
                  size={10}
                  style={{ marginLeft: "auto", opacity: 0.6 }}
                />
              }
            />
            {member.frozen ? (
              <MenuItem
                icon={<Snowflake size={12} />}
                label="Descongelar"
                color="#4cc9f0"
                onClick={() => api(`/members/${member._id}/unfreeze`)}
              />
            ) : (
              <MenuItem
                icon={<Snowflake size={12} />}
                label="Congelar"
                color="#4cc9f0"
                onClick={() => openMenu("freeze")}
                suffix={
                  <ChevronDown
                    size={10}
                    style={{ marginLeft: "auto", opacity: 0.4 }}
                  />
                }
              />
            )}
            <MenuItem
              icon={<Zap size={12} />}
              label="Enviar shock"
              color="#facc15"
              onClick={() => api(`/members/${member._id}/shock`)}
            />
            <div className="cm-menu-divider" />
            <MenuItem
              icon={<UserMinus size={12} />}
              label="Expulsar"
              color="#f87171"
              onClick={() => api(`/members/${member._id}`, "DELETE")}
            />
          </div>,
          document.body,
        )}

      {canManage &&
        menu === "freeze" &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              ...portalBase,
              border: "1px solid rgba(76,201,240,0.25)",
              padding: 14,
              minWidth: 210,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: ".72rem",
                fontWeight: 700,
                color: "#4cc9f0",
                marginBottom: 11,
              }}
            >
              <Snowflake size={13} /> Congelar @{member.username}
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 11 }}>
              {["1", "3", "7", "30"].map((d) => (
                <button
                  key={d}
                  onClick={() => setFreezeDays(d)}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    borderRadius: 8,
                    border: `1.5px solid ${freezeDays === d ? "#4cc9f0" : "var(--cp-border)"}`,
                    background:
                      freezeDays === d
                        ? "rgba(76,201,240,0.1)"
                        : "#ffffff",
                    color:
                      freezeDays === d ? "#4cc9f0" : "#ffffff",
                    fontSize: ".7rem",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {d}d
                </button>
              ))}
              <button
                onClick={() => setFreezeDays("9999")}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  borderRadius: 8,
                  border: `1.5px solid ${freezeDays === "9999" ? "var(--cp-danger)" : "var(--cp-border)"}`,
                  background:
                    freezeDays === "9999"
                      ? "rgba(230,57,70,0.1)"
                      : "#ffffff",
                  color:
                    freezeDays === "9999"
                      ? "var(--cp-danger)"
                      : "#ffffff",
                  fontSize: ".7rem",
                  cursor: "pointer",
                }}
              >
                ∞
              </button>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() =>
                  api(`/members/${member._id}/freeze`, "POST", {
                    days: freezeDays,
                  })
                }
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#4cc9f0,#0ea5e9)",
                  border: "none",
                  color: "#080814",
                  fontSize: ".74rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Congelar
              </button>
              <button
                onClick={() => openMenu("main")}
                style={{
                  padding: "8px 12px",
                  borderRadius: 9,
                  background: "#ffffff",
                  border: "1px solid var(--cp-border)",
                  color: "#ffffff",
                  fontSize: ".72rem",
                  cursor: "pointer",
                }}
              >
                ← Volver
              </button>
            </div>
          </div>,
          document.body,
        )}

      {canManage &&
        menu === "frame" &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              ...portalBase,
              border: "1px solid var(--cp-border)",
              padding: 14,
              minWidth: 218,
            }}
          >
            <div
              style={{
                fontSize: ".72rem",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: 10,
              }}
            >
              Marco de avatar
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 11,
              }}
            >
              {(Object.keys(FRAME_COLORS) as FrameColor[]).map((f) => (
                <button
                  key={f}
                  title={f}
                  onClick={() =>
                    api(`/members/${member._id}/frame`, "PATCH", {
                      frameColor: f,
                    })
                  }
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background:
                      f === "none" ? "#ffffff" : FRAME_COLORS[f],
                    border: `3px solid ${member.frameColor === f ? "white" : "transparent"}`,
                    cursor: "pointer",
                    outline: "none",
                    boxShadow:
                      member.frameColor === f
                        ? `0 0 0 2px rgba(255,255,255,0.2),0 0 12px ${FRAME_GLOW[f]}`
                        : "none",
                    transition: "transform .15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "scale(1.18)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                />
              ))}
            </div>
            <button
              onClick={() => openMenu("main")}
              style={{
                width: "100%",
                padding: "7px 0",
                borderRadius: 9,
                background: "#ffffff",
                border: "1px solid var(--cp-border)",
                color: "#ffffff",
                fontSize: ".72rem",
                cursor: "pointer",
              }}
            >
              ← Volver
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

// ════════════════════════════════════════════════════════
// BubbleContextMenu
// ════════════════════════════════════════════════════════
function BubbleContextMenu({
  pos,
  msg,
  currentUserId,
  isAdmin,
  communityId,
  socketRef,
  onClose,
  onDeleted,
  onEditStart,
}: {
  pos: { x: number; y: number };
  msg: FeedMessage;
  currentUserId: string;
  isAdmin: boolean;
  communityId: string;
  socketRef: React.MutableRefObject<any>;
  onClose: () => void;
  onDeleted: (messageId: string) => void;
  onEditStart: (msg: FeedMessage) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isMine = msg.senderId === currentUserId;
  const canDelete = isMine || isAdmin;
  const canEdit = isMine && msg.type === "message" && !msg.deleted;

  const [pos2, setPos2] = useState(pos);
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let { x, y } = pos;
    if (x + rect.width > window.innerWidth - 12)
      x = window.innerWidth - rect.width - 12;
    if (y + rect.height > window.innerHeight - 12) y = y - rect.height - 8;
    setPos2({ x, y });
  }, [pos]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", h), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", h);
    };
  }, [onClose]);

  function deleteMsg() {
    if (!socketRef.current) return;
    socketRef.current.emit(
      "community:message:delete",
      { roomId: communityId, messageId: msg._id },
      (res: any) => {
        if (res?.ok) onDeleted(msg._id);
        else console.warn("[delete]", res?.error);
      },
    );
    onClose();
  }

  if (!canDelete && !canEdit) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="cm-ctx-menu"
      style={{ top: pos2.y, left: pos2.x }}
    >
      {canEdit && (
        <MenuItem
          icon={<Pencil size={12} />}
          label="Editar mensaje"
          onClick={() => {
            onEditStart(msg);
            onClose();
          }}
        />
      )}
      {canDelete && (
        <MenuItem
          icon={<Trash2 size={12} />}
          label={isAdmin && !isMine ? "Borrar (admin)" : "Borrar mensaje"}
          color="var(--cp-danger)"
          onClick={deleteMsg}
        />
      )}
    </div>,
    document.body,
  );
}

// ════════════════════════════════════════════════════════
// CommunityBubble
// ════════════════════════════════════════════════════════
function CommunityBubble({
  msg,
  currentUserId,
  isAdmin,
  communityId,
  socketRef,
  onDeleted,
  onEditStart,
  onViewEphemeral,
}: {
  msg: FeedMessage;
  currentUserId: string;
  isAdmin: boolean;
  communityId: string;
  socketRef: React.MutableRefObject<any>;
  onDeleted: (id: string) => void;
  onEditStart: (msg: FeedMessage) => void;
  onViewEphemeral: (msgId: string) => void;
}) {
  const isMine = msg.senderId === currentUserId;
  const time = new Date(msg.createdAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number } | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function startPress(e: React.TouchEvent) {
    longPressTimer.current = setTimeout(() => {
      const t = e.touches[0];
      setCtxPos({ x: t.clientX, y: t.clientY });
    }, 500);
  }
  function cancelPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }
  function onRightClick(e: React.MouseEvent) {
    if (msg.type === "ephemeral") return;
    e.preventDefault();
    setCtxPos({ x: e.clientX, y: e.clientY });
  }

  if (msg.type === "join_event") {
    const names = (msg.joinedUsers ?? [])
      .map((u) => `@${u.username}`)
      .join(", ");
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "6px 16px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#ffffff",
            border: "1px solid var(--cp-border)",
            borderRadius: 20,
            padding: "5px 14px",
            fontSize: ".68rem",
            color: "#ffffff",
          }}
        >
          <Sparkles size={10} style={{ color: "var(--cp-accent)" }} />
          {names} se unió
          {msg.memberNumber ? ` · ${msg.memberNumber} miembros` : ""}
        </span>
      </div>
    );
  }

  const videoSrc =
    msg.senderVideo && isVideoOrGif(msg.senderVideo)
      ? msg.senderVideo
      : isVideoOrGif(msg.senderAvatar)
        ? msg.senderAvatar
        : undefined;
  const imgSrc = !videoSrc && msg.senderAvatar ? msg.senderAvatar : undefined;

  if (msg.type === "ephemeral") {
    const destroyed = msg.ephemeralDestroyed;
    let btnClass = "cm-ephemeral-btn ";
    if (destroyed) btnClass += "cm-ephemeral-btn--destroyed";
    else if (isMine) btnClass += "cm-ephemeral-btn--mine";
    else btnClass += "cm-ephemeral-btn--theirs";

    return (
      <div
        className={`cm-ephemeral-wrap ${isMine ? "cm-ephemeral-wrap--mine" : "cm-ephemeral-wrap--theirs"}`}
      >
        {!isMine && (
          <div className="cm-ephemeral-sender">
            <UserAvatar
              videoSrc={videoSrc}
              src={imgSrc}
              alt={msg.senderName}
              size={24}
              frame={msg.senderFrame}
              hasStar={msg.hasStar}
              isAdmin={msg.isAdmin}
            />
            <span className="cm-ephemeral-sender-name">
              {msg.isAdmin && <Crown size={9} color="#fbbf24" />}@
              {msg.senderName}
            </span>
          </div>
        )}
        <button
          className={btnClass}
          onClick={() => {
            if (!destroyed && !isMine) onViewEphemeral(msg._id);
          }}
          disabled={destroyed || isMine}
        >
          <div
            className={`cm-ephemeral-icon ${destroyed ? "cm-ephemeral-icon--destroyed" : "cm-ephemeral-icon--active"}`}
          >
            {destroyed ? (
              <FlameKindling size={15} color="#ffffff" />
            ) : (
              <Timer size={15} color="white" />
            )}
          </div>
          <div>
            <div
              className={`cm-ephemeral-title ${destroyed ? "cm-ephemeral-title--destroyed" : "cm-ephemeral-title--active"}`}
            >
              {destroyed
                ? "Temporal destruido"
                : isMine
                  ? "Temporal enviado"
                  : "Mensaje temporal"}
            </div>
            {msg.caption && !destroyed && (
              <div className="cm-ephemeral-caption">{msg.caption}</div>
            )}
            {!destroyed && !isMine && (
              <div className="cm-ephemeral-tap-hint">
                <Eye size={9} /> Toca para ver
              </div>
            )}
          </div>
        </button>
      </div>
    );
  }

  const displayText = msg.deleted ? undefined : (msg.editedText ?? msg.text);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isMine ? "flex-end" : "flex-start",
          padding: "3px 16px",
        }}
        onContextMenu={onRightClick}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
      >
        {!isMine && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 5,
            }}
          >
            <UserAvatar
              videoSrc={videoSrc}
              src={imgSrc}
              alt={msg.senderName}
              size={24}
              frame={msg.senderFrame}
              hasStar={msg.hasStar}
              isAdmin={msg.isAdmin}
            />
            <span
              style={{
                fontSize: ".66rem",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {msg.isAdmin && <Crown size={9} color="#fbbf24" />}@
              {msg.senderName}
            </span>
            <span
              style={{
                fontSize: ".6rem",
                color: "#ffffff",
                opacity: 0.6,
              }}
            >
              {timeAgo(msg.createdAt)}
            </span>
          </div>
        )}
        <div
          style={{
            maxWidth: "70%",
            background: msg.deleted
              ? "#ffffff"
              : isMine
                ? "var(--cp-bubble-sent)"
                : "var(--cp-bubble-recv)",
            border: msg.deleted
              ? "1px dashed var(--cp-border)"
              : isMine
                ? "none"
                : "1px solid var(--cp-border)",
            borderRadius: isMine ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
            padding: "10px 14px",
            boxShadow: msg.deleted
              ? "none"
              : isMine
                ? "0 6px 24px var(--cp-accent-muted)"
                : "0 2px 12px rgba(0,0,0,0.15)",
            opacity: msg.deleted ? 0.55 : 1,
          }}
        >
          {msg.deleted ? (
            <p className="cm-bubble-deleted-text">
              <Trash2 size={11} /> Mensaje eliminado
            </p>
          ) : (
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: ".85rem",
                  color: isMine
                    ? "var(--cp-bubble-sent-text)"
                    : "var(--cp-bubble-recv-text)",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {displayText}
              </p>
              {msg.editedText && (
                <span
                  className="cm-bubble-edited-label"
                  style={{
                    color: isMine
                      ? "rgba(255,255,255,0.45)"
                      : "#ffffff",
                  }}
                >
                  editado
                </span>
              )}
              {isMine && (
                <div style={{ marginTop: 4, textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: ".6rem",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {time}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {ctxPos && (
        <BubbleContextMenu
          pos={ctxPos}
          msg={msg}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          communityId={communityId}
          socketRef={socketRef}
          onClose={() => setCtxPos(null)}
          onDeleted={onDeleted}
          onEditStart={onEditStart}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════
// EphemeralModal — X visible en mobile
// ════════════════════════════════════════════════════════
function EphemeralModal({
  imageUrl,
  caption,
  onClose,
}: {
  imageUrl?: string | null;
  caption?: string | null;
  onClose: () => void;
}) {
  return createPortal(
    <div className="cm-ephemeral-modal-overlay" onClick={onClose}>
      <div
        className="cm-ephemeral-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative" }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 200,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1.5px solid rgba(255,255,255,0.22)",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
            flexShrink: 0,
          }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {imageUrl && (
          <div className="cm-ephemeral-modal-media">
            {isVideoOrGif(imageUrl) ? (
              <video src={imageUrl} autoPlay controls playsInline />
            ) : (
              <img src={imageUrl} alt="" />
            )}
            <div className="cm-ephemeral-modal-grad" />
          </div>
        )}
        <div className="cm-ephemeral-modal-body">
          <div className="cm-ephemeral-modal-label">
            <Timer size={14} color="var(--cp-accent)" />
            Mensaje temporal · se destruirá al cerrar
          </div>
          {caption && <p className="cm-ephemeral-modal-caption">{caption}</p>}
          <button className="cm-ephemeral-modal-close-btn" onClick={onClose}>
            Cerrar y destruir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ════════════════════════════════════════════════════════
// InvitePanel
// ════════════════════════════════════════════════════════
function InvitePanel({
  communityId,
  existingIds,
  onUpdate,
}: {
  communityId: string;
  existingIds: Set<string>;
  onUpdate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserSuggestion[]>([]);
  const [selected, setSelected] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const tok = () => localStorage.getItem("nakama_token") ?? "";

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `${API}/chats/search-users?q=${encodeURIComponent(search)}`,
          { headers: { Authorization: `Bearer ${tok()}` } },
        );
        const d = await r.json();
        setResults(
          Array.isArray(d)
            ? d.filter((u: UserSuggestion) => !existingIds.has(u._id))
            : [],
        );
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, existingIds]);

  const toggle = (u: UserSuggestion) =>
    setSelected((prev) =>
      prev.find((p) => p._id === u._id)
        ? prev.filter((p) => p._id !== u._id)
        : [...prev, u],
    );

  async function invite() {
    if (!selected.length) return;
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`${API}/comunidades/${communityId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({ userIds: selected.map((s) => s._id) }),
      });
      const d = await r.json();
      if (r.ok) {
        setMsg(`✓ ${d.message}`);
        setSelected([]);
        setSearch("");
        onUpdate();
      } else setMsg(d.message || "Error al invitar.");
    } catch {
      setMsg("Error de conexión.");
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: ".68rem",
          fontWeight: 800,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: 6,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        <UserPlus size={12} /> Invitar miembros
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#ffffff",
          border: "1px solid var(--cp-border)",
          borderRadius: 11,
          padding: "7px 11px",
          flexShrink: 0,
        }}
      >
        <Search
          size={13}
          style={{ color: "#ffffff", flexShrink: 0 }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuario..."
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: "#ffffff",
            fontSize: ".8rem",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ffffff",
              display: "flex",
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      {selected.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 5, flexShrink: 0 }}
        >
          {selected.map((u) => (
            <span
              key={u._id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px 3px 5px",
                borderRadius: 20,
                background: "var(--cp-accent-muted)",
                border: "1px solid var(--cp-accent)",
                fontSize: ".71rem",
                color: "#ffffff",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--cp-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: ".55rem",
                  fontWeight: 800,
                  color: "var(--cp-accent-fg)",
                  flexShrink: 0,
                }}
              >
                {u.username[0].toUpperCase()}
              </div>
              @{u.username}
              <button
                onClick={() => toggle(u)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ffffff",
                  display: "flex",
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          minHeight: 0,
        }}
      >
        {results.map((u) => {
          const isSel = !!selected.find((s) => s._id === u._id);
          return (
            <button
              key={u._id}
              onClick={() => toggle(u)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${isSel ? "var(--cp-accent)" : "transparent"}`,
                background: isSel
                  ? "var(--cp-accent-muted)"
                  : "#ffffff",
                color: "#ffffff",
                cursor: "pointer",
                textAlign: "left",
                transition: "all .15s",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--cp-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: ".65rem",
                  fontWeight: 800,
                  color: "var(--cp-accent-fg)",
                  flexShrink: 0,
                }}
              >
                {u.username[0].toUpperCase()}
              </div>
              <span style={{ fontSize: ".78rem", fontWeight: 600 }}>
                @{u.username}
              </span>
              {isSel ? (
                <Check
                  size={13}
                  color="var(--cp-accent)"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                />
              ) : (
                <UserPlus
                  size={12}
                  style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.2 }}
                />
              )}
            </button>
          );
        })}
        {search.length >= 2 && results.length === 0 && (
          <p
            style={{
              textAlign: "center",
              fontSize: ".74rem",
              color: "#ffffff",
              padding: "20px 0",
            }}
          >
            Sin resultados
          </p>
        )}
      </div>
      {msg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 11px",
            borderRadius: 10,
            background: msg.startsWith("✓")
              ? "rgba(52,211,153,0.07)"
              : "var(--cp-accent-muted)",
            border: `1px solid ${msg.startsWith("✓") ? "rgba(52,211,153,0.18)" : "var(--cp-accent)"}`,
            fontSize: ".72rem",
            color: msg.startsWith("✓") ? "#34d399" : "var(--cp-accent)",
            flexShrink: 0,
          }}
        >
          {msg.startsWith("✓") ? (
            <Check size={13} />
          ) : (
            <AlertCircle size={13} />
          )}{" "}
          {msg}
        </div>
      )}
      <button
        onClick={invite}
        disabled={!selected.length || loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          padding: "10px 16px",
          borderRadius: 11,
          background: "var(--cp-accent)",
          border: "none",
          color: "var(--cp-accent-fg)",
          fontSize: ".8rem",
          fontWeight: 800,
          cursor: !selected.length || loading ? "not-allowed" : "pointer",
          opacity: !selected.length || loading ? 0.5 : 1,
          transition: "opacity .2s",
          flexShrink: 0,
          boxShadow: "0 4px 20px var(--cp-accent-muted)",
        }}
      >
        {loading ? (
          <Loader2
            size={14}
            style={{ animation: "spin .8s linear infinite" }}
          />
        ) : (
          <UserPlus size={14} />
        )}
        Invitar{selected.length > 0 ? ` (${selected.length})` : ""}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════
export default function CommunityPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [feed, setFeed] = useState<FeedMessage[]>([]);
  const [input, setInput] = useState("");
  const [panel, setPanel] = useState<Panel>("none");
  const [loadingCom, setLoadingCom] = useState(true);
  const [memberSearch, setMemberSearch] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [notification, setNotification] = useState<{
    text: string;
    type: "ok" | "err";
  } | null>(null);

  const [activeTheme, setActiveTheme] = useState<CommunityTheme>("dark");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editingRules, setEditingRules] = useState(false);
  const [editRules, setEditRules] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [editingMsg, setEditingMsg] = useState<FeedMessage | null>(null);
  const [editMsgText, setEditMsgText] = useState("");
  const [showEphemeral, setShowEphemeral] = useState(false);
  const [ephemeralViewing, setEphemeralViewing] = useState<{
    imageUrl?: string | null;
    caption?: string | null;
    msgId: string;
  } | null>(null);

  // CAMBIO 2: Estado para la invitación de batalla
  const [battleInvite, setBattleInvite] = useState<{
    roomId: string;
    battleId: string;
    nombre: string;
    categorias: string[];
    creadorId: string;
    creadorName: string;
    creadorAvatar: string | null;
    expiresAt: string;
    communityId: string | null;
  } | null>(null);

  const socketRef = useRef<any>(null);
  const communityRef = useRef<Community | null>(null);
  const userRef = useRef<typeof user>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const tok = useCallback(() => localStorage.getItem("nakama_token") ?? "", []);

  const isCreator =
    !!user && !!community && String(community.creatorId) === String(user.id);
  const isAdmin =
    !!user &&
    !!community &&
    (String(community.creatorId) === String(user.id) ||
      community.members.some(
        (m) => String(m._id) === String(user.id) && m.role === "admin",
      ) ||
      ["admin", "superadmin"].includes(String((user as any)?.role ?? "")));
  const myMember = community?.members.find(
    (m) => String(m._id) === String(user?.id),
  );
  const isFrozen =
    !!myMember?.frozen &&
    (myMember.frozenUntil === "permanent" ||
      (!!myMember.frozenUntil && new Date(myMember.frozenUntil) > new Date()));

  const isMember = !!community?.isMember || isCreator;

  const themeObj = getTheme(activeTheme);
  communityRef.current = community;
  userRef.current = user;

  const cssVars = {
    "--cp-bg": themeObj.vars.bg,
    "--cp-surface": themeObj.vars.surface,
    "--cp-surface2": themeObj.vars.surface2,
    "--cp-border": themeObj.vars.border,
    "--cp-accent": themeObj.vars.accent,
    "--cp-accent-fg": themeObj.vars.accentFg,
    "--cp-accent-muted": themeObj.vars.accentMuted,
    "--cp-text": themeObj.vars.text,
    "--cp-text-sub": themeObj.vars.textSub,
    "--cp-text-muted": themeObj.vars.textMuted,
    "--cp-header-bg": themeObj.vars.headerBg,
    "--cp-tab-active-fg": themeObj.vars.tabActiveFg,
    "--cp-tab-active-border": themeObj.vars.tabActiveBorder,
    "--cp-input-bg": themeObj.vars.inputBg,
    "--cp-input-border": themeObj.vars.inputBorder,
    "--cp-input-text": themeObj.vars.inputText,
    "--cp-bubble-sent": themeObj.vars.bubbleSent,
    "--cp-bubble-sent-text": themeObj.vars.bubbleSentText,
    "--cp-bubble-recv": themeObj.vars.bubbleRecv,
    "--cp-bubble-recv-text": themeObj.vars.bubbleRecvText,
    "--cp-online-dot": themeObj.vars.onlineDot,
    "--cp-danger": themeObj.vars.dangerFg,
  } as React.CSSProperties;

  const loadCommunity = useCallback(async () => {
    if (!communityId) return;
    try {
      const res = await fetch(`${API}/comunidades/${communityId}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCommunity(data);
        setEditName(data.name ?? "");
        setEditDesc(data.description ?? "");
        setEditRules(data.rules ?? "");
        setEditCoverUrl(data.coverUrl ?? "");
        setEditAvatarUrl(data.avatarUrl ?? "");
        setActiveTheme(data.theme ?? "dark");
      }
    } catch {}
    setLoadingCom(false);
  }, [communityId, tok]);

  const loadFeed = useCallback(async () => {
    if (!communityId) return;
    try {
      const res = await fetch(
        `${API}/comunidades/${communityId}/feed?limit=80`,
        { headers: { Authorization: `Bearer ${tok()}` } },
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        seenIds.current = new Set(data.map((m: FeedMessage) => m._id));
        const unique = Array.from(
          new Map(data.map((m: FeedMessage) => [m._id, m])).values(),
        );
        setFeed(unique);
        setTimeout(
          () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }),
          60,
        );
      }
    } catch {}
  }, [communityId, tok]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!user || !communityId) return;
    import("socket.io-client")
      .then(({ io }) => {
        const s = io(WS_URL, {
          auth: { token: tok() },
          transports: ["websocket"],
          reconnectionDelay: 1000,
        });
        s.on("connect", () => {
          setSocketReady(true);
          s.emit("community:join", { roomId: communityId }, (res: any) => {
            if (!res?.ok) console.warn("[community:join]", res?.error);
          });
        });
        s.on("disconnect", () => setSocketReady(false));

        s.on("community:message:new", (msg: any) => {
          const id = String(msg.id ?? msg._id ?? "");
          if (seenIds.current.has(id)) return;
          seenIds.current.add(id);
          const _community = communityRef.current;
          const _user = userRef.current;
          const sender = typeof msg.sender === "object" ? msg.sender : null;
          const senderId = String(sender?._id ?? msg.senderId ?? "");
          const isSelf = senderId === String(_user?.id);
          const memberInfo = _community?.members.find(
            (m) => String(m._id) === senderId,
          );
          const isJoin = msg.isSystem && msg.text?.startsWith("JOIN_EVENT:");
          const resolvedName =
            sender?.username ??
            memberInfo?.username ??
            msg.senderName ??
            msg.username ??
            (isSelf ? _user?.username : undefined) ??
            "Usuario";
          const resolvedVideo =
            sender?.profileVideo?.url ??
            (isVideoOrGif(sender?.avatarUrl) ? sender?.avatarUrl : undefined) ??
            getVideoSrc(memberInfo ?? {}) ??
            (isSelf
              ? ((_user as any)?.profileVideo?.url ??
                (isVideoOrGif((_user as any)?.avatarUrl)
                  ? (_user as any)?.avatarUrl
                  : undefined))
              : undefined);
          const resolvedAvatar =
            (!resolvedVideo &&
            sender?.avatarUrl &&
            !isVideoOrGif(sender.avatarUrl)
              ? sender.avatarUrl
              : undefined) ??
            (!resolvedVideo &&
            memberInfo?.avatarUrl &&
            !isVideoOrGif(memberInfo.avatarUrl)
              ? memberInfo.avatarUrl
              : undefined) ??
            (!resolvedVideo &&
            isSelf &&
            !isVideoOrGif((_user as any)?.avatarUrl)
              ? (_user as any)?.avatarUrl
              : undefined);
          const senderIsAdmin =
            memberInfo?.role === "admin" ||
            (isSelf &&
              (String(_community?.creatorId) === String(_user?.id) ||
                _community?.members.some(
                  (m) =>
                    String(m._id) === String(_user?.id) && m.role === "admin",
                ) ||
                ["admin", "superadmin"].includes(
                  String((_user as any)?.role ?? ""),
                )));
          const newMsg: FeedMessage = {
            _id: id,
            type: isJoin ? "join_event" : "message",
            senderId,
            senderName: resolvedName,
            senderAvatar: resolvedAvatar,
            senderVideo: resolvedVideo,
            senderFrame: memberInfo?.frameColor ?? "none",
            hasStar: memberInfo?.hasStar ?? false,
            isAdmin: !!senderIsAdmin,
            text: isJoin ? undefined : msg.text,
            joinedUsers: isJoin
              ? (() => {
                  try {
                    return JSON.parse(msg.text.replace("JOIN_EVENT:", ""))
                      .users;
                  } catch {
                    return [];
                  }
                })()
              : undefined,
            memberNumber: isJoin
              ? (() => {
                  try {
                    return JSON.parse(msg.text.replace("JOIN_EVENT:", ""))
                      .memberNumber;
                  } catch {
                    return undefined;
                  }
                })()
              : undefined,
            createdAt: msg.createdAt ?? new Date().toISOString(),
          };
          setFeed((prev) => {
            if (prev.some((m) => m._id === id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(
            () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }),
            40,
          );
        });

        s.on(
          "community:message:deleted",
          ({ messageId }: { messageId: string }) => {
            setFeed((prev) =>
              prev.map((m) =>
                m._id === messageId ? { ...m, deleted: true, text: "" } : m,
              ),
            );
          },
        );
        s.on(
          "community:message:edited",
          ({ messageId, text }: { messageId: string; text: string }) => {
            setFeed((prev) =>
              prev.map((m) =>
                m._id === messageId ? { ...m, editedText: text } : m,
              ),
            );
          },
        );

        s.on("community:ephemeral_new", (msg: any) => {
          const id = String(msg._id ?? "");
          if (!id || seenIds.current.has(id)) return;
          seenIds.current.add(id);
          const memberInfo = communityRef.current?.members.find(
            (m) => m._id === String(msg.senderId),
          );
          const newEph: FeedMessage = {
            _id: id,
            type: "ephemeral",
            senderId: String(msg.senderId ?? ""),
            senderName: msg.senderName ?? memberInfo?.username ?? "Usuario",
            senderAvatar:
              msg.senderAvatar ?? memberInfo?.avatarUrl ?? undefined,
            senderVideo: msg.senderVideo ?? undefined,
            senderFrame: msg.senderFrame ?? memberInfo?.frameColor ?? "none",
            hasStar: msg.hasStar ?? memberInfo?.hasStar ?? false,
            isAdmin: msg.isAdmin ?? memberInfo?.role === "admin",
            thumbnailUrl: msg.thumbnailUrl ?? null,
            caption: msg.caption ?? "",
            ephemeralDestroyed: false,
            ephemeralViewed: false,
            createdAt: msg.createdAt ?? new Date().toISOString(),
          };
          setFeed((prev) => [...prev, newEph]);
          setTimeout(
            () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }),
            40,
          );
        });

        s.on(
          "community:ephemeral_destroyed",
          ({ messageId }: { messageId: string }) => {
            setFeed((prev) =>
              prev.map((m) =>
                m._id === messageId ? { ...m, ephemeralDestroyed: true } : m,
              ),
            );
          },
        );
        s.on(
          "community:ephemeral_viewed",
          ({ messageId }: { messageId: string }) => {
            setFeed((prev) =>
              prev.map((m) =>
                m._id === messageId ? { ...m, ephemeralViewed: true } : m,
              ),
            );
          },
        );
        s.on(
          "community:message_deleted_notify",
          ({ communityName, deletedBy, deletedByRole }: any) => {
            showNotif(
              `${deletedByRole === "creador" ? "El creador" : "Un admin"} (@${deletedBy}) borró tu mensaje en "${communityName}"`,
              "err",
            );
          },
        );
        s.on("community:member_update", ({ memberId, updates }: any) => {
          setCommunity((prev) =>
            prev
              ? {
                  ...prev,
                  members: prev.members.map((m) => {
                    if (String(m._id) !== String(memberId)) return m;
                    const merged = { ...m, ...updates };
                    // ── FREEZE: si el update dice frozen: false, limpiar frozenUntil también
                    if (updates.frozen === false) {
                      merged.frozen = false;
                      merged.frozenUntil = null;
                    }
                    return merged;
                  }),
                }
              : prev,
          );
        });
        s.on("community:member_removed", ({ memberId }: any) => {
          setCommunity((prev) =>
            prev
              ? {
                  ...prev,
                  members: prev.members.filter(
                    (m) => String(m._id) !== String(memberId),
                  ),
                  memberCount: Math.max(0, (prev.memberCount ?? 1) - 1),
                }
              : prev,
          );
        });
        s.on("community:member_count", ({ memberCount }: any) =>
          setCommunity((prev) => (prev ? { ...prev, memberCount } : prev)),
        );
        s.on("community:settings_update", (data: any) => {
          console.log(
            "[socket:settings_update] data:",
            JSON.stringify({
              avatarUrl: data.avatarUrl,
              coverUrl: data.coverUrl,
              theme: data.theme,
              messagingOpen: data.messagingOpen,
            }),
          );
          setCommunity((prev) => {
            if (!prev) return prev;
            const patch: Partial<Community> = { ...data };
            if (patch.avatarUrl == null && prev.avatarUrl)
              delete patch.avatarUrl;
            if (patch.coverUrl == null && prev.coverUrl) delete patch.coverUrl;
            return { ...prev, ...patch };
          });
          if (data.theme) setActiveTheme(data.theme);
        });
        s.on(
          "community:typing:update",
          ({ userId: uid, isTyping, username: uname }: any) => {
            if (uid === user.id) return;
            setTypingUsers((prev) =>
              isTyping
                ? prev.includes(uname)
                  ? prev
                  : [...prev, uname]
                : prev.filter((u) => u !== uname),
            );
          },
        );

        // CAMBIO 3: Listener para invitaciones de batalla
        s.on("battle:invitation", (data: any) => {
          setBattleInvite({
            roomId: data.roomId,
            battleId: data.battleId,
            nombre: data.nombre,
            categorias: data.categorias ?? [],
            creadorId: data.creadorId,
            creadorName: data.creadorName,
            creadorAvatar: data.creadorAvatar ?? null,
            expiresAt: data.expiresAt,
            communityId: data.communityId ?? null,
          });
        });

        s.on("user:online", ({ userId: uid }: any) =>
          setCommunity((prev) =>
            prev
              ? {
                  ...prev,
                  members: prev.members.map((m) =>
                    String(m._id) === String(uid) ? { ...m, online: true } : m,
                  ),
                }
              : prev,
          ),
        );
        s.on("user:offline", ({ userId: uid }: any) =>
          setCommunity((prev) =>
            prev
              ? {
                  ...prev,
                  members: prev.members.map((m) =>
                    String(m._id) === String(uid) ? { ...m, online: false } : m,
                  ),
                }
              : prev,
          ),
        );
        socketRef.current = s;
      })
      .catch(console.error);
    return () => {
      socketRef.current?.disconnect();
    };
  }, [user, communityId]); // eslint-disable-line

  function showNotif(text: string, type: "ok" | "err" = "ok") {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  }

  function handleDeleted(messageId: string) {
    setFeed((prev) =>
      prev.map((m) =>
        m._id === messageId ? { ...m, deleted: true, text: "" } : m,
      ),
    );
  }

  function handleEditStart(msg: FeedMessage) {
    setEditingMsg(msg);
    setEditMsgText(msg.editedText ?? msg.text ?? "");
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  function submitEdit() {
    if (!editingMsg || !editMsgText.trim() || !socketRef.current) return;
    socketRef.current.emit(
      "community:message:edit",
      {
        roomId: communityId,
        messageId: editingMsg._id,
        text: editMsgText.trim(),
      },
      (res: any) => {
        if (res?.ok) {
          setFeed((prev) =>
            prev.map((m) =>
              m._id === editingMsg._id
                ? { ...m, editedText: editMsgText.trim() }
                : m,
            ),
          );
        } else {
          showNotif(res?.error || "Error al editar", "err");
        }
      },
    );
    setEditingMsg(null);
    setEditMsgText("");
  }

  async function handleViewEphemeral(msgId: string) {
    setFeed((prev) =>
      prev.map((m) => (m._id === msgId ? { ...m, ephemeralViewed: true } : m)),
    );
    try {
      const res = await fetch(`${API}/comunidadtemporal/${msgId}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEphemeralViewing({
          imageUrl: data.imageUrl ?? null,
          caption: data.caption ?? null,
          msgId,
        });
        if (data.destroyed) {
          setFeed((prev) =>
            prev.map((m) =>
              m._id === msgId ? { ...m, ephemeralDestroyed: true } : m,
            ),
          );
        }
      } else {
        showNotif(data.message || "No se pudo ver el temporal", "err");
      }
    } catch {
      showNotif("Error de conexión", "err");
    }
  }

  function sendMessage() {
    if (!input.trim() || !community) return;
    if (!isMember) {
      showNotif("Únete para poder escribir", "err");
      return;
    }
    if (!input.trim() || !community) return;
    if (isFrozen) {
      showNotif("❄️ Estás congelado/a en esta comunidad", "err");
      return;
    }

    if (!community.messagingOpen && !isAdmin) return;
    const text = input.trim();
    setInput("");
    const myM = community.members.find(
      (m) => String(m._id) === String(user?.id),
    );
    const tempId = `temp_${Date.now()}`;
    const tempMsg: FeedMessage = {
      _id: tempId,
      type: "message",
      senderId: user!.id,
      senderName: user!.username,
      senderAvatar: !isVideoOrGif((user as any)?.avatarUrl)
        ? (user as any)?.avatarUrl
        : undefined,
      senderVideo:
        (user as any)?.profileVideo?.url ??
        (isVideoOrGif((user as any)?.avatarUrl)
          ? (user as any)?.avatarUrl
          : undefined),
      senderFrame: myM?.frameColor ?? "none",
      hasStar: myM?.hasStar ?? false,
      isAdmin,
      text,
      createdAt: new Date().toISOString(),
    };
    seenIds.current.add(tempId);
    setFeed((prev) => [...prev, tempMsg]);
    setTimeout(
      () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }),
      40,
    );
    if (socketRef.current) {
      socketRef.current.emit(
        "community:message:send",
        { roomId: communityId, text },
        (res: any) => {
          if (res?.ok && res?.data?.message) {
            const realId = String(
              res.data.message._id ?? res.data.message.id ?? "",
            );
            if (realId) {
              seenIds.current.add(realId);
              setFeed((prev) => {
                const withoutReal = prev.filter((m) => m._id !== realId);
                return withoutReal.map((m) =>
                  m._id === tempId ? { ...m, _id: realId } : m,
                );
              });
            }
          } else if (res && !res.ok) {
            setFeed((prev) => prev.filter((m) => m._id !== tempId));
            showNotif(res.error || "Error al enviar", "err");
          }
        },
      );
    } else {
      fetch(`${API}/comunidades/${communityId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({ text }),
      }).catch(() => setFeed((prev) => prev.filter((m) => m._id !== tempId)));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (editingMsg) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitEdit();
      }
      if (e.key === "Escape") {
        setEditingMsg(null);
        setEditMsgText("");
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit("community:typing:start", { roomId: communityId });
      clearTimeout(typingTimer.current ?? undefined);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit("community:typing:stop", {
          roomId: communityId,
        });
      }, 2500);
    }
  }

  async function joinCommunity() {
    try {
      const res = await fetch(`${API}/comunidades/${communityId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const d = await res.json();
      if (res.ok) {
        showNotif("¡Te uniste a la comunidad! ✓");
        loadCommunity();
      } else {
        showNotif(d.message || "Error al unirse", "err");
      }
    } catch {
      showNotif("Error de conexión", "err");
    }
  }

  async function leaveCommunity() {
    if (!community || isCreator) return;
    setShowLeaveConfirm(false);
    try {
      const res = await fetch(`${API}/comunidades/${communityId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const d = await res.json();
      if (res.ok) {
        showNotif("Abandonaste la comunidad");
        router.push("/chat");
      } else {
        showNotif(d.message || "Error al salir", "err");
      }
    } catch {
      showNotif("Error de conexión", "err");
    }
  }
  async function toggleLike() {
    if (!community) return;
    if (!isMember) {
      showNotif("Únete para dar like", "err");
      return;
    }
    if (!community) return;
    const wasLiked = community.isLiked;
    setCommunity((prev) =>
      prev
        ? {
            ...prev,
            isLiked: !wasLiked,
            likeCount: wasLiked ? prev.likeCount - 1 : prev.likeCount + 1,
          }
        : prev,
    );
    try {
      await fetch(`${API}/comunidades/${communityId}/like`, {
        method: wasLiked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
    } catch {
      loadCommunity();
    }
  }

  async function toggleMessaging() {
    if (!community || !isAdmin) return;
    const next = !community.messagingOpen;
    setCommunity((prev) => (prev ? { ...prev, messagingOpen: next } : prev));
    try {
      await fetch(`${API}/comunidades/${communityId}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({ messagingOpen: next }),
      });
    } catch {
      loadCommunity();
    }
  }

  async function handleThemeChange(newTheme: CommunityTheme) {
    setSavingTheme(true);
    try {
      const res = await fetch(`${API}/comunidades/${communityId}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({ theme: newTheme }),
      });
      if (res.ok) {
        setActiveTheme(newTheme);
        setCommunity((prev) => (prev ? { ...prev, theme: newTheme } : prev));
        showNotif("Tema aplicado ✓");
      } else {
        const d = await res.json();
        showNotif(d.message || "Error", "err");
      }
    } catch {
      showNotif("Error de conexión", "err");
    }
    setSavingTheme(false);
    setShowThemePicker(false);
  }

  async function saveNameDesc() {
    const localAvatar = editAvatarUrl || null;
    const localCover = editCoverUrl || null;
    const localName = editName;
    const localDesc = editDesc;
    console.log("[saveNameDesc] editAvatarUrl:", editAvatarUrl);
    console.log("[saveNameDesc] editCoverUrl:", editCoverUrl);
    console.log("[saveNameDesc] localAvatar:", localAvatar);
    console.log("[saveNameDesc] localCover:", localCover);

    const prevSnapshot = community
      ? {
          name: community.name,
          description: community.description,
          avatarUrl: community.avatarUrl,
          coverUrl: community.coverUrl,
        }
      : null;

    try {
      const res = await fetch(`${API}/comunidades/${communityId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({
          name: localName,
          description: localDesc,
          avatarUrl: localAvatar,
          coverUrl: localCover,
        }),
      });
      const data = await res.json().catch(() => ({}));
      console.log(
        "[saveNameDesc] server response:",
        JSON.stringify({
          ok: res.ok,
          avatarUrl: data.avatarUrl,
          coverUrl: data.coverUrl,
        }),
      );
      if (!res.ok) {
        if (prevSnapshot) {
          setCommunity((prev) => (prev ? { ...prev, ...prevSnapshot } : prev));
        }
        setEditingName(true);
        showNotif(data.message || "Error al guardar", "err");
        return;
      }
      const savedAvatar = data.avatarUrl ?? localAvatar;
      const savedCover = data.coverUrl ?? localCover;
      const savedName = data.name ?? localName;
      const savedDesc = data.description ?? localDesc;
      setCommunity((prev) =>
        prev
          ? {
              ...prev,
              name: savedName,
              description: savedDesc,
              avatarUrl: savedAvatar,
              coverUrl: savedCover,
            }
          : prev,
      );
      showNotif("Guardado ✓");
    } catch {
      if (prevSnapshot) {
        setCommunity((prev) => (prev ? { ...prev, ...prevSnapshot } : prev));
      }
      showNotif("Error de red", "err");
    }
  }

  async function saveRules() {
    try {
      await fetch(`${API}/comunidades/${communityId}/rules`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({ rules: editRules }),
      });
      setCommunity((prev) => (prev ? { ...prev, rules: editRules } : prev));
      setEditingRules(false);
      showNotif("Reglas guardadas ✓");
    } catch {
      showNotif("Error", "err");
    }
  }

  async function submitReport() {
    if (!reportReason) return;
    try {
      await fetch(`${API}/comunidades/${communityId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      });
      setReportSubmitted(true);
    } catch {}
  }

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  if (loading || !user)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 12,
          background: "#070714",
          color: "rgba(240,240,252,0.4)",
        }}
      >
        <Loader2
          size={26}
          style={{ animation: "spin .8s linear infinite", color: "#e63946" }}
        />
        <span style={{ fontSize: ".83rem" }}>Cargando comunidad...</span>
      </div>
    );
  if (!loadingCom && !community)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 14,
          background: "#070714",
          color: "rgba(240,240,252,0.35)",
        }}
      >
        <Globe size={48} style={{ opacity: 0.12 }} />
        <p style={{ margin: 0, fontWeight: 700 }}>Comunidad no encontrada</p>
        <button
          onClick={() => router.back()}
          style={{
            padding: "9px 24px",
            borderRadius: 10,
            background: "linear-gradient(135deg,#e63946,#a855f7)",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Volver
        </button>
      </div>
    );

  const filteredMembers = (community?.members ?? []).filter((m) =>
    m.username.toLowerCase().includes(memberSearch.toLowerCase()),
  );
  const existingMemberIds = new Set(
    (community?.members ?? []).map((m) => m._id),
  );
  const onlineCount = (community?.members ?? []).filter((m) => m.online).length;

  const TABS: { id: Panel; icon: React.ReactNode; label: string }[] = [
    { id: "members", icon: <Users size={12} />, label: "Miembros" },
    { id: "stats", icon: <Activity size={12} />, label: "Stats" },
    { id: "rules", icon: <FileText size={12} />, label: "Reglas" },
    ...(isAdmin
      ? [
          {
            id: "invite" as Panel,
            icon: <UserPlus size={12} />,
            label: "Invitar",
          },
          {
            id: "settings" as Panel,
            icon: <Settings size={12} />,
            label: "Ajustes",
          },
        ]
      : []),
  ];

  const isEditing = !!editingMsg;
  const inputPlaceholder = isEditing
    ? "Editando mensaje... (Enter para guardar, Esc para cancelar)"
    : isFrozen
      ? "❄️ Estás congelado/a en esta comunidad"
      : !community?.messagingOpen && !isAdmin
        ? "Solo admins pueden escribir..."
        : "Escribí algo en la comunidad...";

  const canSendEphemeral = !isEditing && (community?.messagingOpen || isAdmin);

  return (
    <div className="cm-root" style={cssVars}>
      <div className="cm-chat-col">
        {/* Cover Header */}
        <div className="cm-cover-header">
          <div
            key={community?.coverUrl ?? "no-cover"}
            style={{ position: "absolute", inset: 0 }}
          >
            {community?.coverUrl ? (
              isVideoOrGif(community.coverUrl) ? (
                <video
                  src={community.coverUrl}
                  className="cm-cover-header__img"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onLoadedData={() => setCoverLoaded(true)}
                />
              ) : (
                <img
                  src={community.coverUrl}
                  alt=""
                  className="cm-cover-header__img"
                  onLoad={() => setCoverLoaded(true)}
                />
              )
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(135deg,${themeObj.vars.accentMuted},${themeObj.vars.bg})`,
                }}
              />
            )}
          </div>
          <div className="cm-cover-header__grad" />

          <button
            className="cm-cover-header__back"
            onClick={() => router.push("/chat")}
          >
            <ArrowLeft size={17} />
          </button>

          <div className="cm-cover-header__actions">
            <button
              className="cm-cover-header__action"
              onClick={() => setShowThemePicker(true)}
            >
              <Palette size={13} /> <span>Tema</span>
            </button>
            <button
              className={`cm-cover-header__action${community?.isLiked ? " cm-cover-header__action--liked" : ""}`}
              onClick={toggleLike}
            >
              <Heart
                size={13}
                fill={community?.isLiked ? "currentColor" : "none"}
                color="currentColor"
              />
              <span>{community?.likeCount ?? 0}</span>
            </button>
            {!isAdmin && (
              <button
                className="cm-cover-header__action"
                onClick={() => setShowReport(true)}
              >
                <Flag size={13} />
              </button>
            )}
            <div
              className={`cm-status-dot${socketReady ? " cm-status-dot--online" : ""}`}
            />
          </div>

          <div className="cm-cover-header__content">
            <CommunityAvatar
              key={community?.avatarUrl}
              avatarUrl={community?.avatarUrl}
              name={community?.name ?? ""}
              size={46}
            />
            <div className="cm-cover-info">
              <div className="cm-cover-info__text">
                <div className="cm-cover-info__name">
                  {community?.name}
                  {isCreator && (
                    <span title="Creador">
                      <Crown size={13} color="#fbbf24" />
                    </span>
                  )}
                  {isAdmin && !isCreator && (
                    <span title="Admin">
                      <Shield size={12} color="#a855f7" />
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: ".65rem",
                      fontWeight: 600,
                      color: "var(--cp-accent)",
                      opacity: 0.8,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    {themeObj.icon}
                  </span>
                </div>
                <div className="cm-cover-info__sub">
                  <span className="cm-cover-info__badge">
                    <Users size={10} /> {community?.memberCount ?? 0}
                  </span>
                  {onlineCount > 0 && (
                    <span
                      className="cm-cover-info__badge"
                      style={{ color: "var(--cp-online-dot)" }}
                    >
                      ● {onlineCount} en línea
                    </span>
                  )}
                  {!community?.messagingOpen && (
                    <span
                      className="cm-cover-info__badge"
                      style={{ color: "var(--cp-danger)" }}
                    >
                      <Lock size={9} /> Solo admins
                    </span>
                  )}
                  {typingUsers.length > 0 && (
                    <span className="cm-cover-info__typing">
                      {typingUsers.slice(0, 2).join(", ")} escribe...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="cm-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`cm-tab${panel === t.id ? " cm-tab--active" : ""}`}
              onClick={() => setPanel(panel === t.id ? "none" : t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
          {/* ── MOBILE: Botón crear desafío ── */}
          {community && (
            <div className="cm-challenge-mobile">
              <ChallengeButton communityId={community._id} />
            </div>
          )}
        </div>

        {panel !== "none" && (
          <div
            className="cm-panel-overlay"
            onClick={() => setPanel("none")}
            onTouchStart={() => setPanel("none")}
          />
        )}
        {panel !== "none" && community && (
          <div className="cm-panel">
            {panel === "members" && (
              <div className="cm-panel-members">
                <div className="cm-members-search">
                  <Search
                    size={13}
                    style={{ color: "#ffffff", flexShrink: 0 }}
                  />
                  <input
                    className="cm-members-search__input"
                    placeholder="Buscar miembro..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <span
                    style={{
                      fontSize: ".68rem",
                      fontWeight: 800,
                      color: "#ffffff",
                      background: "var(--cp-surface2)",
                      padding: "2px 7px",
                      borderRadius: 20,
                    }}
                  >
                    {community.memberCount}
                  </span>
                </div>
                <div className="cm-members-list">
                  {filteredMembers.map((m) => (
                    <MemberCard
                      key={m._id}
                      member={m}
                      isCurrentAdmin={isAdmin}
                      isCreator={isCreator}
                      currentUserId={user.id}
                      communityId={communityId}
                      creatorId={String(community.creatorId)}
                      onUpdate={loadCommunity}
                    />
                  ))}
                  {filteredMembers.length === 0 && (
                    <p
                      style={{
                        textAlign: "center",
                        padding: "20px 0",
                        fontSize: ".78rem",
                        color: "#ffffff",
                      }}
                    >
                      Sin resultados
                    </p>
                  )}
                </div>
              </div>
            )}

            {panel === "stats" && (
              <div className="cm-panel-stats">
                <div className="cm-stats-grid">
                  <div className="cm-stat-card">
                    <div className="cm-stat-card__num">
                      {community.memberCount}
                    </div>
                    <div className="cm-stat-card__label">Miembros</div>
                  </div>
                  <div className="cm-stat-card">
                    <div className="cm-stat-card__num">
                      {community.likeCount}
                    </div>
                    <div className="cm-stat-card__label">Likes</div>
                  </div>
                  <div className="cm-stat-card">
                    <div className="cm-stat-card__num">
                      {feed.filter((m) => m.type === "message").length}
                    </div>
                    <div className="cm-stat-card__label">Mensajes</div>
                  </div>
                </div>
                <div className="cm-top-messagers">
                  <p className="cm-top-messagers__title">Top mensajeros</p>
                  {[...community.members]
                    .sort((a, b) => (b.msgCount ?? 0) - (a.msgCount ?? 0))
                    .slice(0, 5)
                    .map((m, i) => (
                      <div key={m._id} className="cm-top-row">
                        <span
                          className="cm-top-row__rank"
                          style={{
                            color:
                              i === 0
                                ? "#fbbf24"
                                : i === 1
                                  ? "rgba(240,240,252,0.4)"
                                  : i === 2
                                    ? "#f97316"
                                    : "#ffffff",
                          }}
                        >
                          {i === 0
                            ? "🥇"
                            : i === 1
                              ? "🥈"
                              : i === 2
                                ? "🥉"
                                : `${i + 1}`}
                        </span>
                        <UserAvatar
                          videoSrc={getVideoSrc(m)}
                          src={getImgSrc(m)}
                          alt={m.username}
                          size={24}
                          hasStar={m.hasStar}
                          frame={m.frameColor}
                        />
                        <span className="cm-top-row__name">@{m.username}</span>
                        <span className="cm-top-row__count">{m.msgCount}</span>
                      </div>
                    ))}
                </div>
                <p className="cm-created-at">
                  Creada el{" "}
                  {new Date(community.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}

            {panel === "rules" && (
              <div className="cm-panel-rules">
                {isAdmin && (
                  <div style={{ marginBottom: 8 }}>
                    {editingRules ? (
                      <div style={{ display: "flex", gap: 7 }}>
                        <button
                          className="cm-btn cm-btn--primary"
                          onClick={saveRules}
                        >
                          <Check size={12} /> Guardar
                        </button>
                        <button
                          className="cm-btn cm-btn--ghost"
                          onClick={() => setEditingRules(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="cm-edit-btn"
                        onClick={() => setEditingRules(true)}
                      >
                        <Edit3 size={12} /> Editar reglas
                      </button>
                    )}
                  </div>
                )}
                {editingRules ? (
                  <textarea
                    className="cm-rules-textarea"
                    value={editRules}
                    onChange={(e) => setEditRules(e.target.value)}
                    maxLength={2000}
                    rows={5}
                  />
                ) : community.rules ? (
                  <p className="cm-rules-text">{community.rules}</p>
                ) : (
                  <p className="cm-rules-empty">
                    {isAdmin
                      ? "Aún no definiste reglas."
                      : "Esta comunidad no tiene reglas."}
                  </p>
                )}
              </div>
            )}

            {panel === "invite" && isAdmin && (
              <InvitePanel
                communityId={communityId}
                existingIds={existingMemberIds}
                onUpdate={loadCommunity}
              />
            )}

            {panel === "settings" && isAdmin && (
              <div className="cm-panel-settings">
                <div className="cm-settings-row">
                  <div style={{ flex: 1 }}>
                    <div className="cm-settings-label">
                      <Palette size={12} /> Apariencia
                    </div>
                    <div className="cm-settings-hint">
                      Tema: {themeObj.label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 5,
                        flexWrap: "wrap",
                        marginTop: 7,
                      }}
                    >
                      {THEMES.map((th) => (
                        <button
                          key={th.id}
                          title={th.label}
                          onClick={() => handleThemeChange(th.id)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: th.vars.bg,
                            border: `2px solid ${th.id === activeTheme ? th.vars.accent : "transparent"}`,
                            cursor: "pointer",
                            transition: "transform .15s",
                            boxShadow:
                              th.id === activeTheme
                                ? `0 0 0 1px ${th.vars.accent}`
                                : "none",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.transform = "scale(1.2)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.transform = "scale(1)")
                          }
                        />
                      ))}
                      <button
                        className="cm-btn cm-btn--ghost"
                        style={{
                          fontSize: ".65rem",
                          padding: "3px 8px",
                          height: 22,
                        }}
                        onClick={() => setShowThemePicker(true)}
                      >
                        <RefreshCw size={10} /> Más
                      </button>
                    </div>
                  </div>
                </div>

                <div className="cm-settings-row">
                  <div style={{ flex: 1 }}>
                    <div className="cm-settings-label">
                      <Edit3 size={12} /> Nombre y descripción
                    </div>
                    {editingName ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          marginTop: 9,
                        }}
                      >
                        <input
                          className="cm-setting-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nombre de la comunidad"
                        />
                        <textarea
                          className="cm-setting-input cm-setting-textarea"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Descripción"
                          rows={2}
                        />
                        <ImageUploadField
                          label="Avatar"
                          value={editAvatarUrl}
                          onChange={setEditAvatarUrl}
                          placeholder="URL de imagen o subí desde el dispositivo →"
                          previewRound
                          uploading={uploadingAvatar}
                          setUploading={setUploadingAvatar}
                          tok={tok}
                          showNotif={showNotif}
                        />
                        <ImageUploadField
                          label="Portada"
                          value={editCoverUrl}
                          onChange={setEditCoverUrl}
                          placeholder="URL de imagen o subí desde el dispositivo →"
                          uploading={uploadingCover}
                          setUploading={setUploadingCover}
                          tok={tok}
                          showNotif={showNotif}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="cm-btn cm-btn--primary"
                            onClick={saveNameDesc}
                            disabled={uploadingAvatar || uploadingCover}
                          >
                            {uploadingAvatar || uploadingCover ? (
                              <Loader2
                                size={12}
                                style={{
                                  animation: "spin .8s linear infinite",
                                }}
                              />
                            ) : (
                              <Check size={12} />
                            )}
                            Guardar
                          </button>
                          <button
                            className="cm-btn cm-btn--ghost"
                            onClick={() => setEditingName(false)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="cm-edit-btn"
                        style={{ marginTop: 5 }}
                        onClick={() => setEditingName(true)}
                      >
                        <Edit3 size={11} /> Editar
                      </button>
                    )}
                  </div>
                </div>

                <div className="cm-settings-row">
                  <div>
                    <div className="cm-settings-label">
                      {community.messagingOpen ? (
                        <MessageSquare size={12} color="var(--cp-online-dot)" />
                      ) : (
                        <MessageSquareOff size={12} color="var(--cp-danger)" />
                      )}
                      Mensajes
                    </div>
                    <div className="cm-settings-hint">
                      {community.messagingOpen
                        ? "Todos pueden escribir"
                        : "Solo admins pueden escribir"}
                    </div>
                  </div>
                  <button
                    className={`cm-toggle${community.messagingOpen ? " cm-toggle--on" : ""}`}
                    onClick={toggleMessaging}
                  >
                    <div className="cm-toggle__dot" />
                  </button>
                </div>
                <div
                  className="cm-settings-row"
                  style={{ borderBottom: "none" }}
                >
                  <div>
                    <div className="cm-settings-label">ID de comunidad</div>
                    <div
                      style={{
                        fontSize: ".64rem",
                        color: "#ffffff",
                        fontFamily: "monospace",
                        marginTop: 3,
                        wordBreak: "break-all",
                      }}
                    >
                      {communityId}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!community?.messagingOpen && !isAdmin && (
          <div className="cm-disabled-banner">
            <Lock size={12} /> Solo los admins pueden escribir en este momento.
          </div>
        )}
        {!isMember && community && (
          <div className="cm-join-banner">
            <Lock size={13} />
            <span>Solo los miembros pueden interactuar.</span>
            <button className="cm-join-btn" onClick={joinCommunity}>
              <UserPlus size={13} /> Unirse
            </button>
          </div>
        )}
        {isMember && !isCreator && (
          <div
            className="cm-join-banner"
            style={{
              background: "rgba(248,113,113,0.06)",
              borderColor: "rgba(248,113,113,0.18)",
            }}
          >
            <UserMinus size={13} style={{ color: "var(--cp-danger)" }} />
            <span style={{ color: "#ffffff", fontSize: ".78rem" }}>
              ¿Querés salir de la comunidad?
            </span>
            <button
              className="cm-join-btn"
              style={{ background: "var(--cp-danger)" }}
              onClick={() => setShowLeaveConfirm(true)}
            >
               Abandonar
            </button>
          </div>
        )}

        {/* Feed */}
        <div className="cm-feed">
          {loadingCom && (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 48 }}
            >
              <Loader2
                size={24}
                style={{
                  animation: "spin .8s linear infinite",
                  opacity: 0.3,
                  color: "var(--cp-accent)",
                }}
              />
            </div>
          )}
          {!loadingCom && feed.length === 0 && (
            <div className="cm-feed__empty">
              <Globe size={52} style={{ opacity: 0.1 }} />
              <h3 style={{ margin: 0, fontSize: ".9rem", fontWeight: 700 }}>
                El feed está vacío
              </h3>
              <p style={{ margin: 0, fontSize: ".78rem" }}>
                Sé el primero en escribir algo ✨
              </p>
            </div>
          )}
          {feed.map((msg) => (
            <CommunityBubble
              key={msg._id}
              msg={msg}
              currentUserId={user.id}
              isAdmin={isAdmin}
              communityId={communityId}
              socketRef={socketRef}
              onDeleted={handleDeleted}
              onEditStart={handleEditStart}
              onViewEphemeral={handleViewEphemeral}
            />
          ))}
          {typingUsers.length > 0 && (
            <div className="cm-typing">
              <div className="cm-typing__dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input bar */}
        <div className="cm-input-bar">
          {isEditing && (
            <div className="cm-edit-banner">
              <Pencil size={11} />
              <span className="cm-edit-banner__label">Editando mensaje</span>
              <button
                className="cm-edit-banner__cancel"
                onClick={() => {
                  setEditingMsg(null);
                  setEditMsgText("");
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              padding: "8px 12px",
            }}
          >
            {canSendEphemeral && (
              <button
                className="cm-ephemeral-trigger-btn"
                onClick={() => setShowEphemeral(true)}
                title="Mensaje temporal"
              >
                <Timer size={15} />
              </button>
            )}
            <div className="cm-input-wrap" style={{ flex: 1 }}>
              <textarea
                ref={inputRef}
                className="cm-input"
                placeholder={inputPlaceholder}
                value={isEditing ? editMsgText : input}
                onChange={(e) =>
                  isEditing
                    ? setEditMsgText(e.target.value)
                    : setInput(e.target.value)
                }
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={
                  !isMember ||
                  (isFrozen && !isEditing) ||
                  (!community?.messagingOpen && !isAdmin && !isEditing)
                }
                style={
                  isEditing ? { borderColor: "var(--cp-accent)" } : undefined
                }
              />
            </div>
            <button
              className="cm-send-btn"
              onClick={isEditing ? submitEdit : sendMessage}
              disabled={
                isEditing
                  ? !editMsgText.trim()
                  : !isMember ||
                    isFrozen ||
                    !input.trim() ||
                    (!community?.messagingOpen && !isAdmin)
              }
              title={isEditing ? "Guardar edición" : "Enviar"}
            >
              {isEditing ? (
                <Check size={15} color="var(--cp-accent-fg)" />
              ) : (
                <Send size={15} color="var(--cp-accent-fg)" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="cm-sidebar">
        <div className="cm-sidebar__cover">
          <div
            key={community?.coverUrl ?? "no-cover-sidebar"}
            style={{ position: "absolute", inset: 0 }}
          >
            {community?.coverUrl ? (
              isVideoOrGif(community.coverUrl) ? (
                <video
                  src={community.coverUrl}
                  className="cm-sidebar__cover-img"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={community.coverUrl}
                  alt=""
                  className="cm-sidebar__cover-img"
                />
              )
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(135deg,${themeObj.vars.accentMuted},${themeObj.vars.bg})`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.07,
                    backgroundImage:
                      "radial-gradient(circle,rgba(255,255,255,0.7) 1px,transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />
              </div>
            )}
          </div>
          <div className="cm-sidebar__cover-grad" />
        </div>
        <div className="cm-sidebar__profile">
          <CommunityAvatar
            key={community?.avatarUrl}
            avatarUrl={community?.avatarUrl}
            name={community?.name ?? ""}
            size={52}
          />
          <h2 className="cm-sidebar__name">
            {community?.name}
            {isCreator && (
              <span title="Creador">
                <Crown size={12} color="#fbbf24" />
              </span>
            )}
            {isAdmin && !isCreator && (
              <span title="Admin">
                <Shield size={11} color="#a855f7" />
              </span>
            )}
          </h2>
          {community?.description && (
            <p className="cm-sidebar__desc">{community.description}</p>
          )}
        </div>
        <div className="cm-divider" />
        <div className="cm-sidebar__stats">
          <div className="cm-sidebar__stat">
            <div className="cm-sidebar__stat-num">
              {community?.memberCount ?? 0}
            </div>
            <div className="cm-sidebar__stat-label">Miembros</div>
          </div>
          <div className="cm-sidebar__stat">
            <div className="cm-sidebar__stat-num">
              {community?.likeCount ?? 0}
            </div>
            <div className="cm-sidebar__stat-label">Likes</div>
          </div>
          <div className="cm-sidebar__stat">
            <div className="cm-sidebar__stat-num">{onlineCount}</div>
            <div className="cm-sidebar__stat-label">En línea</div>
          </div>
        </div>
        <div className="cm-divider" />
        <div className="cm-sidebar__badges">
          <span
            className={`cm-badge${community?.messagingOpen ? " cm-badge--green" : " cm-badge--red"}`}
          >
            {community?.messagingOpen ? (
              <MessageSquare size={9} />
            ) : (
              <MessageSquareOff size={9} />
            )}
            {community?.messagingOpen ? "Abierto" : "Solo admins"}
          </span>
          {isCreator && (
            <span className="cm-badge cm-badge--gold">
              <Crown size={9} /> Creador
            </span>
          )}
          {isAdmin && !isCreator && (
            <span className="cm-badge cm-badge--gold">
              <Shield size={9} /> Admin
            </span>
          )}
          {socketReady && (
            <span className="cm-badge cm-badge--green">
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--cp-online-dot)",
                }}
              />{" "}
              Conectado
            </span>
          )}
          <span
            className="cm-badge cm-badge--accent"
            style={{ cursor: "pointer" }}
            onClick={() => setShowThemePicker(true)}
          >
            <Palette size={9} /> {themeObj.label}
          </span>
        </div>
        <div className="cm-divider" />
        <div className="cm-sidebar__members">
          <p className="cm-sidebar__section-title">Admins y destacados</p>
          {community && <ChallengeButton communityId={community._id} />}
          {(community?.members ?? [])
            .filter((m) => m.role === "admin" || m.hasStar)
            .slice(0, 8)
            .map((m) => {
              const mIsCreator = String(m._id) === String(community?.creatorId);
              return (
                <div key={m._id} className="cm-sidebar__member-row">
                  <UserAvatar
                    videoSrc={getVideoSrc(m)}
                    src={getImgSrc(m)}
                    alt={m.username}
                    size={26}
                    frame={m.frameColor}
                    hasStar={m.hasStar}
                    isAdmin={m.role === "admin"}
                    online={m.online}
                  />
                  <span className="cm-sidebar__member-name">@{m.username}</span>
                  {mIsCreator ? (
                    <span title="Creador">
                      <Crown size={10} color="#fbbf24" />
                    </span>
                  ) : m.role === "admin" ? (
                    <span title="Admin">
                      <Shield size={10} color="#a855f7" />
                    </span>
                  ) : null}
                  {m.hasStar && (
                    <Star
                      size={9}
                      fill="#fbbf24"
                      color="#fbbf24"
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </div>
              );
            })}
          {(community?.members ?? []).filter(
            (m) => m.role === "admin" || m.hasStar,
          ).length === 0 && (
            <p
              style={{
                fontSize: ".72rem",
                color: "#ffffff",
                margin: "8px 0 0",
              }}
            >
              Sin admins destacados aún
            </p>
          )}
        </div>
        <div className="cm-sidebar__footer">
          <button className="cm-footer-btn" onClick={() => router.push("/")}>
            <Home size={13} /> Inicio
          </button>
          <button
            className="cm-footer-btn"
            onClick={() => router.push("/chat")}
          >
            <ArrowLeft size={13} /> Chats
          </button>
          {isMember && !isCreator && (
            <button
              className="cm-footer-btn"
              style={{ color: "var(--cp-danger)" }}
             onClick={() => setShowLeaveConfirm(true)}
            >
              <UserMinus size={13} /> Salir
            </button>
          )}
        </div>
      </aside>

      {/* REPORT MODAL */}
      {showReport && (
        <div className="cm-modal-overlay" onClick={() => setShowReport(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header">
              <Flag size={16} color="var(--cp-danger)" />
              <h3>Denunciar comunidad</h3>
              <button onClick={() => setShowReport(false)}>
                <X size={17} />
              </button>
            </div>
            <div className="cm-modal__body">
              {reportSubmitted ? (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <span
                    style={{
                      fontSize: "2.2rem",
                      display: "block",
                      marginBottom: 10,
                    }}
                  >
                    ✅
                  </span>
                  <h4 style={{ margin: "0 0 5px", color: "#1a1a2e"}}>
                    Denuncia enviada
                  </h4>
                  <p
                    style={{
                      margin: "0 0 16px",
                      fontSize: ".78rem",
                      color: "#ffffff",
                    }}
                  >
                    La revisaremos a la brevedad. Gracias.
                  </p>
                  <button
                    onClick={() => {
                      setShowReport(false);
                      setReportSubmitted(false);
                    }}
                    style={{
                      padding: "9px 24px",
                      borderRadius: 10,
                      background: "#ffffff",
                      border: "1px solid var(--cp-border)",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <p className="cm-report-hint">
                    ¿Por qué denunciás esta comunidad?
                  </p>
                  <div className="cm-report-reasons">
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r.value}
                        className={`cm-reason-btn${reportReason === r.value ? " cm-reason-btn--active" : ""}`}
                        onClick={() => setReportReason(r.value)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="cm-report-textarea"
                    placeholder="Detalles adicionales (opcional)..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <button
                    className="cm-report-submit"
                    disabled={!reportReason}
                    onClick={submitReport}
                  >
                    <Flag size={14} /> Enviar denuncia
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* THEME PICKER */}
      {showThemePicker && (
        <ThemePickerModal
          currentTheme={activeTheme}
          userRole={
            isCreator
              ? "owner"
              : isAdmin
                ? "admin"
                : ((user as any)?.role ?? "user")
          }
          onSelect={handleThemeChange}
          onClose={() => setShowThemePicker(false)}
          saving={savingTheme}
        />
      )}

      {/* EPHEMERAL COMPOSER */}
      {showEphemeral && (
        <EphemeralComposer
          isAdmin={isAdmin}
          communityId={communityId}
          socketRef={socketRef}
          onClose={() => setShowEphemeral(false)}
          onSent={() => showNotif("Temporal enviado ✓")}
        />
      )}

      {/* EPHEMERAL VIEWER */}
      {ephemeralViewing && (
        <EphemeralModal
          imageUrl={ephemeralViewing.imageUrl}
          caption={ephemeralViewing.caption}
          onClose={() => setEphemeralViewing(null)}
        />
      )}

      {/* CAMBIO 4: Modal de invitación de batalla */}
      {battleInvite && (
        <BattleInvitationModal
          invitation={battleInvite}
          token={tok()}
          onClose={() => setBattleInvite(null)}
        />
      )}
      {showLeaveConfirm &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 20px",
              animation: "fadeIn .18s ease",
            }}
            onClick={() => setShowLeaveConfirm(false)}
          >
            <div
              style={{
                background: "var(--cp-bg)",
                border: "1px solid var(--cp-border)",
                borderRadius: 20,
                padding: "28px 24px 22px",
                width: "100%",
                maxWidth: 360,
                boxShadow:
                  "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                animation: "dropIn .2s cubic-bezier(.175,.885,.32,1.275)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ícono */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(248,113,113,0.1)",
                  border: "1.5px solid rgba(248,113,113,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 4,
                }}
              >
                <UserMinus size={24} color="#f87171" />
              </div>

              {/* Texto */}
              <div style={{ textAlign: "center" }}>
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: "#ffffff",
                  }}
                >
                  ¿Abandonar la comunidad?
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: ".78rem",
                    color: "#ffffff",
                    lineHeight: 1.5,
                  }}
                >
                  Vas a salir de{" "}
                  <span style={{ color: "var(--cp-accent)", fontWeight: 700 }}>
                    {community?.name}
                  </span>
                  . Podés volver a unirte cuando quieras.
                </p>
              </div>

              {/* Botones */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  width: "100%",
                  marginTop: 6,
                }}
              >
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 12,
                    background: "#ffffff",
                    border: "1px solid var(--cp-border)",
                    color: "var(--cp-text-sub)",
                    fontSize: ".82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--cp-surface2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#ffffff")
                  }
                >
                  Cancelar
                </button>
                <button
                  onClick={leaveCommunity}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: ".82rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all .15s",
                    boxShadow: "0 4px 20px rgba(239,68,68,0.35)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Sí, abandonar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* TOAST */}
      {notification && (
        <div className={`cm-toast cm-toast--${notification.type}`}>
          {notification.text}
        </div>
      )}
    </div>
  );
}
