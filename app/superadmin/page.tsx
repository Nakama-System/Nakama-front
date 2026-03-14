"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import "../styles/superadmin.css";
import MovieUploadAdmin from "../components/PeliUpload/page";
import {
  CommunitiesView,
  BattlesView,
  ReportsView,
  BlocksView,
  FlagsView,
} from "../moderation/page";

const API_BASE = "http://localhost:5000/nx-control";

// ─── "pelis" agregado correctamente al union type ────────
type View =
  | "stats" | "users" | "communities" | "battles" | "reports"
  | "blocks" | "flags" | "pelis" | "avisos" | "terms" | "privacy";

interface Stats {
  totalUsers: number; newUsersToday: number; totalCommunities: number;
  onlineUsers: number; frozenUsers: number; bannedUsers: number;
  pendingReports: number; pendingFlags: number; activeBattles: number;
  totalBlocks: number; newCommunitiesToday?: number;
}
interface UserRow {
  _id: string; username: string; email: string; role: string;
  isOnline: boolean; avatarUrl?: string; isSuspended: boolean; isBanned: boolean;
  createdAt: string; followersCount: number; followingCount: number;
  warningCount: number; subscription?: { type: string };
}
interface AuthUser { id: string; email: string; username: string; avatarUrl?: string; }
interface Toast { id: number; msg: string; type: "success" | "error" | "info"; }
interface ConfirmModal { title: string; desc: string; onConfirm: () => void; }

// ─── Avatar ───────────────────────────────────────────────
function Avatar({ src, name, size = 32 }: { src?: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div className="dash__table-avatar" style={{ width: size, height: size, flexShrink: 0 }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} />
        : name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

// ─── useApi ───────────────────────────────────────────────
function useApi(token: string) {
  return useCallback(
    async (path: string, method = "GET", body?: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (!token) return { ok: false, message: "Sin token" };
      try {
        const res = await fetch(`${API_BASE}${path}`, {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: body ? JSON.stringify(body) : undefined,
        });
        return res.json() as Promise<Record<string, unknown>>;
      } catch { return { ok: false, message: "Error de red" }; }
    },
    [token],
  );
}
type ApiCall = ReturnType<typeof useApi>;

// ════════════════════════════════════════════════════════════
// STATS
// ════════════════════════════════════════════════════════════
function StatsView({ api, onNavigate }: { api: ApiCall; onNavigate: (v: View) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api("/stats").then((j) => {
      if (j.ok) setStats(j.stats as Stats);
      setLoading(false);
    });
  }, [api]);

  if (loading) return <div className="dash__spinner" />;

  const cards: {
    label: string; value: number; accent: string;
    icon: string; view?: View; badge?: number;
  }[] = stats ? [
    { label: "Total Usuarios",   value: stats.totalUsers,       accent: "#e63946", icon: "👥", view: "users",       badge: stats.newUsersToday },
    { label: "Online Ahora",     value: stats.onlineUsers,      accent: "#64dc78", icon: "◉",  view: "users" },
    { label: "Comunidades",      value: stats.totalCommunities, accent: "#ff6b35", icon: "⬡",  view: "communities", badge: stats.newCommunitiesToday },
    { label: "Batallas Activas", value: stats.activeBattles,    accent: "#f39c12", icon: "⚔",  view: "battles" },
    { label: "Reportes Pend.",   value: stats.pendingReports,   accent: "#e67e22", icon: "⚑",  view: "reports" },
    { label: "Flags Pend.",      value: stats.pendingFlags,     accent: "#9b59b6", icon: "⚐",  view: "flags" },
    { label: "Películas",        value: 0,                      accent: "#280d93", icon: "🎬", view: "pelis" },
    { label: "Suspendidos",      value: stats.frozenUsers,      accent: "#a8daff", icon: "⏸",  view: "users" },
    { label: "Baneados",         value: stats.bannedUsers,      accent: "#e63946", icon: "✕",  view: "users" },
    { label: "Bloqueos Totales", value: stats.totalBlocks,      accent: "#666",    icon: "⊘",  view: "blocks" },
    { label: "Nuevos Hoy",       value: stats.newUsersToday,    accent: "#a8daff", icon: "✨", view: "users" },
  ] : [];

  return (
    <div className="dash__stats">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className={`dash__stat-card${c.view ? " dash__stat-card--link" : ""}`}
          style={{ "--accent": c.accent, animationDelay: `${i * 0.06}s` } as React.CSSProperties}
          onClick={() => c.view && onNavigate(c.view)}
          role={c.view ? "button" : undefined}
          tabIndex={c.view ? 0 : undefined}
          onKeyDown={(e) => { if (c.view && (e.key === "Enter" || e.key === " ")) onNavigate(c.view); }}
        >
          <div className="dash__stat-label">{c.label}</div>
          <div className="dash__stat-value">{(c.value ?? 0).toLocaleString()}</div>
          {(c.badge ?? 0) > 0 && <div className="dash__stat-badge">+{c.badge} hoy</div>}
          <span className="dash__stat-icon">{c.icon}</span>
          {c.view && <span className="dash__stat-arrow">→</span>}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// USERS VIEW
// ════════════════════════════════════════════════════════════
function UsersView({
  api, toast, confirm,
}: {
  api: ApiCall;
  toast: (m: string, t?: "success" | "error" | "info") => void;
  confirm: (c: ConfirmModal) => void;
}) {
  const [users, setUsers]               = useState<UserRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [dq, setDq]                     = useState("");
  const [roleFilter, setRoleFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]                 = useState(1);
  const [pages, setPages]               = useState(1);
  const [total, setTotal]               = useState(0);
  const [detail, setDetail]             = useState<UserRow | null>(null);
  const [notifTarget, setNotifTarget]   = useState<UserRow | null>(null);
  const [notifMsg, setNotifMsg]         = useState("");
  const [warnTarget, setWarnTarget]     = useState<UserRow | null>(null);
  const [warnReason, setWarnReason]     = useState("");
  const [roleTarget, setRoleTarget]     = useState<UserRow | null>(null);
  const [roleNew, setRoleNew]           = useState("");
  const [freezeTarget, setFreezeTarget] = useState<UserRow | null>(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [freezeUntil, setFreezeUntil]   = useState("");
  const [banTarget, setBanTarget]       = useState<UserRow | null>(null);
  const [banReason, setBanReason]       = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDq(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (dq) params.set("search", dq);
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);
    const j = await api(`/users?${params.toString()}`);
    if (j.ok) {
      setUsers(j.data as UserRow[]);
      const p = j.pagination as { pages: number; total: number };
      setPages(p.pages); setTotal(p.total);
    } else if ((j.message as string) !== "Sin token") {
      toast((j.message as string) || "Error", "error");
    }
    setLoading(false);
  }, [api, page, dq, roleFilter, statusFilter, toast]);

  useEffect(() => { void load(); }, [load]);

  const action = async (path: string, method: string, body?: Record<string, unknown>) => {
    const j = await api(path, method, body);
    if (j.ok) { toast("✓ Acción realizada", "success"); void load(); }
    else toast((j.message as string) || "Error", "error");
    return j;
  };

  const roleBadge = (r: string) => {
    const map: Record<string, string> = {
      superadmin: "superadmin", admin: "admin", moderator: "admin",
      "user-premium": "superadmin", "user-pro": "frozen", user: "user",
    };
    return <span className={`dash__badge dash__badge--${map[r] ?? "user"}`}>{r}</span>;
  };

  const pageRange = (): number[] => {
    const r: number[] = [];
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) r.push(i);
    return r;
  };

  return (
    <div className="dash__panel">
      <div className="dash__panel-header">
        <span className="dash__panel-title">Usuarios <span>({total})</span></span>
        <div className="dash__panel-controls">
          <div className="dash__search">
            <svg className="dash__search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input className="dash__search-input" placeholder="Buscar usuario o email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="dash__role-select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">Todos los roles</option>
            {["user", "user-pro", "user-premium", "moderator", "admin", "superadmin"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select className="dash__role-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option value="online">Online</option>
            <option value="banned">Baneados</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>
      </div>

      {loading ? <div className="dash__spinner" /> : users.length === 0 ? (
        <div className="dash__empty">
          <span className="dash__empty-icon">⊹</span>
          <p className="dash__empty-text">// Sin usuarios</p>
        </div>
      ) : (
        <>
          <div className="dash__table-wrap">
            <table className="dash__table">
              <thead>
                <tr>
                  <th>Usuario</th><th>Rol</th><th>Estado</th><th>Sub</th>
                  <th>⚠</th><th>Seguidores</th><th>Registro</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="dash__table-user">
                        <div style={{ position: "relative" }}>
                          <Avatar src={u.avatarUrl} name={u.username} size={32} />
                          {u.isOnline && (
                            <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "#64dc78", border: "2px solid #0d0d1a" }} />
                          )}
                        </div>
                        <div>
                          <div className="dash__table-name">{u.username}</div>
                          <div className="dash__table-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{roleBadge(u.role)}</td>
                    <td>
                      {u.isBanned
                        ? <span className="dash__badge dash__badge--banned">Baneado</span>
                        : u.isSuspended
                          ? <span className="dash__badge dash__badge--frozen">Suspendido</span>
                          : u.isOnline
                            ? <span className="dash__badge dash__badge--online">Online</span>
                            : <span className="dash__badge dash__badge--offline">Offline</span>}
                    </td>
                    <td><span className="dash__badge dash__badge--user">{u.subscription?.type ?? "free"}</span></td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: ".72rem", color: (u.warningCount ?? 0) > 0 ? "#f39c12" : "var(--nk-muted)" }}>
                      {u.warningCount ?? 0}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: ".72rem", color: "var(--nk-muted)" }}>
                      {(u.followersCount ?? 0).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", color: "var(--nk-muted)", whiteSpace: "nowrap" }}>
                      {new Date(u.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td>
                      <div className="dash__actions">
                        <button className="dash__action-btn dash__action-btn--view" onClick={() => setDetail(u)}>Ver</button>
                        {u.isSuspended
                          ? <button className="dash__action-btn dash__action-btn--unfreeze" onClick={() => { void action(`/users/${u._id}/unfreeze`, "POST"); }}>Reactivar</button>
                          : <button className="dash__action-btn dash__action-btn--freeze" onClick={() => { setFreezeTarget(u); setFreezeReason(""); setFreezeUntil(""); }}>Suspender</button>}
                        {u.isBanned
                          ? <button className="dash__action-btn dash__action-btn--unban" onClick={() => { void action(`/users/${u._id}/unban`, "POST"); }}>Desbanear</button>
                          : <button className="dash__action-btn dash__action-btn--ban" onClick={() => { setBanTarget(u); setBanReason(""); }}>Banear</button>}
                        <button className="dash__action-btn dash__action-btn--warn" onClick={() => { setWarnTarget(u); setWarnReason(""); }}>Advertir</button>
                        <button className="dash__action-btn dash__action-btn--role" onClick={() => { setRoleTarget(u); setRoleNew(u.role); }}>Rol</button>
                        <button className="dash__action-btn dash__action-btn--notif" onClick={() => { setNotifTarget(u); setNotifMsg(""); }}>Notif</button>
                        <button
                          className="dash__action-btn dash__action-btn--delete"
                          onClick={() => confirm({
                            title: `Eliminar @${u.username}`,
                            desc: "Acción permanente.",
                            onConfirm: () => { void action(`/users/${u._id}`, "DELETE"); },
                          })}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="dash__pagination">
              <button className="dash__page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
              {page > 3 && (
                <>
                  <button className="dash__page-btn" onClick={() => setPage(1)}>1</button>
                  <span className="dash__page-ellipsis">…</span>
                </>
              )}
              {pageRange().map((p) => (
                <button key={p} className={`dash__page-btn${p === page ? " dash__page-btn--active" : ""}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              {page < pages - 2 && (
                <>
                  <span className="dash__page-ellipsis">…</span>
                  <button className="dash__page-btn" onClick={() => setPage(pages)}>{pages}</button>
                </>
              )}
              <button className="dash__page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === pages}>›</button>
              <span className="dash__page-info">{total} usuarios</span>
            </div>
          )}
        </>
      )}

      {/* ── Modales ── */}
      {detail && (
        <div className="dash__modal-overlay" onClick={() => setDetail(null)}>
          <div className="dash__modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h2 className="dash__modal-title">@{detail.username}</h2>
            <div className="dash__detail-grid">
              {(
                [
                  ["Email", detail.email],
                  ["Rol", detail.role],
                  ["Sub", detail.subscription?.type ?? "free"],
                  ["Seguidores", detail.followersCount ?? 0],
                  ["Advertencias", detail.warningCount ?? 0],
                  ["Baneado", detail.isBanned ? "Sí" : "No"],
                  ["Suspendido", detail.isSuspended ? "Sí" : "No"],
                  ["Registro", new Date(detail.createdAt).toLocaleDateString("es-AR")],
                ] as [string, string | number][]
              ).map(([k, v]) => (
                <div key={k} className="dash__detail-cell">
                  <div className="dash__detail-label">{k}</div>
                  <div className="dash__detail-val">{String(v)}</div>
                </div>
              ))}
            </div>
            <div className="dash__modal-actions">
              <button className="dash__modal-cancel" onClick={() => setDetail(null)}>Cerrar</button>
              <button className="dash__modal-confirm" onClick={() => { setNotifTarget(detail); setDetail(null); }}>📨 Notif</button>
            </div>
          </div>
        </div>
      )}

      {banTarget && (
        <div className="dash__modal-overlay" onClick={() => setBanTarget(null)}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dash__modal-title">Banear · @{banTarget.username}</h2>
            <textarea className="dash__notif-area" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Motivo del ban…" style={{ marginBottom: "1.2rem" }} />
            <div className="dash__modal-actions">
              <button className="dash__modal-cancel" onClick={() => setBanTarget(null)}>Cancelar</button>
              <button
                className="dash__modal-confirm"
                style={{ background: "var(--nk-red)", color: "#fff" }}
                onClick={() => { void action(`/users/${banTarget._id}/ban`, "POST", { reason: banReason || "Violación de TOS" }); setBanTarget(null); }}
              >
                🚫 Banear
              </button>
            </div>
          </div>
        </div>
      )}

      {freezeTarget && (
        <div className="dash__modal-overlay" onClick={() => setFreezeTarget(null)}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dash__modal-title">Suspender · @{freezeTarget.username}</h2>
            <textarea className="dash__notif-area" value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} placeholder="Motivo…" />
            <input
              className="dash__notif-area"
              style={{ fontFamily: "var(--font-mono)", fontSize: ".8rem", padding: ".6rem .75rem", marginBottom: "1.2rem", resize: "none" }}
              value={freezeUntil}
              onChange={(e) => setFreezeUntil(e.target.value)}
              placeholder="Fecha fin: 2025-12-31 (vacío = permanente)"
            />
            <div className="dash__modal-actions">
              <button className="dash__modal-cancel" onClick={() => setFreezeTarget(null)}>Cancelar</button>
              <button
                className="dash__modal-confirm"
                onClick={() => {
                  const body: Record<string, unknown> = { reason: freezeReason || "Moderación" };
                  if (freezeUntil.trim()) body.until = freezeUntil;
                  void action(`/users/${freezeTarget._id}/freeze`, "POST", body);
                  setFreezeTarget(null);
                }}
              >
                ❄️ Suspender
              </button>
            </div>
          </div>
        </div>
      )}

      {warnTarget && (
        <div className="dash__modal-overlay" onClick={() => setWarnTarget(null)}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dash__modal-title">Advertir · @{warnTarget.username}</h2>
            <textarea className="dash__notif-area" value={warnReason} onChange={(e) => setWarnReason(e.target.value)} placeholder="Motivo…" style={{ marginBottom: "1.2rem" }} />
            <div className="dash__modal-actions">
              <button className="dash__modal-cancel" onClick={() => setWarnTarget(null)}>Cancelar</button>
              <button className="dash__modal-confirm" onClick={() => { void action(`/users/${warnTarget._id}/warn`, "POST", { reason: warnReason }); setWarnTarget(null); }}>
                ⚠ Advertir
              </button>
            </div>
          </div>
        </div>
      )}

      {roleTarget && (
        <div className="dash__modal-overlay" onClick={() => setRoleTarget(null)}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dash__modal-title">Cambiar Rol · @{roleTarget.username}</h2>
            <select className="dash__role-select" value={roleNew} onChange={(e) => setRoleNew(e.target.value)} style={{ marginBottom: "1.4rem", width: "100%" }}>
              {["user", "user-pro", "user-premium", "moderator", "admin"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="dash__modal-actions">
              <button className="dash__modal-cancel" onClick={() => setRoleTarget(null)}>Cancelar</button>
              <button className="dash__modal-confirm" onClick={() => { void action(`/users/${roleTarget._id}/role`, "PATCH", { role: roleNew }); setRoleTarget(null); }}>
                🎖 Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {notifTarget && (
        <div className="dash__modal-overlay" onClick={() => setNotifTarget(null)}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dash__modal-title">Notif · @{notifTarget.username}</h2>
            <textarea className="dash__notif-area" value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} placeholder="Mensaje…" style={{ marginBottom: "1.2rem" }} />
            <div className="dash__modal-actions">
              <button className="dash__modal-cancel" onClick={() => setNotifTarget(null)}>Cancelar</button>
              <button
                className="dash__modal-confirm"
                onClick={() => {
                  if (!notifMsg.trim()) return;
                  void action(`/users/${notifTarget._id}/notify`, "POST", { message: notifMsg });
                  setNotifTarget(null);
                }}
              >
                📨 Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// AVISOS
// ════════════════════════════════════════════════════════════
function AvisosView({
  api, toast,
}: {
  api: ApiCall;
  toast: (m: string, t?: "success" | "error" | "info") => void;
}) {
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [dq, setDq]                 = useState("");
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [total, setTotal]           = useState(0);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [mode, setMode]             = useState<"select" | "role" | "all">("select");
  const [roleTarget, setRoleTarget] = useState("all");
  const [msgTitle, setMsgTitle]     = useState("");
  const [message, setMessage]       = useState("");
  const [sending, setSending]       = useState(false);
  const [history, setHistory]       = useState<{ id: number; msg: string; targets: string; count: number; ts: string }[]>([]);

  useEffect(() => {
    const t = setTimeout(() => { setDq(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (dq) params.set("search", dq);
    const j = await api(`/users?${params.toString()}`);
    if (j.ok) {
      setUsers(j.data as UserRow[]);
      const p = j.pagination as { pages: number; total: number };
      setPages(p.pages); setTotal(p.total);
    }
    setLoading(false);
  }, [api, page, dq]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const toggleUser = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () => {
    const ids = users.map((u) => u._id);
    const allSel = ids.every((id) => selected.has(id));
    setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => allSel ? n.delete(id) : n.add(id)); return n; });
  };

  const clearSel = () => setSelected(new Set());

  const send = async () => {
    if (!message.trim()) { toast("Escribí un mensaje", "error"); return; }
    if (mode === "select" && selected.size === 0) { toast("Seleccioná al menos un usuario", "error"); return; }

    const endpoints: Record<"select" | "role" | "all", string> = {
      select: "/users/notify-batch",
      role:   "/users/notify-role",
      all:    "/users/notify-all",
    };
    const body: Record<string, unknown> = { message, title: msgTitle || undefined };
    if (mode === "select") body.userIds = Array.from(selected);
    if (mode === "role") body.role = roleTarget;

    const targetLabel = mode === "all" ? "Todos" : mode === "role" ? roleTarget : `${selected.size} usuario${selected.size > 1 ? "s" : ""}`;
    const count = mode === "select" ? selected.size : total;

    setSending(true);
    const j = await api(endpoints[mode], "POST", body);
    if (j.ok) {
      toast(`✓ Enviado a ${targetLabel}`, "success");
      setHistory((h) => [{ id: Date.now(), msg: message, targets: targetLabel, count, ts: new Date().toLocaleString("es-AR") }, ...h.slice(0, 14)]);
      setMessage(""); setMsgTitle(""); clearSel();
    } else {
      toast((j.message as string) || "Error al enviar", "error");
    }
    setSending(false);
  };

  const allPageSel  = users.length > 0 && users.every((u) => selected.has(u._id));
  const somePageSel = users.some((u) => selected.has(u._id));
  const monoSm      = { fontFamily: "var(--font-mono)", fontSize: ".6rem", color: "var(--nk-muted)" } as const;
  const labelSt     = { ...monoSm, display: "block", letterSpacing: ".12em", textTransform: "uppercase" as const, marginBottom: ".35rem" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="dash__panel">
        <div className="dash__panel-header">
          <span className="dash__panel-title">Redactar <span>Aviso</span></span>
        </div>
        <div className="dash__editor-wrap">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelSt}>// Título (opcional)</label>
              <input className="dash__version-input" style={{ width: "100%", padding: ".55rem .75rem", fontSize: ".85rem" }}
                value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} placeholder="Ej: 🔔 Actualización importante" />
            </div>
            <div>
              <label style={labelSt}>// Mensaje *</label>
              <textarea className="dash__textarea" style={{ minHeight: 90 }} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Cuerpo de la notificación…" />
              <div style={{ ...monoSm, textAlign: "right", marginTop: ".2rem" }}>{message.length} chars</div>
            </div>
            <div>
              <label style={labelSt}>// Destinatarios</label>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {(["select", "role", "all"] as const).map((m) => (
                  <button key={m} className={`dash__filter-btn${mode === m ? " dash__filter-btn--active" : ""}`}
                    onClick={() => { setMode(m); clearSel(); }}>
                    {m === "select" ? "✎ Selección" : m === "role" ? "⊹ Por rol" : "📡 Todos"}
                  </button>
                ))}
              </div>
            </div>

            {mode === "role" && (
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                <span style={monoSm}>Rol:</span>
                <select className="dash__role-select" value={roleTarget} onChange={(e) => setRoleTarget(e.target.value)}>
                  <option value="all">Todos los roles</option>
                  {["user", "user-pro", "user-premium", "moderator", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            {mode === "all" && (
              <div style={{ padding: ".6rem .9rem", background: "rgba(230,57,70,.08)", border: "1px solid rgba(230,57,70,.2)", borderRadius: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".7rem", color: "var(--nk-red)" }}>
                  ⚠ Se enviará a los <strong>{total.toLocaleString()}</strong> usuarios registrados.
                </span>
              </div>
            )}

            {mode === "select" && selected.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                <span className="dash__badge dash__badge--online" style={{ fontSize: ".7rem" }}>
                  {selected.size} seleccionado{selected.size > 1 ? "s" : ""}
                </span>
                <button className="dash__action-btn dash__action-btn--view" style={{ fontSize: ".62rem" }} onClick={clearSel}>Limpiar</button>
              </div>
            )}

            <button className="dash__save-btn" onClick={() => { void send(); }} disabled={sending || !message.trim()}>
              {sending ? "Enviando…" : "📨 Enviar Notificación"}
            </button>
          </div>
        </div>
      </div>

      {mode === "select" && (
        <div className="dash__panel">
          <div className="dash__panel-header">
            <span className="dash__panel-title">
              Usuarios <span>({total})</span>
              {selected.size > 0 && (
                <span className="dash__badge dash__badge--online" style={{ marginLeft: ".75rem", fontSize: ".6rem" }}>
                  {selected.size} selec.
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <div className="dash__search">
                <svg className="dash__search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input className="dash__search-input" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button className={`dash__filter-btn${allPageSel ? " dash__filter-btn--active" : ""}`} onClick={toggleAll}>
                {allPageSel ? "✓ Todos" : somePageSel ? "~ Parcial" : "Sel. página"}
              </button>
            </div>
          </div>

          {loading ? <div className="dash__spinner" /> : users.length === 0 ? (
            <div className="dash__empty"><span className="dash__empty-icon">⊹</span><p className="dash__empty-text">Sin usuarios</p></div>
          ) : (
            <>
              <div className="dash__table-wrap">
                <table className="dash__table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={allPageSel}
                          ref={(el) => { if (el) el.indeterminate = somePageSel && !allPageSel; }}
                          onChange={toggleAll}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th>Usuario</th><th>Rol</th><th>Estado</th><th>Sub</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} onClick={() => toggleUser(u._id)}
                        style={{ cursor: "pointer", background: selected.has(u._id) ? "rgba(100,220,120,.06)" : undefined, transition: "background .15s" }}>
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={selected.has(u._id)} onChange={() => toggleUser(u._id)} style={{ cursor: "pointer" }} />
                        </td>
                        <td>
                          <div className="dash__table-user">
                            <div style={{ position: "relative" }}>
                              <Avatar src={u.avatarUrl} name={u.username} size={28} />
                              {u.isOnline && <div style={{ position: "absolute", bottom: 0, right: 0, width: 7, height: 7, borderRadius: "50%", background: "#64dc78", border: "2px solid #0d0d1a" }} />}
                            </div>
                            <div>
                              <div className="dash__table-name">{u.username}</div>
                              <div className="dash__table-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: "var(--nk-muted)" }}>{u.role}</td>
                        <td>
                          {u.isBanned
                            ? <span className="dash__badge dash__badge--banned">Baneado</span>
                            : u.isSuspended
                              ? <span className="dash__badge dash__badge--frozen">Suspendido</span>
                              : u.isOnline
                                ? <span className="dash__badge dash__badge--online">Online</span>
                                : <span className="dash__badge dash__badge--offline">Offline</span>}
                        </td>
                        <td style={monoSm}>{u.subscription?.type ?? "free"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="dash__pagination">
                  <button className="dash__page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
                  {page > 3 && (
                    <><button className="dash__page-btn" onClick={() => setPage(1)}>1</button><span className="dash__page-ellipsis">…</span></>
                  )}
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const p = Math.max(1, page - 2) + i;
                    return p <= pages
                      ? <button key={p} className={`dash__page-btn${p === page ? " dash__page-btn--active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                      : null;
                  })}
                  {page < pages - 2 && (
                    <><span className="dash__page-ellipsis">…</span><button className="dash__page-btn" onClick={() => setPage(pages)}>{pages}</button></>
                  )}
                  <button className="dash__page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === pages}>›</button>
                  <span className="dash__page-info">{total} usuarios</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="dash__panel">
          <div className="dash__panel-header">
            <span className="dash__panel-title">Historial <span>últimos 15</span></span>
            <button className="dash__action-btn dash__action-btn--delete" style={{ fontSize: ".6rem" }} onClick={() => setHistory([])}>Limpiar</button>
          </div>
          {history.map((h) => (
            <div key={h.id} style={{ padding: ".7rem 1.2rem", borderBottom: "1px solid rgba(255,255,255,.04)", display: "grid", gridTemplateColumns: "1fr auto", gap: ".75rem", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: ".85rem", marginBottom: ".3rem" }}>{h.msg.length > 80 ? h.msg.slice(0, 80) + "…" : h.msg}</div>
                <div style={{ display: "flex", gap: ".4rem" }}>
                  <span className="dash__badge dash__badge--online" style={{ fontSize: ".58rem" }}>→ {h.targets}</span>
                  <span className="dash__badge dash__badge--user" style={{ fontSize: ".58rem" }}>{h.count} dest.</span>
                </div>
              </div>
              <span style={monoSm}>{h.ts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// LEGAL EDITOR
// ════════════════════════════════════════════════════════════
function LegalEditor({
  api, toast, type,
}: {
  api: ApiCall;
  toast: (m: string, t?: "success" | "error" | "info") => void;
  type: "terms" | "privacy";
}) {
  const [content, setC]     = useState("");
  const [version, setV]     = useState("1.0");
  const [loading, setL]     = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api(`/${type}`).then((j) => {
      if (j.ok) {
        const d = j.data as { content?: string; version?: string };
        setC(d?.content ?? "");
        setV(d?.version ?? "1.0");
      }
      setL(false);
    });
  }, [api, type]);

  const save = async () => {
    setSaving(true);
    const j = await api(`/${type}`, "PUT", { content, version });
    if (j.ok) toast("Guardado", "success");
    else toast((j.message as string) || "Error", "error");
    setSaving(false);
  };

  if (loading) return <div className="dash__spinner" />;

  return (
    <div className="dash__panel">
      <div className="dash__panel-header">
        <span className="dash__panel-title">
          {type === "terms" ? "Términos y Condiciones" : "Política de Privacidad"}
        </span>
      </div>
      <div className="dash__editor-wrap">
        <div className="dash__editor-toolbar">
          <label style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: "var(--nk-muted)", letterSpacing: ".15em" }}>// Versión:</label>
          <input className="dash__version-input" value={version} onChange={(e) => setV(e.target.value)} placeholder="1.0" />
          <button className="dash__save-btn" onClick={() => { void save(); }} disabled={saving}>{saving ? "Guardando…" : "► Guardar"}</button>
        </div>
        <textarea
          className="dash__textarea"
          value={content}
          onChange={(e) => setC(e.target.value)}
          placeholder={`// ${type === "terms" ? "TÉRMINOS" : "PRIVACIDAD"}\n// Escribí aquí…`}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// NAV CONSTANTS
// ════════════════════════════════════════════════════════════
const NAV: { key: View; label: string; icon: string }[] = [
  { key: "stats",       label: "Dashboard",   icon: "◈"  },
  { key: "users",       label: "Usuarios",    icon: "⊹"  },
  { key: "communities", label: "Comunidades", icon: "⬡"  },
  { key: "battles",     label: "Batallas",    icon: "⚔"  },
  { key: "reports",     label: "Reportes",    icon: "⚑"  },
  { key: "blocks",      label: "Bloqueos",    icon: "⊘"  },
  { key: "flags",       label: "Flags",       icon: "⚐"  },
  { key: "pelis",       label: "Películas",   icon: "🎬" },
  { key: "avisos",      label: "Avisos",      icon: "📨" },
  { key: "terms",       label: "Términos",    icon: "≡"  },
  { key: "privacy",     label: "Privacidad",  icon: "◎"  },
];

const NAV_SECTIONS = [
  { label: "// Sistema",      items: NAV.slice(0, 4) },
  { label: "// Moderación",   items: NAV.slice(4, 7) },
  { label: "// Contenido",    items: NAV.slice(7, 8) },
  { label: "// Comunicación", items: NAV.slice(8, 9) },
  { label: "// Legal",        items: NAV.slice(9)    },
];

const VIEW_TITLES: Record<View, string> = {
  stats:       "Command Center",
  users:       "Usuarios",
  communities: "Comunidades",
  battles:     "Batallas",
  reports:     "Reportes",
  blocks:      "Bloqueos",
  flags:       "Content Flags",
  pelis:       "Películas",
  avisos:      "Avisos Masivos",
  terms:       "Términos Legales",
  privacy:     "Privacidad",
};

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
export default function SuperadminPage() {
  const [token, setToken]             = useState<string | null>(null);
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [ready, setReady]             = useState(false);
  const [view, setView]               = useState<View>("stats");
  const [toasts, setToasts]           = useState<Toast[]>([]);
  const [modal, setModal]             = useState<ConfirmModal | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toastId = useRef(0);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setSidebarOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useLayoutEffect(() => {
    const t = localStorage.getItem("nakama_token");
    if (t) {
      setToken(t);
      try {
        const p = JSON.parse(atob(t.split(".")[1])) as { role?: string; id?: string; email?: string; username?: string };
        if (p?.role !== "superadmin") { window.location.href = "/"; return; }
        setUser({ id: p.id ?? "", email: p.email ?? "", username: p.username ?? "superadmin" });
      } catch { /* backend valida */ }
    }
    setReady(true);
  }, []);

  const addToast = useCallback((msg: string, type: "success" | "error" | "info" = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const api      = useApi(token ?? "");
  const navigate = useCallback((key: View) => { setView(key); setSidebarOpen(false); window.scrollTo(0, 0); }, []);

  const handleKick = async () => {
    const j = await api("/kick-sessions", "POST");
    if (j.ok) {
      const tkn = j.token as string;
      localStorage.setItem("nakama_token", tkn);
      setToken(tkn);
      addToast("Sesiones invalidadas", "success");
    } else {
      addToast((j.message as string) || "Error", "error");
    }
  };

  if (!ready) return null;
  if (!token) { if (typeof window !== "undefined") window.location.href = "/login"; return null; }

  const titleParts = VIEW_TITLES[view].split(" ");

  return (
    <div className="dash">
      <button className="dash__menu-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label="Menú" aria-expanded={sidebarOpen}>
        {sidebarOpen
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>}
      </button>

      <div className={`dash__sidebar-overlay${sidebarOpen ? " is-open" : ""}`} onClick={() => setSidebarOpen(false)} aria-hidden="true" />

      <aside className={`dash__sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="dash__logo">
          <span className="dash__logo-text">NAK<em>A</em>MA</span>
          <span className="dash__logo-sub">▸ Command Center</span>
        </div>
        <nav className="dash__nav" aria-label="Navegación">
          {NAV_SECTIONS.map(({ label, items }) => (
            <div key={label}>
              <span className="dash__nav-section">{label}</span>
              {items.map((n) => (
                <button
                  key={n.key}
                  className={`dash__nav-item${view === n.key ? " dash__nav-item--active" : ""}`}
                  onClick={() => navigate(n.key)}
                  aria-current={view === n.key ? "page" : undefined}
                >
                  <span className="dash__nav-icon">{n.icon}</span>{n.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="dash__sidebar-footer">
          <div className="dash__user-pill">
            <div className="dash__user-avatar">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" />
                : user?.username?.charAt(0)?.toUpperCase() ?? "S"}
            </div>
            <div className="dash__user-info">
              <div className="dash__user-name">{user?.username ?? "superadmin"}</div>
              <div className="dash__user-role">// superadmin</div>
            </div>
            <button
              className="dash__logout-btn"
              onClick={() => { localStorage.removeItem("nakama_token"); window.location.href = "/login"; }}
              title="Cerrar sesión"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="dash__main">
        <div className="dash__topbar">
          <h1 className="dash__topbar-title">
            {titleParts[0]}
            {titleParts.length > 1 && <> <span>{titleParts.slice(1).join(" ")}</span></>}
          </h1>
          <div className="dash__topbar-actions">
            <button className="dash__kick-btn" onClick={() => { void handleKick(); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18.36 6.64A9 9 0 1 1 5.64 5.64M12 2v6" />
              </svg>
              <span>Kick Sessions</span>
            </button>
          </div>
        </div>

        <div className="dash__content">
          {view === "stats"       && <StatsView       api={api} onNavigate={navigate} />}
          {view === "users"       && <UsersView        api={api} toast={addToast} confirm={setModal} />}
          {view === "communities" && <CommunitiesView  api={api} toast={addToast} confirm={setModal} />}
          {view === "battles"     && <BattlesView      api={api} toast={addToast} confirm={setModal} />}
          {view === "reports"     && <ReportsView      api={api} toast={addToast} />}
          {view === "blocks"      && <BlocksView       api={api} toast={addToast} confirm={setModal} />}
          {view === "flags"       && <FlagsView        api={api} toast={addToast} />}
          {view === "pelis"       && <MovieUploadAdmin />}
          {view === "avisos"      && <AvisosView       api={api} toast={addToast} />}
          {view === "terms"       && <LegalEditor      api={api} toast={addToast} type="terms" />}
          {view === "privacy"     && <LegalEditor      api={api} toast={addToast} type="privacy" />}
        </div>
      </div>

      {modal !== null && (
        <div className="dash__modal-overlay" onClick={() => setModal(null)}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dash__modal-title">{modal.title}</h2>
            <p className="dash__modal-desc">{modal.desc}</p>
            <div className="dash__modal-actions">
              <button className="dash__modal-cancel" onClick={() => setModal(null)}>Cancelar</button>
              <button className="dash__modal-confirm" onClick={() => { modal.onConfirm(); setModal(null); }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="dash__toast" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`dash__toast-item dash__toast-item--${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}