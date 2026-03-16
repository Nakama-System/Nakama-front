"use client";

// ═══════════════════════════════════════════════════════════
// ChatSidebarComponents.tsx
// Componentes del sidebar: AgendaSection, AddContactModal,
// ConvItem, NewChatModal, ThemeModal
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Users,
  Globe,
  Plus,
  Search,
  Check,
  X,
  Palette,
  Ban,
  UserMinus,
  BookUser,
  UserX,
  UserPlus,
  BellOff,
} from "lucide-react";
import { UserAvatar, type Conversation } from "./ChatUIComponents";

const API = "https://nakama-backend-render.onrender.com";

// ── Tipos ─────────────────────────────────────────────────
export interface UserSuggestion {
  _id: string;
  username: string;
  avatarUrl?: string;
  role: string;
  mutualCount?: number;
  source: "nakama" | "contacto" | "tiktok" | "instagram" | "facebook";
  online?: boolean;
}

// ── Helper: extrae videoSrc de cualquier objeto usuario ───
function getVideoSrc(obj: any): string | undefined {
  return (
    obj?.profileVideo?.url ||
    obj?.videoUrl ||
    obj?.profileVideoUrl ||
    undefined
  );
}

// ── Constantes ────────────────────────────────────────────
export const SOURCE_COLORS: Record<UserSuggestion["source"], string> = {
  nakama: "#e63946",
  contacto: "#4cc9f0",
  tiktok: "#69C9D0",
  instagram: "#E1306C",
  facebook: "#1877F2",
};

export function sourceConfig(source: UserSuggestion["source"]) {
  const map: Record<UserSuggestion["source"], { label: string; color: string; abbr: string }> = {
    nakama: { label: "Nakama", color: "#e63946", abbr: "N" },
    contacto: { label: "Contacto", color: "#4cc9f0", abbr: "C" },
    tiktok: { label: "TikTok", color: "#69C9D0", abbr: "T" },
    instagram: { label: "Instagram", color: "#E1306C", abbr: "I" },
    facebook: { label: "Facebook", color: "#1877F2", abbr: "F" },
  };
  return map[source] ?? map.nakama;
}

export const THEMES_USER = [
  { id: "default", label: "Por defecto", bg: "#0d0d1a", accent: "#e63946" },
  { id: "light", label: "Claro", bg: "#f5f5f0", accent: "#e63946" },
];
export const THEMES_PRO = [
  ...THEMES_USER,
  { id: "ocean", label: "Océano", bg: "#0a1628", accent: "#00b4d8" },
  { id: "forest", label: "Bosque", bg: "#0d1f0f", accent: "#52b788" },
  { id: "sunset", label: "Atardecer", bg: "#1a0a00", accent: "#ff6b35" },
  { id: "sakura", label: "Sakura", bg: "#1a0a10", accent: "#ff85a1" },
];
export const THEMES_PREMIUM = [
  ...THEMES_PRO,
  { id: "neon", label: "Neon Tokyo", bg: "#050510", accent: "#00ffff" },
  { id: "gold", label: "Gold", bg: "#0d0a00", accent: "#ffd700" },
  { id: "galaxy", label: "Galaxia", bg: "#020212", accent: "#a855f7" },
  { id: "custom", label: "Personalizado", bg: "#custom", accent: "#custom" },
];

export const LIMITS = {
  user: { comunidad: 300, grupos: 5 },
  "user-pro": { comunidad: 10000, grupos: 20 },
  "user-premium": { comunidad: 50000, grupos: 100 },
  moderator: { comunidad: 50000, grupos: 100 },
  admin: { comunidad: 50000, grupos: 100 },
  superadmin: { comunidad: 50000, grupos: 100 },
};

// ══════════════════════════════════════════════════════════
// AgendaSection
// ══════════════════════════════════════════════════════════
export function AgendaSection({
  contacts, loadingContacts, onChat, onRemove, onAdd,
}: {
  contacts: UserSuggestion[];
  loadingContacts: boolean;
  onChat: (c: UserSuggestion) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | UserSuggestion["source"]>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = contacts.filter((c) => {
    const matchSearch = c.username.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.source === filter;
    return matchSearch && matchFilter;
  });
  const sources = ["all", ...Array.from(new Set(contacts.map((c) => c.source)))] as ("all" | UserSuggestion["source"])[];

  return (
    <div className="agenda-root">
      <div className="agenda-header">
        <BookUser size={16} style={{ color: "#e63946", flexShrink: 0 }} />
        <span className="agenda-header__title">Mis Nakamas</span>
        <span className="agenda-header__count">{contacts.length}</span>
        <button className="agenda-header__add-btn" onClick={onAdd}>
          <UserPlus size={13} /> Agregar
        </button>
      </div>
      <div className="agenda-search">
        <Search size={14} className="agenda-search__icon" />
        <input className="agenda-search__input" placeholder="Buscar en agenda..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && (
          <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,240,248,0.4)", display: "flex" }}>
            <X size={13} />
          </button>
        )}
      </div>
      {sources.length > 1 && (
        <div className="agenda-filters">
          {sources.map((s) => (
            <button
              key={s}
              className={`agenda-filter-chip ${filter === s ? "agenda-filter-chip--active" : ""}`}
              onClick={() => setFilter(s as any)}
              style={filter === s && s !== "all" ? { borderColor: SOURCE_COLORS[s as UserSuggestion["source"]], color: SOURCE_COLORS[s as UserSuggestion["source"]] } : {}}
            >
              {s === "all" ? "Todos" : sourceConfig(s as UserSuggestion["source"]).label}
            </button>
          ))}
        </div>
      )}
      <div className="agenda-grid-wrap">
        {loadingContacts ? (
          <div className="agenda-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="agenda-card" style={{ pointerEvents: "none" }}>
                <div className="agenda-skeleton agenda-card__skel-avatar" />
                <div className="agenda-skeleton agenda-card__skel-line" />
                <div className="agenda-skeleton agenda-card__skel-line--sm agenda-skeleton" />
                <div className="agenda-skeleton agenda-card__skel-btn" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="agenda-empty">
            <span className="agenda-empty__icon">📭</span>
            <h3>{search || filter !== "all" ? "Sin resultados" : "Tu agenda está vacía"}</h3>
            <p>{search || filter !== "all" ? "Intentá con otro filtro o nombre" : "Agregá amigos para chatear fácilmente"}</p>
            {!search && filter === "all" && (
              <button className="agenda-empty__cta" onClick={onAdd}><UserPlus size={14} /> Agregar nakama</button>
            )}
          </div>
        ) : (
          <div className="agenda-grid">
            {filtered.map((c, idx) => {
              const src = sourceConfig(c.source);
              // ✅ ya estaba bien — no se toca
              return (
                <div key={c._id ?? idx} className="agenda-card" style={{ "--ag-card-accent": src.color } as React.CSSProperties}>
                  {confirmId === c._id && (
                    <div className="agenda-card__confirm" onClick={(e) => e.stopPropagation()}>
                      <p>¿Eliminar a <strong>@{c.username}</strong>?</p>
                      <div className="agenda-card__confirm-btns">
                        <button className="agenda-card__confirm-yes" onClick={() => { onRemove(c._id); setConfirmId(null); }}>Sí</button>
                        <button className="agenda-card__confirm-no" onClick={() => setConfirmId(null)}>No</button>
                      </div>
                    </div>
                  )}
                  <div className="agenda-card__avatar-wrap">
                    <UserAvatar videoSrc={getVideoSrc(c)} src={!getVideoSrc(c) ? c.avatarUrl : undefined} alt={c.username} size={52} />
                    {c.online && <span className="agenda-card__online-dot" />}
                    <div className="agenda-card__source-badge" style={{ background: src.color }} title={src.label}>
                      <span>{src.abbr}</span>
                    </div>
                  </div>
                  <span className="agenda-card__name">@{c.username}</span>
                  <span className="agenda-card__sub">{src.label}</span>
                  {c.mutualCount ? <span className="agenda-card__mutual" style={{ color: src.color }}>{c.mutualCount} en común</span> : null}
                  <div className="agenda-card__actions">
                    <button className="agenda-card__action agenda-card__action--chat" onClick={() => onChat(c)} title="Chatear">
                      <MessageCircle size={12} /> Chat
                    </button>
                    <button className="agenda-card__action agenda-card__action--remove" onClick={() => setConfirmId(c._id)} title="Eliminar">
                      <UserX size={12} /> Quitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// AddContactModal
// ══════════════════════════════════════════════════════════
export function AddContactModal({
  currentUserId, agendaIds, onAdd, onClose,
}: {
  currentUserId: string;
  agendaIds: Set<string>;
  onAdd: (u: UserSuggestion) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set(agendaIds));

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const token = localStorage.getItem("nakama_token");
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`${API}/chats/search-users?q=${encodeURIComponent(query)}&source=all`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setResults(Array.isArray(d) ? d.filter((u: UserSuggestion) => u._id !== currentUserId) : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  async function handleAdd(u: UserSuggestion) {
    setAdding((prev) => new Set(prev).add(u._id));
    await onAdd(u);
    setAdded((prev) => new Set(prev).add(u._id));
    setAdding((prev) => { const n = new Set(prev); n.delete(u._id); return n; });
  }

  return (
    <div className="agenda-modal-overlay" onClick={onClose}>
      <div className="agenda-modal" onClick={(e) => e.stopPropagation()}>
        <div className="agenda-modal__header">
          <UserPlus size={18} style={{ color: "#e63946" }} />
          <h2>Agregar nakama</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,240,248,0.5)", display: "flex", padding: "4px" }}>
            <X size={18} />
          </button>
        </div>
        <div className="agenda-modal__search-wrap">
          <Search size={14} style={{ color: "rgba(240,240,248,0.4)", flexShrink: 0 }} />
          <input autoFocus placeholder="Buscar por usuario..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="agenda-modal__results">
          {loading && <div style={{ textAlign: "center", padding: "20px", color: "rgba(240,240,248,0.4)", fontSize: "0.82rem" }}>Buscando...</div>}
          {!loading && query.length >= 2 && results.length === 0 && <div className="agenda-modal__no-results">No se encontraron usuarios</div>}
          {!loading && results.map((u) => {
            const src = sourceConfig(u.source);
            const isIn = added.has(u._id);
            const inProgress = adding.has(u._id);
            // ✅ video del resultado de búsqueda
            const videoSrc = getVideoSrc(u);
            return (
              <div key={u._id} className={`agenda-modal__result ${isIn ? "agenda-modal__result--added" : ""}`}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <UserAvatar videoSrc={videoSrc} src={!videoSrc ? u.avatarUrl : undefined} alt={u.username} size={36} />
                  <div style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: src.color, border: "2px solid #0e0e1c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "0.45rem", fontWeight: 800, color: "#fff" }}>{src.abbr}</span>
                  </div>
                </div>
                <div className="agenda-modal__result-info">
                  <span className="agenda-modal__result-name">@{u.username}</span>
                  <span className="agenda-modal__result-sub" style={{ color: src.color }}>{src.label}</span>
                </div>
                {isIn
                  ? <span className="agenda-modal__added-label"><Check size={12} /> Agregado</span>
                  : <button className="agenda-modal__add-btn" disabled={inProgress} onClick={() => handleAdd(u)}>
                      {inProgress ? "..." : <><UserPlus size={12} /> Agregar</>}
                    </button>}
              </div>
            );
          })}
          {!query && <div style={{ textAlign: "center", padding: "28px 16px", color: "rgba(240,240,248,0.3)", fontSize: "0.82rem" }}>Escribí al menos 2 caracteres para buscar</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ConvItem
// ══════════════════════════════════════════════════════════
export function ConvItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void; currentUserId: string }) {
  return (
    <div
      className={`chat-conv-item ${active ? "chat-conv-item--active" : ""} ${conv.pinned ? "chat-conv-item--pinned" : ""} ${conv.isBlocked ? "chat-conv-item--blocked" : ""}`}
      role="listitem" onClick={onClick}
    >
      <div className="chat-conv-item__avatar">
        <UserAvatar
          videoSrc={conv.avatarUrl && /\.(mp4|webm|mov)(\?|$)/i.test(conv.avatarUrl) ? conv.avatarUrl : undefined}
          src={conv.avatarUrl && !/\.(mp4|webm|mov)(\?|$)/i.test(conv.avatarUrl) ? conv.avatarUrl : undefined}
          alt={conv.name} size={40}
        />
        {conv.type === "private" && conv.online && <span className="chat-conv-item__online" />}
        {conv.type === "group" && <span className="chat-conv-item__type-badge"><Users size={8} /></span>}
        {conv.type === "community" && <span className="chat-conv-item__type-badge"><Globe size={8} /></span>}
        {conv.isBlocked && <span className="chat-conv-item__blocked-badge"><Ban size={8} /></span>}
      </div>
      <div className="chat-conv-item__body">
        <div className="chat-conv-item__top">
          <span className="chat-conv-item__name">
            {conv.name}
            {conv.muted && <BellOff size={11} className="chat-conv-item__muted" />}
            {conv.isBlocked && <Ban size={11} className="chat-conv-item__blocked-icon" />}
          </span>
          <span className="chat-conv-item__time">{conv.lastTime}</span>
        </div>
        <div className="chat-conv-item__bottom">
          <span className="chat-conv-item__preview">{conv.isBlocked ? "Usuario bloqueado" : (conv.lastMessage ?? "Sin mensajes")}</span>
          {conv.unread > 0 && !conv.isBlocked && <span className="chat-conv-item__badge">{conv.unread > 99 ? "99+" : conv.unread}</span>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// NewChatModal
// ══════════════════════════════════════════════════════════
export function NewChatModal({
  type, userRole, onClose, currentUserId, contacts = [], onCreated,
}: {
  type: "chat" | "grupo";
  userRole: string;
  onClose: () => void;
  currentUserId: string;
  contacts?: UserSuggestion[];
  onCreated: (conv: Conversation) => void;
}) {
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<UserSuggestion[]>([]);
  const [selected, setSelected] = useState<UserSuggestion[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchSource, setSearchSource] = useState<"all" | "contactos" | "tiktok" | "instagram" | "facebook">("all");

  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return; }
    const token = localStorage.getItem("nakama_token");
    fetch(`${API}/chats/search-users?q=${encodeURIComponent(searchQ)}&source=${searchSource}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setResults(Array.isArray(d) ? d.filter((u: UserSuggestion) => u._id !== currentUserId) : []))
      .catch(() => {});
  }, [searchQ, searchSource, currentUserId]);

  async function handleCreate() {
    if (type === "chat" && selected.length === 0) return;
    if (type === "grupo" && !groupName.trim()) return;
    setCreating(true);
    const token = localStorage.getItem("nakama_token");
    if (!token || token === "null" || token === "undefined") { setCreating(false); return; }
    try {
      const res = await fetch(`${API}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: type === "chat" ? "private" : "group", name: type === "chat" ? selected[0]?.username : groupName.trim(), members: selected.map((s) => s._id) }),
      });
      const text = await res.text();
      let conv: any = {};
      try { conv = JSON.parse(text); } catch { setCreating(false); return; }
      if (!res.ok) { setCreating(false); return; }
      onCreated({ ...conv, name: type === "chat" ? (selected[0]?.username ?? conv.name) : conv.name, avatarUrl: type === "chat" ? (selected[0]?.avatarUrl ?? conv.avatarUrl) : conv.avatarUrl, unread: 0, otherId: type === "chat" ? selected[0]?._id : undefined });
    } catch (err) {
      console.error("Error de red:", err);
    } finally { setCreating(false); }
  }

  const displayList = searchQ.length >= 2 ? results : [];

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal__header">
          {type === "chat" ? <MessageCircle size={20} /> : <Users size={20} />}
          <h2>{type === "chat" ? "Nuevo chat" : "Crear grupo"}</h2>
          <button className="chat-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {type === "grupo" && (
          <div className="chat-modal__field">
            <input className="chat-modal__input" placeholder="Nombre del grupo" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </div>
        )}
        <div className="chat-modal__sources">
          {(["all", "contactos", "tiktok", "instagram", "facebook"] as const).map((s) => (
            <button key={s} className={`chat-modal__source-btn ${searchSource === s ? "chat-modal__source-btn--active" : ""}`} onClick={() => setSearchSource(s)}>
              {{ all: "Todos", contactos: "Contactos", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook" }[s]}
            </button>
          ))}
        </div>
        <div className="chat-search chat-modal__search">
          <Search size={15} className="chat-search__icon" />
          <input className="chat-search__input" placeholder="Buscar usuarios..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} autoFocus />
        </div>
        {selected.length > 0 && (
          <div className="chat-modal__selected">
            {selected.map((u) => (
              <div key={u._id} className="chat-modal__chip">
                <span>@{u.username}</span>
                <button onClick={() => setSelected((prev) => prev.filter((x) => x._id !== u._id))}><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="chat-modal__results">
          {displayList.map((u) => {
            // ✅ video del resultado de búsqueda en NewChatModal
            const videoSrc = getVideoSrc(u);
            return (
              <div
                key={u._id}
                className={`chat-modal__result ${selected.find((s) => s._id === u._id) ? "chat-modal__result--selected" : ""}`}
                onClick={() => {
                  if (type === "chat") setSelected([u]);
                  else setSelected((prev) => prev.find((x) => x._id === u._id) ? prev.filter((x) => x._id !== u._id) : [...prev, u]);
                }}
              >
                <div className="chat-modal__result-avatar">
                  <UserAvatar videoSrc={videoSrc} src={!videoSrc ? u.avatarUrl : undefined} alt={u.username} size={32} />
                </div>
                <div className="chat-modal__result-info">
                  <span className="chat-modal__result-name">@{u.username}</span>
                  <span className={`chat-modal__result-source chat-modal__result-source--${u.source}`}>{sourceConfig(u.source).label}</span>
                </div>
                {selected.find((s) => s._id === u._id) && <Check size={16} className="chat-modal__check" />}
              </div>
            );
          })}
          {searchQ.length >= 2 && displayList.length === 0 && <div className="chat-modal__no-results">No se encontraron usuarios</div>}
        </div>
        <button
          className="chat-modal__submit"
          disabled={creating || (type === "chat" ? selected.length === 0 : !groupName.trim())}
          onClick={handleCreate}
        >
          {creating ? <span className="btn-spinner" /> : type === "chat" ? "Iniciar chat" : "Crear grupo"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ThemeModal
// ══════════════════════════════════════════════════════════
export function ThemeModal({ themes, activeTheme, onSelect, onClose, userRole }: {
  themes: typeof THEMES_USER;
  activeTheme: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  userRole: string;
}) {
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal chat-modal--themes" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal__header">
          <Palette size={20} />
          <h2>Tema del chat</h2>
          <button className="chat-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="chat-modal__hint" style={{ padding: "0 20px 12px" }}>
          {userRole === "user" ? "Plan USER: 2 temas" : userRole === "user-pro" ? "Plan PRO: 6 temas" : "Plan PREMIUM: todos los temas"}
        </p>
        <div className="chat-theme-grid">
          {themes.map((t) => (
            <button
              key={t.id}
              className={`chat-theme-card ${activeTheme === t.id ? "chat-theme-card--active" : ""}`}
              onClick={() => onSelect(t.id)}
              style={{ "--t-bg": t.bg, "--t-accent": t.accent } as React.CSSProperties}
            >
              <div className="chat-theme-card__preview">
                <div className="chat-theme-card__bubble chat-theme-card__bubble--theirs" />
                <div className="chat-theme-card__bubble chat-theme-card__bubble--mine" />
              </div>
              <span>{t.label}</span>
              {activeTheme === t.id && <Check size={14} className="chat-theme-card__check" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
