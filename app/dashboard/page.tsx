// dashboard/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Swords, User, Pencil, Mail, ShieldCheck, Camera, Trash2, Save,
  Crown, AlertTriangle, X, ChevronRight, ArrowLeft,
  Check, Link, Instagram, Globe, KeyRound, Bell, BellOff,
  RefreshCw, FolderOpen, Info, Lock, Loader2, CheckCircle2,
  XCircle, BadgeAlert, House, LayoutDashboard,
} from "lucide-react";
import "../styles/dashboard.css";

// ── Tipos ───────────────────────────────────────────────────
interface SocialLinks { instagram: string; tiktok: string; facebook: string; }

interface DashboardUser {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio: string;
  blogUrl: string;
  role: string;
  rank: string;
  subscription: { type: string; expiresAt?: string; active: boolean };
  socialLinks: SocialLinks;
  followersCount: number;
  followingCount: number;
  victorias: number;
  derrotas: number;
  empates: number;
  googleLinked: boolean;
  createdAt: string;
  warningCount: number;
  isBanned: boolean;
  isSuspended: boolean;
  moderationHistory?: any[];
  pendingTermsAcceptance?: boolean;
}

interface Toast { id: number; type: "success" | "error" | "info"; message: string; icon: React.ReactNode; }

// ── API base ────────────────────────────────────────────────
const API = "https://nakama-backend-render.onrender.com";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("nakama_token") : null;
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> || {}),
    },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Error de servidor");
  return data;
}

// ── Badge de rol ─────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  "user": "Usuario", "user-pro": "Pro", "user-premium": "Premium",
  "moderator": "Moderador", "admin": "Admin", "superadmin": "Super Admin",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`dashboard-role-badge badge-${role}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

// ── Spinner inline ────────────────────────────────────────────
function Spinner() {
  return <Loader2 size={14} style={{ animation: "spin 0.6s linear infinite", flexShrink: 0 }} />;
}

// ── Toast ─────────────────────────────────────────────────────
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.icon}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const [user, setUser]           = useState<DashboardUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "security">("profile");
  const [toasts, setToasts]       = useState<Toast[]>([]);

  const [showAvatarModal,   setShowAvatarModal]   = useState(false);
  const [showEmailModal,    setShowEmailModal]     = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal,   setShowDeleteModal]   = useState(false);

  const addToast = useCallback((message: string, type: Toast["type"] = "info", icon: React.ReactNode = <Bell size={14} />) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    apiFetch("/dashboard/me")
      .then(d => setUser(d.user))
      .catch(e => addToast(e.message, "error", <XCircle size={14} />))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = user && ["admin", "superadmin"].includes(user.role);

  if (loading) return <DashboardSkeleton />;
  if (!user) return (
    <div className="dashboard-root">
      <div className="dashboard-container">
        <p className="text-muted text-center mt-16">No se pudo cargar tu perfil.</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-root">
      <div className="dashboard-container">

        {/* ── Header ── */}
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <span className="dashboard-logo">
              <Swords size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
              NAKAMA
            </span>
            <a
              href="/"
              className="btn btn-ghost btn-sm"
              title="Ir al inicio"
              style={{ padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <House size={14} />
              <span style={{ fontSize: "0.75rem" }}>Inicio</span>
            </a>
            <span className="dashboard-breadcrumb">/ mi-panel</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user.role === "superadmin" && (
              <a
                href="/superadmin"
                className="btn btn-sm"
                title="Panel Superadmin"
                style={{
                  padding: "6px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg,rgba(230,57,70,0.2),rgba(255,209,102,0.15))",
                  border: "1px solid rgba(255,209,102,0.3)",
                  color: "var(--gold)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-display)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                  textTransform: "uppercase",
                }}
              >
                <LayoutDashboard size={13} />
                Superadmin
              </a>
            )}
            <RoleBadge role={user.role} />
          </div>
        </header>

        {/* ── Grid ── */}
        <div className="dashboard-grid">

          {/* ── Columna izquierda ── */}
          <aside className="profile-panel">
            <div className="dash-card">
              <div className="avatar-section">
                <div className="avatar-wrapper">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      <User size={40} strokeWidth={1.2} />
                    </div>
                  )}
                  <button
                    className="avatar-edit-btn"
                    onClick={() => setShowAvatarModal(true)}
                    title="Cambiar avatar"
                  >
                    <Pencil size={13} />
                  </button>
                </div>

                <div className="profile-name">{user.displayName || user.username}</div>
                <div className="profile-username">@{user.username}</div>
                <div className="profile-rank">{user.rank}</div>

                {user.avatarUrl && (
                  <div className="avatar-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowAvatarModal(true)}>
                      <Camera size={13} /> Cambiar
                    </button>
                    <DeleteAvatarButton
                      userId={user._id}
                      onSuccess={() => {
                        setUser(u => u ? { ...u, avatarUrl: "" } : u);
                        addToast("Avatar eliminado", "info", <Trash2 size={14} />);
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-value">{user.followersCount.toLocaleString()}</span>
                  <span className="stat-label">Seguidores</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{user.followingCount.toLocaleString()}</span>
                  <span className="stat-label">Siguiendo</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{user.victorias}</span>
                  <span className="stat-label">Victorias</span>
                </div>
              </div>
            </div>

            {/* Info cuenta */}
            <div className="dash-card">
              <div className="dash-card-header">
                <Info size={14} className="dash-card-icon" />
                <span className="dash-card-title">Cuenta</span>
              </div>
              <div className="dash-card-body" style={{ padding: "16px 20px" }}>
                <InfoRow label="Miembro desde" value={new Date(user.createdAt).toLocaleDateString("es-AR", { year: "numeric", month: "long" })} />
                <InfoRow label="Suscripción" value={user.subscription.type.toUpperCase()} colored />
                <InfoRow label="Google vinculado" value={user.googleLinked ? "Sí" : "No"} />
                {user.isBanned    && <InfoRow label="Estado" value="BANEADO"    danger />}
                {user.isSuspended && <InfoRow label="Estado" value="SUSPENDIDO" danger />}
              </div>
            </div>

            {/* Admin extra */}
            {isAdmin && (
              <div className="admin-panel dash-card">
                <div className="dash-card-header">
                  <Crown size={14} className="dash-card-icon" />
                  <span className="dash-card-title" style={{ color: "var(--gold)" }}>Panel Admin</span>
                </div>
                <div className="admin-stat-grid">
                  <div className="admin-stat">
                    <div className="admin-stat-value">{user.warningCount}</div>
                    <div className="admin-stat-label">Advertencias emitidas</div>
                  </div>
                  <div className="admin-stat">
                    <div className="admin-stat-value">{user.moderationHistory?.length ?? 0}</div>
                    <div className="admin-stat-label">Acciones mod.</div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* ── Columna derecha ── */}
          <div className="dashboard-right">

            {/* Tabs */}
            <div className="dash-tabs">
              {[
                { key: "profile",  label: "Perfil",    Icon: Pencil      },
                { key: "account",  label: "Cuenta",    Icon: Mail        },
                { key: "security", label: "Seguridad", Icon: ShieldCheck },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  className={`dash-tab ${activeTab === key ? "active" : ""}`}
                  onClick={() => setActiveTab(key as any)}
                >
                  {activeTab === key && <span className="tab-dot" />}
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "profile" && (
              <ProfileTab
                user={user}
                onUpdate={u => { setUser(u); addToast("Perfil actualizado", "success", <CheckCircle2 size={14} />); }}
                addToast={addToast}
              />
            )}

            {activeTab === "account" && (
              <AccountTab
                user={user}
                onEmailOpen={() => setShowEmailModal(true)}
                onUsernameUpdate={un => {
                  setUser(u => u ? { ...u, username: un } : u);
                  addToast("Username actualizado", "success", <CheckCircle2 size={14} />);
                }}
                addToast={addToast}
              />
            )}

            {activeTab === "security" && (
              <SecurityTab
                user={user}
                onPasswordOpen={() => setShowPasswordModal(true)}
                onDeleteOpen={() => setShowDeleteModal(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Modales ── */}
      {showAvatarModal && (
        <AvatarModal
          onClose={() => setShowAvatarModal(false)}
          onSuccess={url => {
            setUser(u => u ? { ...u, avatarUrl: url } : u);
            addToast("Avatar actualizado", "success", <Camera size={14} />);
            setShowAvatarModal(false);
          }}
          addToast={addToast}
        />
      )}
      {showEmailModal && (
        <EmailModal
          onClose={() => setShowEmailModal(false)}
          onSuccess={email => {
            setUser(u => u ? { ...u, email } : u);
            addToast("Email actualizado", "success", <Mail size={14} />);
            setShowEmailModal(false);
          }}
          addToast={addToast}
          currentEmail={user.email}
        />
      )}
      {showPasswordModal && (
        <PasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            addToast("Contraseña actualizada", "success", <Lock size={14} />);
            setShowPasswordModal(false);
          }}
          addToast={addToast}
        />
      )}
      {showDeleteModal && (
        <DeleteModal onClose={() => setShowDeleteModal(false)} username={user.username} />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ════════════════════════════════════════════════════════════

function InfoRow({ label, value, colored = false, danger = false }: {
  label: string; value: string; colored?: boolean; danger?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", fontWeight: 600, color: danger ? "var(--red)" : colored ? "var(--cyan)" : "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
        {danger && <BadgeAlert size={12} />}
        {value}
      </span>
    </div>
  );
}

// ── Botón eliminar avatar ────────────────────────────────────
function DeleteAvatarButton({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!confirm("¿Eliminar tu avatar?")) return;
    setLoading(true);
    try { await apiFetch("/dashboard/avatar", { method: "DELETE" }); onSuccess(); }
    catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };
  return (
    <button className="btn btn-ghost btn-sm" onClick={handle} disabled={loading}>
      {loading ? <Spinner /> : <Trash2 size={13} />} Eliminar
    </button>
  );
}

// ── Tab: Perfil ──────────────────────────────────────────────
function ProfileTab({ user, onUpdate, addToast }: {
  user: DashboardUser;
  onUpdate: (u: DashboardUser) => void;
  addToast: (m: string, t?: any, i?: React.ReactNode) => void;
}) {
  const [form, setForm] = useState({
    displayName: user.displayName || "",
    bio:         user.bio         || "",
    blogUrl:     user.blogUrl     || "",
    instagram:   user.socialLinks?.instagram || "",
    tiktok:      user.socialLinks?.tiktok    || "",
    facebook:    user.socialLinks?.facebook  || "",
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const d = await apiFetch("/dashboard/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: form.displayName,
          bio:         form.bio,
          blogUrl:     form.blogUrl,
          socialLinks: { instagram: form.instagram, tiktok: form.tiktok, facebook: form.facebook },
        }),
      });
      onUpdate(d.user);
      setDirty(false);
    } catch (e: any) { addToast(e.message, "error", <XCircle size={14} />); }
    finally { setSaving(false); }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <Pencil size={14} className="dash-card-icon" />
        <span className="dash-card-title">Editar perfil público</span>
      </div>
      <div className="dash-card-body">

        <div className="form-group">
          <label className="form-label">Nombre de display</label>
          <input className="form-input" value={form.displayName} onChange={e => set("displayName", e.target.value)} maxLength={50} placeholder="Tu nombre visible" />
          <p className="form-hint">{form.displayName.length}/50 caracteres</p>
        </div>

        <div className="form-group">
          <label className="form-label">Bio</label>
          <textarea className="form-textarea" rows={3} value={form.bio} onChange={e => set("bio", e.target.value)} maxLength={300} placeholder="Contá algo sobre vos..." />
          <p className="form-hint">{form.bio.length}/300 caracteres</p>
        </div>

        <div className="form-group">
          <label className="form-label">Blog / Sitio web</label>
          <input className="form-input" value={form.blogUrl} onChange={e => set("blogUrl", e.target.value)} placeholder="https://tu-sitio.com" type="url" />
        </div>

        <div className="divider" />
        <p className="form-label" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Link size={11} /> Redes sociales
        </p>

        <div className="form-group">
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Instagram size={11} /> Instagram
          </label>
          <input className="form-input" value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@usuario" />
        </div>

        <div className="form-group">
          <label className="form-label">TikTok</label>
          <input className="form-input" value={form.tiktok} onChange={e => set("tiktok", e.target.value)} placeholder="@usuario" />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Globe size={11} /> Facebook
          </label>
          <input className="form-input" value={form.facebook} onChange={e => set("facebook", e.target.value)} placeholder="usuario o URL" />
        </div>

        <div className="divider" />
        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <><Spinner /> Guardando…</> : <><Save size={14} /> Guardar cambios</>}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Cuenta ──────────────────────────────────────────────
function AccountTab({ user, onEmailOpen, onUsernameUpdate, addToast }: {
  user: DashboardUser;
  onEmailOpen: () => void;
  onUsernameUpdate: (u: string) => void;
  addToast: any;
}) {
  const [newUsername, setNewUsername] = useState(user.username);
  const [saving, setSaving]           = useState(false);
  const dirty = newUsername.trim() !== user.username;

  const handleUsername = async () => {
    setSaving(true);
    try {
      const d = await apiFetch("/dashboard/username", { method: "PATCH", body: JSON.stringify({ username: newUsername.trim() }) });
      onUsernameUpdate(d.username);
    } catch (e: any) { addToast(e.message, "error", <XCircle size={14} />); }
    finally { setSaving(false); }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <Mail size={14} className="dash-card-icon" />
        <span className="dash-card-title">Datos de cuenta</span>
      </div>
      <div className="dash-card-body">

        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} maxLength={30} />
          <p className="form-hint">Solo letras, números, puntos y guiones bajos. Mín. 3 caracteres.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleUsername} disabled={saving || !dirty} style={{ marginBottom: 24 }}>
          {saving ? <><Spinner /> Guardando…</> : <><Check size={13} /> Actualizar username</>}
        </button>

        <div className="divider" />

        <div className="form-group">
          <label className="form-label">Email actual</label>
          <input className="form-input" value={user.email} disabled />
          <p className="form-hint">Para cambiar tu email necesitás verificar tu identidad con un código.</p>
        </div>
        <button className="btn btn-secondary btn-full" onClick={onEmailOpen}>
          <Mail size={14} /> Cambiar email
        </button>

        <div className="divider" />

        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 16 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Plan actual</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, color: user.subscription.type === "free" ? "var(--text-secondary)" : "var(--gold)" }}>
            {user.subscription.type.toUpperCase()}
          </p>
          {user.subscription.expiresAt && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Vence: {new Date(user.subscription.expiresAt).toLocaleDateString("es-AR")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Seguridad ───────────────────────────────────────────
function SecurityTab({ user, onPasswordOpen, onDeleteOpen }: {
  user: DashboardUser;
  onPasswordOpen: () => void;
  onDeleteOpen: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="dash-card">
        <div className="dash-card-header">
          <Lock size={14} className="dash-card-icon" />
          <span className="dash-card-title">Contraseña</span>
        </div>
        <div className="dash-card-body">
          {user.googleLinked && (
            <div style={{ background: "var(--cyan-dim)", border: "1px solid var(--border-cyan)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 16, fontSize: "0.82rem", color: "var(--cyan)", display: "flex", alignItems: "center", gap: 8 }}>
              <Link size={13} /> Tu cuenta está vinculada con Google. Podés establecer una contraseña adicional.
            </div>
          )}
          <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.6 }}>
            Cambiá tu contraseña periódicamente para mantener tu cuenta segura. Al hacerlo, se cerrarán todas tus otras sesiones activas.
          </p>
          <button className="btn btn-secondary btn-full" onClick={onPasswordOpen}>
            <KeyRound size={14} /> Cambiar contraseña
          </button>
        </div>
      </div>

      <div className="danger-zone dash-card">
        <div className="dash-card-header">
          <AlertTriangle size={14} className="dash-card-icon" />
          <span className="dash-card-title">Zona de peligro</span>
        </div>
        <div className="danger-item">
          <div className="danger-item-text">
            <h4>Eliminar cuenta</h4>
            <p>Esta acción es permanente e irreversible. Todos tus datos, publicaciones y contenido serán borrados para siempre.</p>
          </div>
          <button className="btn btn-danger btn-sm" style={{ flexShrink: 0 }} onClick={onDeleteOpen}>
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MODALES
// ════════════════════════════════════════════════════════════

// ── Modal: Avatar ────────────────────────────────────────────
function AvatarModal({ onClose, onSuccess, addToast }: {
  onClose: () => void;
  onSuccess: (url: string) => void;
  addToast: any;
}) {
  const [preview, setPreview]     = useState<string | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("nakama_token");
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(`${API}/dashboard/avatar`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      onSuccess(d.avatarUrl);
    } catch (e: any) { addToast(e.message, "error", <XCircle size={14} />); }
    finally { setUploading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title"><Camera size={16} /> Cambiar avatar</span>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--red)" }} />
            ) : (
              <div style={{ width: 120, height: 120, borderRadius: "50%", background: "var(--bg-elevated)", border: "3px dashed var(--border-red)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                <Camera size={32} strokeWidth={1.2} color="var(--text-muted)" />
              </div>
            )}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="avatar-file-input" ref={inputRef} onChange={handleFile} />
          <button className="btn btn-secondary btn-full" onClick={() => inputRef.current?.click()}>
            {preview ? <><RefreshCw size={13} /> Cambiar imagen</> : <><FolderOpen size={13} /> Seleccionar imagen</>}
          </button>
          <p className="form-hint text-center mt-8">JPG, PNG, WebP o GIF. Máx. 10 MB.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <><Spinner /> Subiendo…</> : <><Save size={14} /> Guardar avatar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Cambiar email ─────────────────────────────────────
function EmailModal({ onClose, onSuccess, addToast, currentEmail }: {
  onClose: () => void;
  onSuccess: (email: string) => void;
  addToast: any;
  currentEmail: string;
}) {
  const [step, setStep]         = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode]         = useState(["", "", "", "", "", ""]);
  const [loading, setLoading]   = useState(false);
  const codeRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  const handleRequest = async () => {
    setLoading(true);
    try {
      await apiFetch("/dashboard/email/request", { method: "POST", body: JSON.stringify({ newEmail }) });
      addToast(`Código enviado a ${currentEmail}`, "info", <Mail size={14} />);
      setStep(2);
    } catch (e: any) { addToast(e.message, "error", <XCircle size={14} />); }
    finally { setLoading(false); }
  };

  const handleDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) codeRefs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs[i - 1].current?.focus();
  };

  const handleConfirm = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) return addToast("Ingresá los 6 dígitos.", "error", <AlertTriangle size={14} />);
    setLoading(true);
    try {
      await apiFetch("/dashboard/email/confirm", { method: "POST", body: JSON.stringify({ code: fullCode }) });
      onSuccess(newEmail.toLowerCase());
    } catch (e: any) { addToast(e.message, "error", <XCircle size={14} />); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title"><Mail size={16} /> Cambiar email</span>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body">

          <div className="email-stepper">
            <div className="step-item">
              <span className={`step-num ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}>
                {step > 1 ? <Check size={11} /> : "1"}
              </span>
              <span className={`step-label ${step === 1 ? "active" : ""}`}>Nuevo email</span>
            </div>
            <div className="step-line" />
            <div className="step-item">
              <span className={`step-num ${step === 2 ? "active" : ""}`}>2</span>
              <span className={`step-label ${step === 2 ? "active" : ""}`}>Verificación</span>
            </div>
          </div>

          {step === 1 && (
            <>
              <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.6 }}>
                Te enviaremos un código de 6 dígitos a tu <strong style={{ color: "var(--text-secondary)" }}>email actual</strong> ({currentEmail}) para verificar que sos vos.
              </p>
              <div className="form-group">
                <label className="form-label">Nuevo email</label>
                <input className="form-input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="nuevo@email.com" />
              </div>
              <button className="btn btn-primary btn-full" onClick={handleRequest} disabled={loading || !newEmail}>
                {loading
                  ? <><Spinner /> Enviando…</>
                  : <>Enviar código de verificación <ChevronRight size={14} /></>}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.6 }}>
                Ingresá el código de 6 dígitos enviado a <strong style={{ color: "var(--text-secondary)" }}>{currentEmail}</strong>
              </p>
              <div className="code-inputs">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={codeRefs[i]}
                    className="code-input-digit"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                  />
                ))}
              </div>
              <button className="btn btn-primary btn-full" onClick={handleConfirm} disabled={loading}>
                {loading ? <><Spinner /> Verificando…</> : <><Check size={14} /> Confirmar cambio</>}
              </button>
              <button className="btn btn-ghost btn-full mt-8" onClick={() => { setStep(1); setCode(["","","","","",""]); }}>
                <ArrowLeft size={13} /> Volver
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal: Cambiar contraseña ────────────────────────────────
function PasswordModal({ onClose, onSuccess, addToast }: {
  onClose: () => void;
  onSuccess: () => void;
  addToast: any;
}) {
  const [form, setForm]       = useState({ current: "", newPass: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSave = async () => {
    setError("");
    if (form.newPass !== form.confirm) return setError("Las contraseñas no coinciden.");
    if (form.newPass.length < 8)       return setError("La nueva contraseña debe tener al menos 8 caracteres.");
    setLoading(true);
    try {
      await apiFetch("/dashboard/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPass }),
      });
      onSuccess();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title"><Lock size={16} /> Cambiar contraseña</span>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Contraseña actual</label>
            <input className="form-input" type="password" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input className="form-input" type="password" value={form.newPass} onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))} />
            <p className="form-hint">Mínimo 8 caracteres</p>
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar nueva contraseña</label>
            <input className="form-input" type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
          {error && (
            <p className="form-error"><AlertTriangle size={12} /> {error}</p>
          )}
          <div style={{ background: "var(--gold-dim)", border: "1px solid rgba(255,209,102,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "0.78rem", color: "var(--gold)", marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={13} /> Cambiar la contraseña cerrará todas tus otras sesiones activas.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || !form.current || !form.newPass || !form.confirm}>
            {loading ? <><Spinner /> Guardando…</> : <><Save size={14} /> Actualizar contraseña</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Eliminar cuenta ───────────────────────────────────
function DeleteModal({ onClose, username }: { onClose: () => void; username: string }) {
  const [password, setPassword]     = useState("");
  const [keepNotifs, setKeepNotifs] = useState(true);
  const [confirm, setConfirm]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const canDelete = confirm === username && password.length >= 8;

  const handleDelete = async () => {
    setError("");
    setLoading(true);
    try {
      await apiFetch("/dashboard/account", {
        method: "DELETE",
        body: JSON.stringify({ password, keepNotifications: keepNotifs }),
      });
      localStorage.removeItem("nakama_token");
      window.location.href = "/";
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-danger">
        <div className="modal-header">
          <span className="modal-title" style={{ color: "var(--red)" }}>
            <Trash2 size={16} /> Eliminar cuenta
          </span>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body">

          <div className="delete-warning">
            <p className="delete-warning-title">
              <AlertTriangle size={13} /> Esto eliminará permanentemente:
            </p>
            <ul className="delete-warning-list">
              <li>Tu perfil y todos tus datos personales</li>
              <li>Todas tus publicaciones y comentarios</li>
              <li>Tu historial de batallas y estadísticas</li>
              <li>Tus mensajes y conversaciones</li>
              <li>Tu avatar y videos de perfil</li>
            </ul>
          </div>

          <div className="notif-toggle" onClick={() => setKeepNotifs(k => !k)}>
            <div className={`toggle-switch ${keepNotifs ? "on" : ""}`}>
              <div className="toggle-knob" />
            </div>
            <div className="notif-toggle-text">
              <h5 style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {keepNotifs ? <Bell size={12} /> : <BellOff size={12} />}
                Conservar mi email para futuras novedades
              </h5>
              <p>Podemos avisarte sobre nuevas funciones, eventos especiales o cuando tengamos algo importante que compartir.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tu contraseña</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ingresá tu contraseña" />
          </div>

          <div className="form-group">
            <label className="form-label">
              Escribí <strong style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>@{username}</strong> para confirmar
            </label>
            <input
              className="form-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder={`@${username}`}
              style={{ borderColor: confirm && confirm !== username ? "var(--red)" : undefined }}
            />
          </div>

          {error && <p className="form-error"><AlertTriangle size={12} /> {error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={!canDelete || loading}>
            {loading ? <><Spinner /> Eliminando…</> : <><Trash2 size={13} /> Eliminar mi cuenta</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="dashboard-root">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 70, height: 24, borderRadius: 99 }} />
        </div>
        <div className="dashboard-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="skeleton" style={{ height: 280, borderRadius: 20 }} />
            <div className="skeleton" style={{ height: 140, borderRadius: 20 }} />
          </div>
          <div>
            <div className="skeleton" style={{ height: 52, borderRadius: 14, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />
          </div>
        </div>
      </div>
    </div>
  );
}