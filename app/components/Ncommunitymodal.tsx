"use client";

// ═══════════════════════════════════════════════════════════
// components/NewCommunityModal.tsx — Nakama
// Modal para crear comunidades con gestión de miembros
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Search, UserPlus, Crown, Shield, Star, Users,
  Globe, Image, ChevronRight, Check, Loader2,
  Lock, Unlock, UserMinus, AlertCircle,
} from "lucide-react";

const API = "https://nakama-vercel-backend.vercel.app";

interface UserSuggestion {
  _id: string;
  username: string;
  avatarUrl?: string | null;
  role?: string;
}

interface Conversation {
  _id: string;
  type: string;
  name: string;
  avatarUrl?: string;
  memberCount?: number;
  [key: string]: any;
}

interface Props {
  type: "chat" | "grupo" | "comunidad";
  userRole: string;
  onClose: () => void;
  currentUserId: string;
  contacts?: UserSuggestion[];
  onCreated: (conv: Conversation) => void;
}

// ── Avatar simple ──────────────────────────────────────────
function MiniAvatar({ src, username, size = 32 }: { src?: string | null; username: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg,#e63946,#a855f7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", flexShrink: 0,
        fontSize: size * 0.38, color: "#fff", fontWeight: 700,
        border: "1.5px solid rgba(255,255,255,0.1)",
      }}
    >
      {src
        ? <img src={src} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        : username[0]?.toUpperCase()
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export default function NewChatModal({ type, userRole, onClose, currentUserId, contacts = [], onCreated }: Props) {

  // ── Si no es comunidad, renderizar modal básico ────────
  if (type !== "comunidad") {
    return <BasicNewChatModal type={type} userRole={userRole} onClose={onClose} currentUserId={currentUserId} contacts={contacts} onCreated={onCreated} />;
  }

  return <NewCommunityModal onClose={onClose} currentUserId={currentUserId} contacts={contacts} onCreated={onCreated} />;
}

// ─── Modal básico para chat/grupo (sin cambios) ────────────
function BasicNewChatModal({ type, onClose, currentUserId, contacts = [], onCreated }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserSuggestion[]>([]);
  const [selected, setSelected] = useState<UserSuggestion[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const safeContacts = contacts ?? [];
  const tok = () => localStorage.getItem("nakama_token") ?? "";

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(safeContacts.slice(0, 8)); return; }
    try {
      const r = await fetch(`${API}/chats/search-users?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${tok()}` } });
      const d = await r.json();
      setResults(Array.isArray(d) ? d : []);
    } catch { setResults([]); }
  }, [safeContacts]);

  useEffect(() => { doSearch(search); }, [search, doSearch]);
  useEffect(() => { setResults(safeContacts.slice(0, 8)); }, [safeContacts]);

  async function create() {
    setLoading(true);
    try {
      const body = type === "chat"
        ? { type: "p2p", members: [selected[0]?._id] }
        : { type: "grupo", name: name || "Nuevo grupo", members: selected.map(s => s._id) };
      const r = await fetch(`${API}/chats`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` }, body: JSON.stringify(body) });
      const d = await r.json();
      if (r.ok) onCreated(d);
    } catch { }
    setLoading(false);
  }

  const toggle = (u: UserSuggestion) => {
    if (type === "chat") { setSelected([u]); return; }
    setSelected(prev => prev.find(p => p._id === u._id) ? prev.filter(p => p._id !== u._id) : [...prev, u]);
  };

  return (
    <div className="ncm-overlay" onClick={onClose}>
      <div className="ncm-modal" onClick={e => e.stopPropagation()}>
        <div className="ncm-modal__header">
          <h2>{type === "chat" ? "Nuevo chat" : "Nuevo grupo"}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        {type !== "chat" && (
          <input className="ncm-input" placeholder="Nombre del grupo..." value={name} onChange={e => setName(e.target.value)} />
        )}
        <div className="ncm-search-wrap">
          <Search size={14} />
          <input className="ncm-search" placeholder="Buscar usuarios..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {selected.length > 0 && (
          <div className="ncm-selected-chips">
            {selected.map(u => (
              <span key={u._id} className="ncm-chip">
                <MiniAvatar src={u.avatarUrl} username={u.username} size={20} />
                @{u.username}
                <button onClick={() => toggle(u)}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="ncm-user-list">
          {results.map(u => (
            <button key={u._id} className={`ncm-user-row ${selected.find(s => s._id === u._id) ? "ncm-user-row--selected" : ""}`} onClick={() => toggle(u)}>
              <MiniAvatar src={u.avatarUrl} username={u.username} />
              <span>@{u.username}</span>
              {selected.find(s => s._id === u._id) && <Check size={14} color="#4ade80" style={{ marginLeft: "auto" }} />}
            </button>
          ))}
        </div>
        <button className="ncm-create-btn" disabled={selected.length === 0 || loading} onClick={create}>
          {loading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
          {type === "chat" ? "Abrir chat" : "Crear grupo"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NewCommunityModal — modal completo para comunidades
// ═══════════════════════════════════════════════════════════
function NewCommunityModal({ onClose, currentUserId, contacts = [], onCreated }: {
  onClose: () => void; currentUserId: string;
  contacts?: UserSuggestion[]; onCreated: (c: Conversation) => void;
}) {
  const safeContacts = contacts ?? [];
  const [step, setStep] = useState<"info" | "members">("info");

  // Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [messagingOpen, setMessagingOpen] = useState(true);

  // Members
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserSuggestion[]>([]);
  const [selected, setSelected] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tok = () => localStorage.getItem("nakama_token") ?? "";

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(safeContacts.filter(c => c._id !== currentUserId).slice(0, 10)); return; }
    try {
      const r = await fetch(`${API}/chats/search-users?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${tok()}` } });
      const d = await r.json();
      setResults(Array.isArray(d) ? d.filter((u: UserSuggestion) => u._id !== currentUserId) : []);
    } catch { setResults([]); }
  }, [safeContacts, currentUserId]);

  useEffect(() => { doSearch(search); }, [search, doSearch]);
  useEffect(() => { setResults(safeContacts.filter(c => c._id !== currentUserId).slice(0, 10)); }, [safeContacts, currentUserId]);

  const toggleMember = (u: UserSuggestion) => {
    setSelected(prev => prev.find(p => p._id === u._id) ? prev.filter(p => p._id !== u._id) : [...prev, u]);
  };

  async function create() {
    if (!name.trim()) { setError("El nombre es requerido."); return; }
    setLoading(true); setError("");
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl.trim(),
        coverUrl: coverUrl.trim(),
        messagingOpen,
        members: selected.map(s => s._id),
      };
      const r = await fetch(`${API}/comunidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || "Error al crear comunidad."); setLoading(false); return; }
      onCreated({ ...d, type: "comunidad" });
    } catch (e) {
      setError("Error de conexión.");
    }
    setLoading(false);
  }

  return (
    <div className="ncm-overlay" onClick={onClose}>
      <div className="ncm-modal ncm-modal--community" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="ncm-modal__header ncm-modal__header--community">
          <div className="ncm-modal__header-left">
            <div className="ncm-modal__icon"><Globe size={18} /></div>
            <div>
              <h2>Nueva comunidad</h2>
              <span className="ncm-modal__sub">{step === "info" ? "Información básica" : `${selected.length} miembros seleccionados`}</span>
            </div>
          </div>
          <button className="ncm-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Step pills */}
        <div className="ncm-steps">
          <button className={`ncm-step ${step === "info" ? "ncm-step--active" : ""}`} onClick={() => setStep("info")}>
            <span className="ncm-step__num">1</span> Información
          </button>
          <div className="ncm-step__line" />
          <button className={`ncm-step ${step === "members" ? "ncm-step--active" : ""}`} onClick={() => { if (name.trim()) setStep("members"); }}>
            <span className="ncm-step__num">2</span> Miembros
          </button>
        </div>

        <div className="ncm-modal__body">

          {/* ── STEP 1: INFO ── */}
          {step === "info" && (
            <div className="ncm-step-content">

              {/* Preview card */}
              <div className="ncm-preview-card">
                <div className="ncm-preview-card__cover" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : {}}>
                  {!coverUrl && <div className="ncm-preview-card__cover-placeholder"><Image size={20} /></div>}
                  <div className="ncm-preview-card__overlay" />
                </div>
                <div className="ncm-preview-card__profile">
                  <div className="ncm-preview-card__avatar">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      : <Globe size={22} color="#e63946" />
                    }
                  </div>
                  <div className="ncm-preview-card__info">
                    <strong>{name || "Nombre de la comunidad"}</strong>
                    <span>{description || "Sin descripción"}</span>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="ncm-field">
                <label className="ncm-label">Nombre <span style={{ color: "#e63946" }}>*</span></label>
                <input className="ncm-input" placeholder="Ej: Fans de algo, Grupo de estudio..." value={name} onChange={e => setName(e.target.value)} maxLength={80} />
                <span className="ncm-char-count">{name.length}/80</span>
              </div>

              <div className="ncm-field">
                <label className="ncm-label">Descripción</label>
                <textarea className="ncm-input ncm-textarea" placeholder="¿De qué trata esta comunidad?" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={2} />
                <span className="ncm-char-count">{description.length}/500</span>
              </div>

              <div className="ncm-field-row">
                <div className="ncm-field" style={{ flex: 1 }}>
                  <label className="ncm-label"><Image size={12} /> Avatar URL</label>
                  <input className="ncm-input ncm-input--sm" placeholder="https://..." value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
                </div>
                <div className="ncm-field" style={{ flex: 1 }}>
                  <label className="ncm-label"><Image size={12} /> Cover URL</label>
                  <input className="ncm-input ncm-input--sm" placeholder="https://..." value={coverUrl} onChange={e => setCoverUrl(e.target.value)} />
                </div>
              </div>

              {/* Messaging toggle */}
              <div className="ncm-toggle-row">
                <div className="ncm-toggle-row__info">
                  {messagingOpen ? <Unlock size={14} color="#4ade80" /> : <Lock size={14} color="#e63946" />}
                  <div>
                    <div className="ncm-toggle-row__label">Mensajes {messagingOpen ? "abiertos" : "cerrados"}</div>
                    <div className="ncm-toggle-row__hint">
                      {messagingOpen ? "Todos los miembros pueden escribir" : "Solo admins y moderadores pueden escribir"}
                    </div>
                  </div>
                </div>
                <button
                  className={`ncm-toggle ${messagingOpen ? "ncm-toggle--on" : ""}`}
                  onClick={() => setMessagingOpen(v => !v)}
                >
                  <div className="ncm-toggle__dot" />
                </button>
              </div>

              {error && (
                <div className="ncm-error">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button
                className="ncm-next-btn"
                onClick={() => { if (!name.trim()) { setError("El nombre es requerido."); return; } setError(""); setStep("members"); }}
              >
                Siguiente: agregar miembros <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── STEP 2: MEMBERS ── */}
          {step === "members" && (
            <div className="ncm-step-content">

              {/* Owner badge */}
              <div className="ncm-owner-row">
                <Crown size={13} color="#ffd700" />
                <span className="ncm-owner-row__label">Vos serás el dueño y admin principal</span>
              </div>

              {/* Search */}
              <div className="ncm-search-wrap">
                <Search size={13} />
                <input
                  className="ncm-search"
                  placeholder="Buscar usuarios para agregar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {search && <button className="ncm-search-clear" onClick={() => setSearch("")}><X size={12} /></button>}
              </div>

              {/* Selected chips */}
              {selected.length > 0 && (
                <div className="ncm-selected-chips">
                  {selected.map(u => (
                    <span key={u._id} className="ncm-chip">
                      <MiniAvatar src={u.avatarUrl} username={u.username} size={18} />
                      @{u.username}
                      <button onClick={() => toggleMember(u)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}

              {/* Results */}
              <div className="ncm-user-list">
                {results.length === 0 && search.length >= 2 && (
                  <p className="ncm-empty-search">Sin resultados para "{search}"</p>
                )}
                {results.map(u => {
                  const isSel = !!selected.find(s => s._id === u._id);
                  return (
                    <button key={u._id} className={`ncm-user-row ${isSel ? "ncm-user-row--selected" : ""}`} onClick={() => toggleMember(u)}>
                      <MiniAvatar src={u.avatarUrl} username={u.username} />
                      <div className="ncm-user-row__info">
                        <span className="ncm-user-row__name">@{u.username}</span>
                        {isSel && <span className="ncm-user-row__role">Será miembro</span>}
                      </div>
                      {isSel
                        ? <Check size={15} color="#4ade80" style={{ marginLeft: "auto", flexShrink: 0 }} />
                        : <UserPlus size={14} style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.4 }} />
                      }
                    </button>
                  );
                })}
              </div>

              {/* Info box */}
              <div className="ncm-info-box">
                <Users size={13} />
                <div>
                  <p>Los miembros agregados <strong>no se ven entre sí</strong> a menos que vos lo habilites. El dueño puede:</p>
                  <ul>
                    <li><Crown size={10} color="#ffd700" /> Dar rol de admin</li>
                    <li><Star size={10} color="#ffd700" /> Dar estrellas</li>
                    <li><Shield size={10} /> Suspender o expulsar</li>
                    <li><UserPlus size={10} /> Invitar más miembros</li>
                  </ul>
                </div>
              </div>

              {error && <div className="ncm-error"><AlertCircle size={14} /> {error}</div>}

              <div className="ncm-modal__actions">
                <button className="ncm-back-btn" onClick={() => setStep("info")}>
                  Volver
                </button>
                <button className="ncm-create-btn" onClick={create} disabled={loading || !name.trim()}>
                  {loading ? <Loader2 size={15} className="spin" /> : <Globe size={15} />}
                  Crear comunidad
                  {selected.length > 0 && ` (${selected.length + 1})`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Estilos ── */}
      <style>{`
        .ncm-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: ncm-fade-in 0.18s ease;
        }
        @keyframes ncm-fade-in { from { opacity:0 } to { opacity:1 } }
        @keyframes ncm-slide-up { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        .spin { animation: spin 0.8s linear infinite; }

        .ncm-modal {
          background: #13131f;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          width: 100%; max-width: 420px;
          max-height: 90vh;
          overflow: hidden;
          display: flex; flex-direction: column;
          animation: ncm-slide-up 0.22s ease;
          box-shadow: 0 32px 64px rgba(0,0,0,0.6);
        }
        .ncm-modal--community { max-width: 480px; }

        .ncm-modal__header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ncm-modal__header--community { background: linear-gradient(135deg,rgba(230,57,70,0.08),rgba(168,85,247,0.08)); }
        .ncm-modal__header-left { display: flex; align-items: center; gap: 10px; }
        .ncm-modal__icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg,#e63946,#a855f7);
          display: flex; align-items: center; justify-content: center;
          color: white;
        }
        .ncm-modal__header h2 { font-size: 0.95rem; font-weight: 700; color: #f0f0f8; margin: 0; }
        .ncm-modal__sub { font-size: 0.72rem; color: rgba(240,240,248,0.45); }
        .ncm-close-btn {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,0.05); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: rgba(240,240,248,0.6);
          transition: background 0.15s;
        }
        .ncm-close-btn:hover { background: rgba(255,255,255,0.1); }

        .ncm-steps {
          display: flex; align-items: center; padding: 12px 18px; gap: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ncm-step {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          font-size: 0.75rem; color: rgba(240,240,248,0.4);
          padding: 4px 8px; border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .ncm-step--active { color: #f0f0f8; background: rgba(255,255,255,0.06); }
        .ncm-step__num {
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(255,255,255,0.1); display: flex;
          align-items: center; justify-content: center;
          font-size: 0.65rem; font-weight: 700;
        }
        .ncm-step--active .ncm-step__num { background: #e63946; color: white; }
        .ncm-step__line { flex: 1; height: 1px; background: rgba(255,255,255,0.08); }

        .ncm-modal__body { overflow-y: auto; flex: 1; }
        .ncm-step-content { padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }

        /* Preview card */
        .ncm-preview-card {
          border-radius: 12px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
          background: #0e0e1c;
        }
        .ncm-preview-card__cover {
          height: 72px; background: linear-gradient(135deg,#1a1a2e,#16213e);
          background-size: cover; background-position: center;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .ncm-preview-card__cover-placeholder { opacity: 0.2; color: #fff; }
        .ncm-preview-card__overlay { position: absolute; inset: 0; background: linear-gradient(to bottom,transparent,rgba(14,14,28,0.8)); }
        .ncm-preview-card__profile { display: flex; align-items: center; gap: 10px; padding: 10px 14px; }
        .ncm-preview-card__avatar {
          width: 40px; height: 40px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.1);
          background: #13131f; display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0; margin-top: -20px;
        }
        .ncm-preview-card__info strong { display: block; font-size: 0.82rem; color: #f0f0f8; }
        .ncm-preview-card__info span { font-size: 0.7rem; color: rgba(240,240,248,0.4); }

        /* Fields */
        .ncm-field { display: flex; flex-direction: column; gap: 5px; position: relative; }
        .ncm-field-row { display: flex; gap: 10px; }
        .ncm-label { font-size: 0.72rem; font-weight: 600; color: rgba(240,240,248,0.55); display: flex; align-items: center; gap: 4px; }
        .ncm-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 9px 11px;
          color: #f0f0f8; font-size: 0.82rem; outline: none; width: 100%;
          transition: border-color 0.15s;
        }
        .ncm-input:focus { border-color: rgba(230,57,70,0.5); }
        .ncm-input--sm { padding: 7px 9px; font-size: 0.75rem; }
        .ncm-textarea { resize: none; }
        .ncm-char-count { font-size: 0.65rem; color: rgba(240,240,248,0.25); text-align: right; }

        /* Toggle row */
        .ncm-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px; border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .ncm-toggle-row__info { display: flex; align-items: center; gap: 10px; }
        .ncm-toggle-row__label { font-size: 0.78rem; font-weight: 600; color: #f0f0f8; }
        .ncm-toggle-row__hint { font-size: 0.68rem; color: rgba(240,240,248,0.4); }
        .ncm-toggle {
          width: 40px; height: 22px; border-radius: 11px;
          background: rgba(255,255,255,0.1); border: none; cursor: pointer;
          position: relative; transition: background 0.2s; flex-shrink: 0;
        }
        .ncm-toggle--on { background: #22c55e; }
        .ncm-toggle__dot {
          position: absolute; top: 3px; left: 3px;
          width: 16px; height: 16px; border-radius: 50%;
          background: white; transition: transform 0.2s;
        }
        .ncm-toggle--on .ncm-toggle__dot { transform: translateX(18px); }

        /* Owner row */
        .ncm-owner-row {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: 8px;
          background: rgba(255,215,0,0.06);
          border: 1px solid rgba(255,215,0,0.15);
          font-size: 0.75rem; color: rgba(240,240,248,0.7);
        }
        .ncm-owner-row__label { font-size: 0.75rem; }

        /* Search */
        .ncm-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px; padding: 8px 11px;
        }
        .ncm-search-wrap svg { color: rgba(240,240,248,0.3); flex-shrink: 0; }
        .ncm-search { flex: 1; background: none; border: none; outline: none; color: #f0f0f8; font-size: 0.82rem; }
        .ncm-search::placeholder { color: rgba(240,240,248,0.3); }
        .ncm-search-clear { background: none; border: none; cursor: pointer; color: rgba(240,240,248,0.3); padding: 2px; }

        /* Chips */
        .ncm-selected-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .ncm-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 8px 4px 5px; border-radius: 20px;
          background: rgba(230,57,70,0.12); border: 1px solid rgba(230,57,70,0.25);
          font-size: 0.73rem; color: #f0f0f8;
        }
        .ncm-chip button { background: none; border: none; cursor: pointer; color: rgba(240,240,248,0.5); padding: 1px; display: flex; }

        /* User list */
        .ncm-user-list { display: flex; flex-direction: column; gap: 2px; max-height: 200px; overflow-y: auto; }
        .ncm-user-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px; border: none; cursor: pointer;
          background: transparent; color: #f0f0f8; text-align: left;
          transition: background 0.12s;
        }
        .ncm-user-row:hover { background: rgba(255,255,255,0.05); }
        .ncm-user-row--selected { background: rgba(230,57,70,0.08); }
        .ncm-user-row__info { display: flex; flex-direction: column; }
        .ncm-user-row__name { font-size: 0.8rem; }
        .ncm-user-row__role { font-size: 0.65rem; color: rgba(240,240,248,0.4); }
        .ncm-empty-search { text-align: center; font-size: 0.75rem; color: rgba(240,240,248,0.3); padding: 16px 0; }

        /* Info box */
        .ncm-info-box {
          display: flex; gap: 10px; padding: 10px 12px;
          background: rgba(255,255,255,0.03); border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
          font-size: 0.72rem; color: rgba(240,240,248,0.5);
        }
        .ncm-info-box svg { flex-shrink: 0; margin-top: 2px; opacity: 0.5; }
        .ncm-info-box p { margin: 0 0 6px; }
        .ncm-info-box ul { margin: 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
        .ncm-info-box li { display: flex; align-items: center; gap: 5px; }

        /* Error */
        .ncm-error {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 12px; border-radius: 8px;
          background: rgba(230,57,70,0.1); border: 1px solid rgba(230,57,70,0.25);
          font-size: 0.75rem; color: #e63946;
        }

        /* Buttons */
        .ncm-next-btn, .ncm-create-btn {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 11px 16px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 0.83rem; font-weight: 600;
          background: linear-gradient(135deg,#e63946,#a855f7);
          color: white; width: 100%;
          transition: opacity 0.15s, transform 0.1s;
        }
        .ncm-next-btn:hover, .ncm-create-btn:hover { opacity: 0.9; }
        .ncm-next-btn:active, .ncm-create-btn:active { transform: scale(0.98); }
        .ncm-next-btn:disabled, .ncm-create-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .ncm-back-btn {
          padding: 10px 16px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,248,0.7); font-size: 0.82rem; cursor: pointer;
          transition: background 0.15s;
        }
        .ncm-back-btn:hover { background: rgba(255,255,255,0.08); }
        .ncm-modal__actions { display: flex; gap: 10px; }
        .ncm-modal__actions .ncm-create-btn { flex: 1; }
      `}</style>
    </div>
  );
}
