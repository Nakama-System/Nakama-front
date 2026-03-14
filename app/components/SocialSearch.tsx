"use client";

// ═══════════════════════════════════════════════════════════
// components/SocialSearch.tsx — Nakama
// Buscar usuarios por Instagram, TikTok, Facebook
// y crear un chat directo con ellos
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import {
  Search, X, MessageCircle, UserPlus, Check,
  Instagram, ExternalLink, AlertCircle,
} from "lucide-react";

const API = "https://nakama-vercel-backend.vercel.app";

// ── Íconos de redes (SVG inline porque lucide no los trae todos) ──
function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
               2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01
               a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34
               6.34 6.34 0 0 0 6.33-6.34V8.75a8.26 8.26 0 0 0 4.83 1.54V6.84a4.85 4.85 0 0 1-1.06-.15z"/>
    </svg>
  );
}

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125
               24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235
               2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.258h3.328l-.532 3.49h-2.796V24
               C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

// ── Tipos ─────────────────────────────────────────────────
type SocialPlatform = "instagram" | "tiktok" | "facebook";

interface SocialUser {
  _id?:       string;        // si ya existe en Nakama
  username:   string;
  displayName?: string;
  avatarUrl?: string;
  bio?:       string;
  followers?: number;
  platform:   SocialPlatform;
  profileUrl?: string;
  inNakama:   boolean;       // true si ya tiene cuenta en Nakama
  isContact:  boolean;       // true si ya es contacto tuyo
  nakamaId?:  string;        // su _id en Nakama (si inNakama)
}

interface SocialSearchProps {
  onClose:    () => void;
  onStartChat: (conv: {
    _id: string; type: "private"; name: string;
    avatarUrl?: string; unread: 0; online?: boolean;
  }) => void;
  currentUserId: string;
}

const PLATFORMS: { id: SocialPlatform; label: string; color: string; placeholder: string }[] = [
  { id: "instagram", label: "Instagram", color: "#E1306C", placeholder: "@usuario_de_instagram" },
  { id: "tiktok",    label: "TikTok",    color: "#69C9D0", placeholder: "@usuario_de_tiktok"    },
  { id: "facebook",  label: "Facebook",  color: "#1877F2", placeholder: "nombre.usuario"         },
];

export default function SocialSearch({ onClose, onStartChat, currentUserId }: SocialSearchProps) {
  const [platform, setPlatform]   = useState<SocialPlatform>("instagram");
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<SocialUser[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [added, setAdded]         = useState<Set<string>>(new Set());
  const [chatting, setChatting]   = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPlatform = PLATFORMS.find(p => p.id === platform)!;

  // ── Búsqueda con debounce ──────────────────────────────
  useEffect(() => {
    if (query.length < 2) { setResults([]); setError(""); return; }
    clearTimeout(debounce.current ?? undefined);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("nakama_token");
        const res = await fetch(
          `${API}/chats/social-search?platform=${platform}&q=${encodeURIComponent(query.replace(/^@/, ""))}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Error al buscar");
        setResults(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "No se pudo conectar con el servidor");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(debounce.current ?? undefined);
  }, [query, platform]);

  // ── Agregar contacto ───────────────────────────────────
  async function handleAdd(u: SocialUser) {
    if (!u.nakamaId) return;
    const token = localStorage.getItem("nakama_token");
    try {
      await fetch(`${API}/chats/contacts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: u.nakamaId }),
      });
      setAdded(prev => new Set(prev).add(u.nakamaId!));
    } catch {}
  }

  // ── Iniciar chat ───────────────────────────────────────
  async function handleChat(u: SocialUser) {
    if (!u.nakamaId) return;
    setChatting(u.nakamaId);
    const token = localStorage.getItem("nakama_token");
    try {
      const res = await fetch(`${API}/chats`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "private", members: [u.nakamaId] }),
      });
      const conv = await res.json();
      if (res.ok) {
        onStartChat({
          _id:       conv._id,
          type:      "private",
          name:      u.displayName ?? u.username,
          avatarUrl: u.avatarUrl,
          unread:    0,
        });
        onClose();
      }
    } catch {} finally {
      setChatting(null);
    }
  }

  function formatFollowers(n?: number) {
    if (!n) return "";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  function PlatformIcon({ p, size }: { p: SocialPlatform; size?: number }) {
    if (p === "instagram") return <Instagram size={size ?? 16} />;
    if (p === "tiktok")    return <TikTokIcon size={size ?? 16} />;
    return <FacebookIcon size={size ?? 16} />;
  }

  return (
    <div className="ss-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Buscar en redes sociales">
      <div className="ss-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────── */}
        <div className="ss-header">
          <div className="ss-header__title">
            <span className="ss-header__icon">🔍</span>
            <div>
              <h2>Buscar en redes sociales</h2>
              <p>Encontrá amigos de Instagram, TikTok o Facebook</p>
            </div>
          </div>
          <button className="ss-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* ── Selector de plataforma ───────────────────── */}
        <div className="ss-platforms">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              className={`ss-platform-btn ${platform === p.id ? "ss-platform-btn--active" : ""}`}
              style={{ "--p-color": p.color } as React.CSSProperties}
              onClick={() => { setPlatform(p.id); setQuery(""); setResults([]); }}
            >
              <PlatformIcon p={p.id} size={18} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* ── Input de búsqueda ────────────────────────── */}
        <div className="ss-search">
          <div className="ss-search__platform-icon" style={{ color: currentPlatform.color }}>
            <PlatformIcon p={platform} size={18} />
          </div>
          <input
            className="ss-search__input"
            placeholder={currentPlatform.placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            spellCheck={false}
          />
          {loading && <div className="ss-search__spinner" />}
          {query && !loading && (
            <button className="ss-search__clear" onClick={() => { setQuery(""); setResults([]); }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Hint ────────────────────────────────────── */}
        <p className="ss-hint">
          {query.length < 2
            ? `Escribí al menos 2 caracteres para buscar en ${currentPlatform.label}`
            : `Buscando "@${query.replace(/^@/, "")}" en ${currentPlatform.label}...`
          }
        </p>

        {/* ── Error ───────────────────────────────────── */}
        {error && (
          <div className="ss-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Resultados ──────────────────────────────── */}
        <div className="ss-results">
          {results.length === 0 && !loading && query.length >= 2 && !error && (
            <div className="ss-empty">
              <span>😕</span>
              <p>No encontramos usuarios con ese nombre en {currentPlatform.label}</p>
            </div>
          )}

          {results.map((u, i) => {
            const isAdded   = added.has(u.nakamaId ?? "");
            const isChatting = chatting === u.nakamaId;

            return (
              <div
                key={`${u.platform}-${u.username}-${i}`}
                className={`ss-result ${!u.inNakama ? "ss-result--not-in-nakama" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Avatar */}
                <div className="ss-result__avatar">
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt={u.username} referrerPolicy="no-referrer" />
                    : <span>{(u.displayName ?? u.username)[0].toUpperCase()}</span>
                  }
                  <span
                    className="ss-result__platform-badge"
                    style={{ background: currentPlatform.color }}
                    title={currentPlatform.label}
                  >
                    <PlatformIcon p={u.platform} size={9} />
                  </span>
                </div>

                {/* Info */}
                <div className="ss-result__info">
                  <div className="ss-result__top">
                    <span className="ss-result__name">
                      {u.displayName ?? u.username}
                    </span>
                    {u.inNakama && (
                      <span className="ss-result__nakama-badge">En Nakama</span>
                    )}
                  </div>
                  <span className="ss-result__handle">@{u.username}</span>
                  {u.bio && <span className="ss-result__bio">{u.bio}</span>}
                  <div className="ss-result__meta">
                    {u.followers != null && (
                      <span className="ss-result__followers">
                        {formatFollowers(u.followers)} seguidores
                      </span>
                    )}
                    {u.profileUrl && (
                      <a
                        href={u.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ss-result__profile-link"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink size={11} /> Ver perfil
                      </a>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="ss-result__actions">
                  {u.inNakama ? (
                    <>
                      {!u.isContact && (
                        <button
                          className={`ss-btn ss-btn--add ${isAdded ? "ss-btn--added" : ""}`}
                          onClick={() => handleAdd(u)}
                          disabled={isAdded}
                          title={isAdded ? "Agregado" : "Agregar contacto"}
                        >
                          {isAdded ? <Check size={14} /> : <UserPlus size={14} />}
                        </button>
                      )}
                      <button
                        className="ss-btn ss-btn--chat"
                        onClick={() => handleChat(u)}
                        disabled={isChatting}
                        title="Iniciar chat"
                      >
                        {isChatting
                          ? <span className="ss-spinner" />
                          : <MessageCircle size={14} />
                        }
                      </button>
                    </>
                  ) : (
                    <span className="ss-result__no-account">
                      Sin cuenta en Nakama
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer info ─────────────────────────────── */}
        <div className="ss-footer">
          <span>Solo podés chatear con usuarios que tengan cuenta en Nakama</span>
        </div>
      </div>

      <style>{`
        /* ═══════════════════════════════════════════════
           SocialSearch — estilos inline (Nakama theme)
        ═══════════════════════════════════════════════ */
        .ss-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; padding: 1rem;
          animation: ss-fade-in 0.2s ease;
        }
        @keyframes ss-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .ss-modal {
          background: #0e0e1a;
          border: 1px solid rgba(76,201,240,0.15);
          border-radius: 20px;
          width: 100%; max-width: 520px;
          max-height: 88vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(76,201,240,0.05);
          animation: ss-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes ss-slide-up {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header */
        .ss-header {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          padding: 1.4rem 1.4rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          gap: 12px;
        }
        .ss-header__title {
          display: flex; align-items: flex-start; gap: 12px;
        }
        .ss-header__icon {
          font-size: 1.8rem; line-height: 1;
        }
        .ss-header__title h2 {
          font-size: 1.1rem; font-weight: 700;
          color: #e8e8f0; margin: 0 0 4px;
          font-family: 'Orbitron', monospace;
          letter-spacing: -0.01em;
        }
        .ss-header__title p {
          font-size: 0.78rem; color: #7a7a9a; margin: 0;
        }
        .ss-close {
          background: none; border: none; cursor: pointer;
          color: #4a4a6a; padding: 4px;
          border-radius: 8px; transition: color 0.2s, background 0.2s;
          flex-shrink: 0;
        }
        .ss-close:hover { color: #e8e8f0; background: rgba(255,255,255,0.06); }

        /* Plataformas */
        .ss-platforms {
          display: flex; gap: 8px;
          padding: 1rem 1.4rem 0;
        }
        .ss-platform-btn {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 6px; padding: 0.55rem 0.5rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; cursor: pointer;
          font-size: 0.78rem; font-weight: 600;
          color: #7a7a9a; font-family: 'Rajdhani', sans-serif;
          transition: all 0.2s;
        }
        .ss-platform-btn:hover {
          color: var(--p-color);
          border-color: var(--p-color);
          background: rgba(0,0,0,0.2);
        }
        .ss-platform-btn--active {
          color: var(--p-color) !important;
          border-color: var(--p-color) !important;
          background: rgba(0,0,0,0.3) !important;
          box-shadow: 0 0 12px color-mix(in srgb, var(--p-color) 20%, transparent);
        }

        /* Search */
        .ss-search {
          display: flex; align-items: center; gap: 10px;
          margin: 1rem 1.4rem 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(76,201,240,0.12);
          border-radius: 12px; padding: 0.6rem 0.9rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ss-search:focus-within {
          border-color: rgba(76,201,240,0.3);
          box-shadow: 0 0 0 3px rgba(76,201,240,0.08);
        }
        .ss-search__platform-icon { display: flex; align-items: center; flex-shrink: 0; }
        .ss-search__input {
          flex: 1; background: none; border: none; outline: none;
          color: #e8e8f0; font-size: 0.95rem;
          font-family: 'Rajdhani', sans-serif;
        }
        .ss-search__input::placeholder { color: #4a4a6a; }
        .ss-search__spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(76,201,240,0.2);
          border-top-color: #4cc9f0;
          border-radius: 50%;
          animation: ss-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes ss-spin { to { transform: rotate(360deg); } }
        .ss-search__clear {
          background: none; border: none; cursor: pointer;
          color: #4a4a6a; display: flex; align-items: center;
          padding: 2px; border-radius: 4px;
          transition: color 0.2s;
        }
        .ss-search__clear:hover { color: #e8e8f0; }

        .ss-hint {
          font-size: 0.73rem; color: #4a4a6a;
          padding: 0.5rem 1.4rem 0;
          line-height: 1.4;
        }

        /* Error */
        .ss-error {
          margin: 0.5rem 1.4rem 0;
          display: flex; align-items: center; gap: 8px;
          background: rgba(230,57,70,0.1);
          border: 1px solid rgba(230,57,70,0.25);
          border-radius: 8px; padding: 0.5rem 0.75rem;
          font-size: 0.8rem; color: #ff8a8a;
        }

        /* Resultados */
        .ss-results {
          flex: 1; overflow-y: auto;
          padding: 0.75rem 1.4rem;
          display: flex; flex-direction: column; gap: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .ss-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 8px; padding: 2rem;
          color: #4a4a6a; text-align: center;
        }
        .ss-empty span { font-size: 2rem; }
        .ss-empty p { font-size: 0.85rem; }

        /* Resultado individual */
        .ss-result {
          display: flex; align-items: center; gap: 12px;
          padding: 0.75rem; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
          transition: background 0.2s, border-color 0.2s;
          animation: ss-result-in 0.3s ease both;
        }
        @keyframes ss-result-in {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .ss-result:hover { background: rgba(255,255,255,0.04); border-color: rgba(76,201,240,0.1); }
        .ss-result--not-in-nakama { opacity: 0.6; }

        /* Avatar */
        .ss-result__avatar {
          position: relative; flex-shrink: 0;
          width: 46px; height: 46px;
          border-radius: 50%; overflow: visible;
        }
        .ss-result__avatar img,
        .ss-result__avatar span {
          width: 46px; height: 46px;
          border-radius: 50%; object-fit: cover;
          display: flex; align-items: center; justify-content: center;
          background: rgba(76,201,240,0.1);
          color: #4cc9f0; font-weight: 700; font-size: 1.1rem;
          font-family: 'Orbitron', monospace;
        }
        .ss-result__platform-badge {
          position: absolute; bottom: -2px; right: -2px;
          width: 18px; height: 18px;
          border-radius: 50%; display: flex;
          align-items: center; justify-content: center;
          color: #fff; border: 2px solid #0e0e1a;
        }

        /* Info */
        .ss-result__info {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 2px;
        }
        .ss-result__top {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .ss-result__name {
          font-size: 0.9rem; font-weight: 700;
          color: #e8e8f0; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .ss-result__nakama-badge {
          font-size: 0.62rem; font-weight: 700;
          background: rgba(6,214,160,0.12);
          color: #06d6a0; border: 1px solid rgba(6,214,160,0.25);
          padding: 1px 6px; border-radius: 20px;
          white-space: nowrap; letter-spacing: 0.05em;
          font-family: 'Orbitron', monospace;
        }
        .ss-result__handle {
          font-size: 0.75rem; color: #7a7a9a;
        }
        .ss-result__bio {
          font-size: 0.73rem; color: #5a5a7a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ss-result__meta {
          display: flex; align-items: center; gap: 10px; margin-top: 2px;
        }
        .ss-result__followers {
          font-size: 0.7rem; color: #5a5a7a;
        }
        .ss-result__profile-link {
          font-size: 0.7rem; color: #4cc9f0;
          display: flex; align-items: center; gap: 3px;
          text-decoration: none; transition: color 0.2s;
        }
        .ss-result__profile-link:hover { color: #e8e8f0; }
        .ss-result__no-account {
          font-size: 0.7rem; color: #4a4a6a;
          white-space: nowrap;
        }

        /* Botones de acción */
        .ss-result__actions {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
        }
        .ss-btn {
          width: 34px; height: 34px;
          border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .ss-btn--add {
          background: rgba(76,201,240,0.1);
          color: #4cc9f0;
        }
        .ss-btn--add:hover:not(:disabled) {
          background: rgba(76,201,240,0.2);
          box-shadow: 0 0 12px rgba(76,201,240,0.3);
        }
        .ss-btn--added {
          background: rgba(6,214,160,0.12) !important;
          color: #06d6a0 !important;
          cursor: default;
        }
        .ss-btn--chat {
          background: rgba(230,57,70,0.12);
          color: #e63946;
        }
        .ss-btn--chat:hover:not(:disabled) {
          background: rgba(230,57,70,0.22);
          box-shadow: 0 0 12px rgba(230,57,70,0.3);
        }
        .ss-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ss-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(230,57,70,0.3);
          border-top-color: #e63946;
          border-radius: 50%;
          animation: ss-spin 0.7s linear infinite;
        }

        /* Footer */
        .ss-footer {
          padding: 0.75rem 1.4rem;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 0.72rem; color: #4a4a6a;
          text-align: center;
        }

        @media (max-width: 480px) {
          .ss-modal { border-radius: 16px 16px 0 0; max-height: 92vh; }
          .ss-overlay { align-items: flex-end; padding: 0; }
          .ss-platforms { gap: 6px; }
          .ss-platform-btn { padding: 0.45rem 0.3rem; font-size: 0.72rem; }
        }
      `}</style>
    </div>
  );
}
