"use client";

// ═══════════════════════════════════════════════════════════
// app/crearComunidad/page.tsx — Crear Comunidad
// Cambios:
//   • Avatar y portada: URL o subida desde dispositivo
//   • Preview del avatar en el mundo (círculo sobre portada)
//   • CSS separado en styles/crearComunidad.css
//   • Miembros se agregan al room via socket al crear
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Search,
  X,
  Check,
  ArrowLeft,
  UserPlus,
  Users,
  Home,
  BookUser,
  MessageCircle,
  Loader2,
  ChevronRight,
  Info,
  Sparkles,
  Camera,
  ImageIcon,
  Upload,
  Link2,
} from "lucide-react";
import { useAuth } from "../context/authContext";
import "../styles/crearComunidad.css";

const API = "https://nakama-backend-render.onrender.com";

// ── Tipos ──────────────────────────────────────────────────
interface UserSuggestion {
  _id: string;
  username: string;
  avatarUrl?: string;
  role: string;
  mutualCount?: number;
  source: "nakama" | "contacto" | "tiktok" | "instagram" | "facebook";
  online?: boolean;
}

const LIMITS = {
  user: { comunidad: 300, grupos: 5 },
  "user-pro": { comunidad: 10000, grupos: 20 },
  "user-premium": { comunidad: 50000, grupos: 100 },
  moderator: { comunidad: 50000, grupos: 100 },
  admin: { comunidad: 50000, grupos: 100 },
  superadmin: { comunidad: 50000, grupos: 100 },
};

const SOURCE_COLORS: Record<UserSuggestion["source"], string> = {
  nakama: "#e63946",
  contacto: "#4cc9f0",
  tiktok: "#69C9D0",
  instagram: "#E1306C",
  facebook: "#1877F2",
};

function sourceConfig(source: UserSuggestion["source"]) {
  const map: Record<
    UserSuggestion["source"],
    { label: string; color: string; abbr: string }
  > = {
    nakama: { label: "Nakama", color: "#e63946", abbr: "N" },
    contacto: { label: "Contacto", color: "#4cc9f0", abbr: "C" },
    tiktok: { label: "TikTok", color: "#69C9D0", abbr: "T" },
    instagram: { label: "Instagram", color: "#E1306C", abbr: "I" },
    facebook: { label: "Facebook", color: "#1877F2", abbr: "F" },
  };
  return map[source] ?? map.nakama;
}

// ── Subida de imagen a tu API ──────────────────────────────
async function uploadImage(file: File, token?: string): Promise<string> {
  const tok = token || localStorage.getItem("nakama_token") || "";

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API}/uploads/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}` },
    body: formData,
  });

  if (!res.ok) throw new Error("Error al subir imagen");
  const data = await res.json();
  return data.url ?? data.secure_url ?? data.imageUrl ?? "";
}

// ══════════════════════════════════════════════════════════
// UserAvatar
// ══════════════════════════════════════════════════════════
function UserAvatar({
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
  if (videoSrc)
    return (
      <div style={divStyle} className={`nakama-avatar-wrap ${className}`}>
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
      </div>
    );
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
// AgendaContactCard
// ══════════════════════════════════════════════════════════
function AgendaContactCard({
  contact,
  selected,
  onToggle,
}: {
  contact: UserSuggestion;
  selected: boolean;
  onToggle: () => void;
}) {
  const src = sourceConfig(contact.source);
  return (
    <div
      className={`cc-agenda-card ${selected ? "cc-agenda-card--selected" : ""}`}
      onClick={onToggle}
      style={{ "--ag-accent": src.color } as React.CSSProperties}
    >
      <div className="cc-agenda-card__avatar-wrap">
        <UserAvatar
          videoSrc={(contact as any).profileVideo?.url ?? undefined}
          src={contact.avatarUrl}
          alt={contact.username}
          size={44}
        />
        {contact.online && <span className="cc-agenda-card__online-dot" />}
        <div
          className="cc-agenda-card__source-badge"
          style={{ background: src.color }}
          title={src.label}
        >
          <span>{src.abbr}</span>
        </div>
      </div>
      <span className="cc-agenda-card__name">@{contact.username}</span>
      {contact.mutualCount ? (
        <span className="cc-agenda-card__mutual" style={{ color: src.color }}>
          {contact.mutualCount} en común
        </span>
      ) : (
        <span className="cc-agenda-card__sub">{src.label}</span>
      )}
      <div
        className={`cc-agenda-card__check ${selected ? "cc-agenda-card__check--on" : ""}`}
      >
        {selected && <Check size={11} strokeWidth={3} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ImageInputBlock — URL o subida desde dispositivo
// ══════════════════════════════════════════════════════════
type InputMode = "url" | "uploads";

function ImageInputBlock({
  label,
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
  token,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  token: string;
  placeholder?: string;
}) {
  const [mode, setMode] = useState<InputMode>("url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    onUploadStart?.();
    try {
      // ✅ Token fresco, no del prop
      const freshToken = localStorage.getItem("nakama_token") || token;
      const url = await uploadImage(file, freshToken);
      onChange(url);
    } catch {
      setUploadError("No se pudo subir la imagen. Intentá con URL.");
    } finally {
      setUploading(false);
      onUploadEnd?.();
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const freshToken = localStorage.getItem("nakama_token") || token;
  console.log("Token al subir:", freshToken ? "✅ existe" : "❌ vacío");

  
  return (
    <div className="cc-field">
      <label className="cc-field__label">
        <ImageIcon size={13} /> {label}
      </label>

      {/* Selector de modo */}
      <div className="cc-upload-sources">
        <button
          type="button"
          className={`cc-upload-source-btn ${mode === "url" ? "cc-upload-source-btn--active" : ""}`}
          onClick={() => setMode("url")}
        >
          <Link2 size={12} /> Desde URL
        </button>
        <button
          type="button"
          className={`cc-upload-source-btn ${mode === "uploads" ? "cc-upload-source-btn--active" : ""}`}
          onClick={() => {
            setMode("uploads");
            setTimeout(() => fileRef.current?.click(), 0);
          }}
        >
          <Upload size={12} /> Subir foto
        </button>
      </div>

      {mode === "url" && (
        <input
          className="cc-field__input"
          placeholder={placeholder ?? "https://..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {mode === "uploads" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="cc-upload-source-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {uploading ? (
              <>
                <Loader2
                  size={12}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />{" "}
                Subiendo...
              </>
            ) : (
              <>
                <Camera size={12} /> Elegir foto del dispositivo
              </>
            )}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(240,240,248,0.4)",
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="cc-upload-input"
        onChange={handleFile}
      />

      {uploadError && (
        <span style={{ fontSize: "0.72rem", color: "#f87171" }}>
          {uploadError}
        </span>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE — CrearComunidad
// ══════════════════════════════════════════════════════════
export default function CrearComunidadPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Formulario
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarPreviewError, setAvatarPreviewError] = useState(false);
  const [coverPreviewError, setCoverPreviewError] = useState(false);

  // Avatar / cover input modes
  const [avatarInputMode, setAvatarInputMode] = useState<InputMode>("url");
  const [coverInputMode, setCoverInputMode] = useState<InputMode>("url");

  // Agenda / contactos
  const [contacts, setContacts] = useState<UserSuggestion[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<
    "all" | UserSuggestion["source"]
  >("all");

  // Búsqueda externa de usuarios
  const [extSearch, setExtSearch] = useState("");
  const [extResults, setExtResults] = useState<UserSuggestion[]>([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extSource, setExtSource] = useState<
    "all" | "tiktok" | "instagram" | "facebook"
  >("all");
  const [showExtSearch, setShowExtSearch] = useState(false);

  // Miembros seleccionados
  const [selected, setSelected] = useState<UserSuggestion[]>([]);

  // Submit
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined"
      ? (localStorage.getItem("nakama_token") ?? "")
      : "";
  const role = (user?.role as keyof typeof LIMITS) || "user";
  const memberLimit = LIMITS[role]?.comunidad ?? 300;

  // Auth guard
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  // Cargar agenda
  const loadContacts = useCallback(() => {
    if (!user) return;
    setLoadingContacts(true);
    fetch(`${API}/chats/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const normalized = data
            .map((c: any) => ({
              ...c,
              _id: c._id ?? c.userId ?? c.contactDocId,
            }))
            .filter((c: any) => !!c._id);
          setContacts(normalized);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, [user, token]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Búsqueda externa
  useEffect(() => {
    if (extSearch.length < 2) {
      setExtResults([]);
      return;
    }
    setExtLoading(true);
    const t = setTimeout(() => {
      fetch(
        `${API}/chats/search-users?q=${encodeURIComponent(extSearch)}&source=${extSource}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
        .then((r) => r.json())
        .then((d) =>
          setExtResults(
            Array.isArray(d)
              ? d.filter((u: UserSuggestion) => u._id !== user?.id)
              : [],
          ),
        )
        .catch(() => {})
        .finally(() => setExtLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [extSearch, extSource, user?.id, token]);

  function toggleMember(u: UserSuggestion) {
    setSelected((prev) => {
      if (prev.find((x) => x._id === u._id))
        return prev.filter((x) => x._id !== u._id);
      if (prev.length >= memberLimit) return prev;
      return [...prev, u];
    });
  }

  const filteredContacts = contacts.filter((c) => {
    const matchSearch = c.username
      .toLowerCase()
      .includes(contactSearch.toLowerCase());
    const matchFilter = contactFilter === "all" || c.source === contactFilter;
    return matchSearch && matchFilter;
  });

  const sources = [
    "all",
    ...Array.from(new Set(contacts.map((c) => c.source))),
  ] as ("all" | UserSuggestion["source"])[];

  // Crear comunidad
  async function handleCreate() {
  if (!name.trim()) {
    setError("El nombre es obligatorio.");
    return;
  }
  setError("");
  setCreating(true);

  const freshToken = localStorage.getItem("nakama_token") ?? "";

  const payload = {
    name: name.trim(),
    description: description.trim(),
    avatarUrl: avatarUrl.trim() || "",
    coverUrl: coverUrl.trim() || "",
    members: selected.map((s) => s._id),
  };

  try {
    const res = await fetch(`${API}/comunidades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freshToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? "Error al crear la comunidad.");
      setCreating(false);
      return;
    }

    // El _id puede llegar como ObjectId (objeto) o string
    const rawId = data._id ?? data.id ?? "";
    const communityId = typeof rawId === "object"
      ? String(rawId?.toString?.() ?? JSON.stringify(rawId))
      : String(rawId);

    if (!communityId || communityId === "undefined" || communityId === "null" || communityId === "[object Object]") {
      setError("La comunidad se creó pero hubo un error al obtener el ID. Buscala en tu lista de comunidades.");
      setCreating(false);
      return;
    }

    router.push(`/comunidad/${communityId}`);
  } catch (err) {
    setError("Error de red. Revisá tu conexión.");
  } finally {
    setCreating(false);
  }
}

  if (loading || !user)
    return (
      <div className="cc-loading">
        <div className="cc-loading__spinner" />
        <span>Cargando...</span>
      </div>
    );

  const selectedIds = new Set(selected.map((s) => s._id));

  // Preview avatar: muestra aunque sea URL tipada manualmente
  const avatarPreviewSrc =
    avatarUrl && !avatarPreviewError ? avatarUrl : undefined;
  const coverPreviewSrc = coverUrl && !coverPreviewError ? coverUrl : undefined;

  return (
    <div className="cc-root">
      {/* ── Header ── */}
      <header className="cc-header">
        <button className="cc-header__back" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <div className="cc-header__title-wrap">
          <Globe size={20} className="cc-header__globe" />
          <h1 className="cc-header__title">Crear Comunidad</h1>
        </div>
        <button
          className="cc-header__home"
          onClick={() => router.push("/")}
          title="Inicio"
        >
          <Home size={18} />
        </button>
      </header>

      <div className="cc-body">
        {/* ── Panel izquierdo: formulario ── */}
        <section className="cc-form-section">
          <div className="cc-section-label">
            <Info size={13} />
            Información de la comunidad
          </div>

          {/* ── Preview: portada + avatar como en el mundo ── */}
          <div className="cc-cover-avatar-block">
            {/* Portada */}
            <div className="cc-cover-preview">
              {coverPreviewSrc ? (
                <>
                  <img
                    src={coverPreviewSrc}
                    alt="portada"
                    onError={() => setCoverPreviewError(true)}
                  />
                  <div className="cc-cover-preview__overlay">
                    <span>
                      <Camera size={14} /> Cambiar portada
                    </span>
                  </div>
                </>
              ) : (
                <div className="cc-cover-preview__placeholder">
                  <ImageIcon size={22} />
                  <span>Foto de portada</span>
                </div>
              )}
            </div>

            {/* Avatar sobre la portada */}
            <div className="cc-cover-avatar-row">
              <div className="cc-avatar-circle">
                {avatarPreviewSrc ? (
                  <>
                    <img
                      src={avatarPreviewSrc}
                      alt="avatar"
                      onError={() => setAvatarPreviewError(true)}
                    />
                    <div className="cc-avatar-circle__overlay">
                      <Camera size={14} color="#fff" />
                    </div>
                  </>
                ) : (
                  <Globe
                    size={22}
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  />
                )}
              </div>
              <div className="cc-avatar-info">
                <span className="cc-avatar-info__name">
                  {name.trim() || "Nombre de la comunidad"}
                </span>
                <span className="cc-avatar-info__hint">
                  {selected.length > 0
                    ? `${selected.length + 1} miembro${selected.length !== 0 ? "s" : ""}`
                    : "Solo vos por ahora"}
                </span>
              </div>
            </div>
          </div>

          {/* Input de avatar */}
          <ImageInputBlock
            label="Foto de perfil de la comunidad"
            value={avatarUrl}
            onChange={(url) => {
              setAvatarUrl(url);
              setAvatarPreviewError(false);
            }}
            token={token}
            placeholder="https://... o subí una foto"
          />

          {/* Input de portada */}
          <ImageInputBlock
            label="Foto de portada"
            value={coverUrl}
            onChange={(url) => {
              setCoverUrl(url);
              setCoverPreviewError(false);
            }}
            token={token}
            placeholder="https://... o subí una foto"
          />

          <div className="cc-field cc-field--required">
            <label className="cc-field__label">
              <Globe size={13} /> Nombre de la comunidad *
            </label>
            <input
              className="cc-field__input"
              placeholder="Ej: Nakamas de Buenos Aires"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
            />
            <span className="cc-field__counter">{name.length}/80</span>
          </div>

          <div className="cc-field">
            <label className="cc-field__label">
              <ChevronRight size={13} /> Descripción
            </label>
            <textarea
              className="cc-field__textarea"
              placeholder="¿De qué trata esta comunidad?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <span className="cc-field__counter">{description.length}/500</span>
          </div>

          {/* Info plan */}
          <div className="cc-plan-info">
            <Sparkles size={13} style={{ color: "#e63946", flexShrink: 0 }} />
            <span>
              Tu plan permite hasta{" "}
              <strong>{memberLimit.toLocaleString()}</strong> miembros ·{" "}
              {selected.length} seleccionado{selected.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Miembros seleccionados chips */}
          {selected.length > 0 && (
            <div className="cc-selected-chips">
              <div className="cc-section-label" style={{ marginBottom: 8 }}>
                <Users size={13} /> Miembros seleccionados ({selected.length})
              </div>
              <div className="cc-chips-wrap">
                {selected.map((u) => {
                  const s = sourceConfig(u.source);
                  return (
                    <div
                      key={u._id}
                      className="cc-chip"
                      style={{ "--chip-color": s.color } as React.CSSProperties}
                    >
                      <UserAvatar
                        src={u.avatarUrl}
                        alt={u.username}
                        size={20}
                      />
                      <span>@{u.username}</span>
                      <button
                        className="cc-chip__remove"
                        onClick={() => toggleMember(u)}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="cc-error">
              <X size={14} /> {error}
            </div>
          )}

          <button
            className="cc-create-btn"
            disabled={creating || !name.trim()}
            onClick={handleCreate}
          >
            {creating ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
                Creando...
              </>
            ) : (
              <>
                <Globe size={16} /> Crear Comunidad
              </>
            )}
          </button>
        </section>

        {/* ── Panel derecho: agenda ── */}
        <section className="cc-agenda-section">
          <div className="cc-agenda-tabs">
            <button
              className={`cc-agenda-tab ${!showExtSearch ? "cc-agenda-tab--active" : ""}`}
              onClick={() => setShowExtSearch(false)}
            >
              <BookUser size={14} /> Mi Agenda
            </button>
            <button
              className={`cc-agenda-tab ${showExtSearch ? "cc-agenda-tab--active" : ""}`}
              onClick={() => setShowExtSearch(true)}
            >
              <Search size={14} /> Buscar usuarios
            </button>
          </div>

          {!showExtSearch ? (
            <div className="cc-agenda-panel">
              <div className="cc-section-label" style={{ marginBottom: 8 }}>
                <BookUser size={13} /> Tus contactos · {contacts.length}
              </div>

              <div className="cc-search-bar">
                <Search size={14} className="cc-search-bar__icon" />
                <input
                  className="cc-search-bar__input"
                  placeholder="Buscar en agenda..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                {contactSearch && (
                  <button
                    onClick={() => setContactSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(240,240,248,0.4)",
                      display: "flex",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {sources.length > 1 && (
                <div className="cc-filter-chips">
                  {sources.map((s) => (
                    <button
                      key={s}
                      className={`cc-filter-chip ${contactFilter === s ? "cc-filter-chip--active" : ""}`}
                      onClick={() => setContactFilter(s as any)}
                      style={
                        contactFilter === s && s !== "all"
                          ? {
                              borderColor:
                                SOURCE_COLORS[s as UserSuggestion["source"]],
                              color:
                                SOURCE_COLORS[s as UserSuggestion["source"]],
                            }
                          : {}
                      }
                    >
                      {s === "all"
                        ? "Todos"
                        : sourceConfig(s as UserSuggestion["source"]).label}
                    </button>
                  ))}
                </div>
              )}

              {loadingContacts ? (
                <div className="cc-agenda-grid">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="cc-skeleton-card">
                      <div className="cc-skel cc-skel--avatar" />
                      <div className="cc-skel cc-skel--line" />
                      <div className="cc-skel cc-skel--line-sm" />
                    </div>
                  ))}
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="cc-agenda-empty">
                  <span>📭</span>
                  <p>
                    {contactSearch || contactFilter !== "all"
                      ? "Sin resultados"
                      : "Tu agenda está vacía"}
                  </p>
                  {!contactSearch && contactFilter === "all" && (
                    <button
                      className="cc-agenda-empty__cta"
                      onClick={() => setShowExtSearch(true)}
                    >
                      <Search size={13} /> Buscar usuarios
                    </button>
                  )}
                </div>
              ) : (
                <div className="cc-agenda-grid">
                  {filteredContacts.map((c) => (
                    <AgendaContactCard
                      key={c._id}
                      contact={c}
                      selected={selectedIds.has(c._id)}
                      onToggle={() => toggleMember(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="cc-ext-search-panel">
              <div className="cc-section-label" style={{ marginBottom: 8 }}>
                <Sparkles size={13} /> Buscar en toda la red
              </div>

              <div className="cc-ext-sources">
                {(["all", "tiktok", "instagram", "facebook"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      className={`cc-ext-source-btn ${extSource === s ? "cc-ext-source-btn--active" : ""}`}
                      onClick={() => setExtSource(s)}
                    >
                      {
                        {
                          all: "Todos",
                          tiktok: "TikTok",
                          instagram: "Instagram",
                          facebook: "Facebook",
                        }[s]
                      }
                    </button>
                  ),
                )}
              </div>

              <div className="cc-search-bar">
                <Search size={14} className="cc-search-bar__icon" />
                <input
                  className="cc-search-bar__input"
                  placeholder="Buscar por nombre de usuario..."
                  value={extSearch}
                  onChange={(e) => setExtSearch(e.target.value)}
                  autoFocus
                />
                {extSearch && (
                  <button
                    onClick={() => setExtSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(240,240,248,0.4)",
                      display: "flex",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {extLoading && (
                <div className="cc-ext-loading">
                  <Loader2
                    size={18}
                    style={{
                      animation: "spin 0.8s linear infinite",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  />
                  <span>Buscando...</span>
                </div>
              )}

              {!extLoading &&
                extSearch.length >= 2 &&
                extResults.length === 0 && (
                  <div className="cc-agenda-empty">
                    <span>🔍</span>
                    <p>No se encontraron usuarios</p>
                  </div>
                )}

              {!extLoading && extResults.length > 0 && (
                <div className="cc-ext-results">
                  {extResults.map((u) => {
                    const s = sourceConfig(u.source);
                    const isSel = selectedIds.has(u._id);
                    return (
                      <div
                        key={u._id}
                        className={`cc-ext-result ${isSel ? "cc-ext-result--selected" : ""}`}
                        onClick={() => toggleMember(u)}
                      >
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <UserAvatar
                            src={u.avatarUrl}
                            alt={u.username}
                            size={36}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: -2,
                              right: -2,
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: s.color,
                              border: "2px solid #0e0e1c",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.42rem",
                                fontWeight: 800,
                                color: "#fff",
                              }}
                            >
                              {s.abbr}
                            </span>
                          </div>
                        </div>
                        <div className="cc-ext-result__info">
                          <span className="cc-ext-result__name">
                            @{u.username}
                          </span>
                          <span
                            className="cc-ext-result__source"
                            style={{ color: s.color }}
                          >
                            {s.label}
                          </span>
                        </div>
                        <div
                          className={`cc-ext-result__check ${isSel ? "cc-ext-result__check--on" : ""}`}
                        >
                          {isSel ? (
                            <Check size={12} strokeWidth={3} />
                          ) : (
                            <UserPlus size={12} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!extSearch && (
                <div className="cc-ext-placeholder">
                  <Search
                    size={28}
                    style={{ color: "rgba(255,255,255,0.1)" }}
                  />
                  <p>Escribí al menos 2 caracteres para buscar</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
