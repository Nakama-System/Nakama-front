"use client";

import { useState, useEffect, useCallback } from "react";
import "../styles/superadmin.css";

const API_BASE = "https://nakama-vercel-backend.vercel.app/nx-control";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface UserRow {
  _id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isOnline: boolean;
  isSuspended: boolean;
  isBanned: boolean;
  subscription?: { type: string };
}

type ApiCall = (
  path: string,
  method?: string,
  body?: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

interface SentRecord {
  id: number;
  msg: string;
  targets: string;
  count: number;
  ts: string;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 30 }: { src?: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div className="dash__table-avatar" style={{ width: size, height: size, flexShrink: 0, fontSize: size * 0.4 }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} />
        : name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

// ─── useApi ───────────────────────────────────────────────────────────────────
function useApi(token: string): ApiCall {
  return useCallback(
    async (path, method = "GET", body) => {
      if (!token) return { ok: false, message: "Sin token" };
      try {
        const res = await fetch(`${API_BASE}${path}`, {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: body ? JSON.stringify(body) : undefined,
        });
        return res.json();
      } catch {
        return { ok: false, message: "Error de red" };
      }
    },
    [token],
  );
}

// ════════════════════════════════════════════════════════════
// AVISO ADMIN — página principal
// ════════════════════════════════════════════════════════════
export default function AvisoAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("nakama_token");
    if (!t) { window.location.href = "/login"; return; }
    try {
      const p = JSON.parse(atob(t.split(".")[1]));
      if (p?.role !== "superadmin" && p?.role !== "admin") {
        window.location.href = "/";
        return;
      }
    } catch { /* backend valida */ }
    setToken(t);
    setReady(true);
  }, []);

  const api = useApi(token || "");

  if (!ready) return <div className="dash__spinner" style={{ margin: "4rem auto" }} />;

  return (
    <div className="dash" style={{ display: "block", padding: "2rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h1 className="dash__topbar-title" style={{ margin: 0 }}>
            Avisos <span>Admin</span>
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem", color: "var(--nk-muted)", marginTop: ".3rem" }}>
            // Enviá notificaciones individuales, por grupos o a todos los usuarios
          </p>
        </div>

        <NotifPanel api={api} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PANEL PRINCIPAL DE NOTIFICACIONES
// ════════════════════════════════════════════════════════════
function NotifPanel({ api }: { api: ApiCall }) {
  // ── Estado de búsqueda y usuarios
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [search, setSearch]     = useState("");
  const [dq, setDq]             = useState("");
  const [loadingUsers, setLU]   = useState(false);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [total, setTotal]       = useState(0);

  // ── Selección
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Filtros rápidos de destino
  const [mode, setMode] = useState<"select" | "role" | "all">("select");
  const [roleTarget, setRoleTarget] = useState("all");

  // ── Mensaje
  const [message, setMessage] = useState("");
  const [title, setTitle]     = useState("");

  // ── Estado de envío
  const [sending, setSending] = useState(false);
  const [toast, setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [history, setHistory] = useState<SentRecord[]>([]);

  // ── Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDq(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Cargar usuarios
  const loadUsers = useCallback(async () => {
    setLU(true);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (dq) params.set("search", dq);
    const j = await api(`/users?${params}`);
    if (j.ok) {
      setUsers(j.data as UserRow[]);
      const p = j.pagination as { pages: number; total: number };
      setPages(p.pages);
      setTotal(p.total);
    }
    setLU(false);
  }, [api, page, dq]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Selección helpers
  const toggleUser = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () => {
    const allIds = users.map((u) => u._id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      allIds.forEach((id) => allSelected ? n.delete(id) : n.add(id));
      return n;
    });
  };

  const clearSelection = () => setSelected(new Set());

  // ── Enviar notificación
  const send = async () => {
    if (!message.trim()) { setToast({ msg: "Escribí un mensaje", type: "error" }); return; }

    let endpoint = "";
    let body: Record<string, unknown> = { message, title: title || undefined };
    let targetLabel = "";
    let count = 0;

    if (mode === "all") {
      endpoint = "/users/notify-all";
      targetLabel = "Todos";
      count = total;
    } else if (mode === "role") {
      endpoint = "/users/notify-role";
      body.role = roleTarget;
      targetLabel = roleTarget === "all" ? "Todos los roles" : roleTarget;
      count = users.length; // estimado visible
    } else {
      if (selected.size === 0) { setToast({ msg: "Seleccioná al menos un usuario", type: "error" }); return; }
      endpoint = "/users/notify-batch";
      body.userIds = Array.from(selected);
      targetLabel = `${selected.size} usuario${selected.size > 1 ? "s" : ""}`;
      count = selected.size;
    }

    setSending(true);
    const j = await api(endpoint, "POST", body);
    if (j.ok) {
      setToast({ msg: `✓ Enviado a ${targetLabel}`, type: "success" });
      setHistory((h) => [
        { id: Date.now(), msg: message, targets: targetLabel, count, ts: new Date().toLocaleString("es-AR") },
        ...h.slice(0, 14),
      ]);
      setMessage("");
      setTitle("");
      clearSelection();
    } else {
      setToast({ msg: (j.message as string) || "Error al enviar", type: "error" });
    }
    setSending(false);
  };

  const allPageSelected = users.length > 0 && users.every((u) => selected.has(u._id));
  const somePageSelected = users.some((u) => selected.has(u._id));

  const roleBadgeColor: Record<string, string> = {
    superadmin: "var(--nk-red)", admin: "var(--nk-orange)",
    moderator: "var(--nk-cyan)", "user-premium": "#9b59b6",
    "user-pro": "#a8daff", user: "var(--nk-muted)",
  };

  const monoSm = { fontFamily: "var(--font-mono)", fontSize: ".6rem", color: "var(--nk-muted)" } as const;

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <div className="dash__toast" aria-live="polite" style={{ position: "fixed" }}>
          <div className={`dash__toast-item dash__toast-item--${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* ══ COMPOSER ══════════════════════════════════════════ */}
      <div className="dash__panel">
        <div className="dash__panel-header">
          <span className="dash__panel-title">Redactar <span>Aviso</span></span>
        </div>
        <div className="dash__editor-wrap">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Título opcional */}
            <div>
              <label style={{ display: "block", ...monoSm, marginBottom: ".3rem", letterSpacing: ".12em", textTransform: "uppercase" }}>
                // Título (opcional)
              </label>
              <input
                className="dash__version-input"
                style={{ width: "100%", padding: ".55rem .75rem", fontSize: ".85rem" }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: 🔔 Actualización importante"
              />
            </div>

            {/* Mensaje */}
            <div>
              <label style={{ display: "block", ...monoSm, marginBottom: ".3rem", letterSpacing: ".12em", textTransform: "uppercase" }}>
                // Mensaje *
              </label>
              <textarea
                className="dash__textarea"
                style={{ minHeight: 90 }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribí el cuerpo de la notificación…"
              />
              <div style={{ ...monoSm, textAlign: "right", marginTop: ".25rem" }}>{message.length} chars</div>
            </div>

            {/* ── Modo de destino ── */}
            <div>
              <label style={{ display: "block", ...monoSm, marginBottom: ".5rem", letterSpacing: ".12em", textTransform: "uppercase" }}>
                // Destinatarios
              </label>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {(["select", "role", "all"] as const).map((m) => (
                  <button
                    key={m}
                    className={`dash__filter-btn${mode === m ? " dash__filter-btn--active" : ""}`}
                    onClick={() => { setMode(m); clearSelection(); }}
                  >
                    {m === "select" ? "✎ Selección manual" : m === "role" ? "⊹ Por rol" : "📡 Todos"}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-opción: por rol */}
            {mode === "role" && (
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                <span style={monoSm}>Rol objetivo:</span>
                <select
                  className="dash__role-select"
                  value={roleTarget}
                  onChange={(e) => setRoleTarget(e.target.value)}
                >
                  <option value="all">Todos los roles</option>
                  {["user", "user-pro", "user-premium", "moderator", "admin"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sub-opción: todos */}
            {mode === "all" && (
              <div style={{ padding: ".6rem .9rem", background: "rgba(230,57,70,.08)", border: "1px solid rgba(230,57,70,.2)", borderRadius: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".7rem", color: "var(--nk-red)" }}>
                  ⚠ Se enviará a los <strong>{total.toLocaleString()}</strong> usuarios registrados.
                </span>
              </div>
            )}

            {/* Sub-opción: selección — muestra badge */}
            {mode === "select" && selected.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                <span className="dash__badge dash__badge--online" style={{ fontSize: ".7rem" }}>
                  {selected.size} seleccionado{selected.size > 1 ? "s" : ""}
                </span>
                <button className="dash__action-btn dash__action-btn--view" onClick={clearSelection} style={{ fontSize: ".62rem" }}>
                  Limpiar
                </button>
              </div>
            )}

            {/* Botón enviar */}
            <button
              className="dash__save-btn"
              onClick={send}
              disabled={sending || !message.trim()}
              style={{ marginTop: ".25rem" }}
            >
              {sending ? "Enviando…" : "📨 Enviar Notificación"}
            </button>
          </div>
        </div>
      </div>

      {/* ══ SELECTOR DE USUARIOS (solo en modo "select") ══════ */}
      {mode === "select" && (
        <div className="dash__panel">
          <div className="dash__panel-header">
            <span className="dash__panel-title">
              Usuarios <span>({total})</span>
              {selected.size > 0 && (
                <span className="dash__badge dash__badge--online" style={{ marginLeft: ".75rem", fontSize: ".62rem" }}>
                  {selected.size} selec.
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
              <div className="dash__search">
                <svg className="dash__search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  className="dash__search-input"
                  placeholder="Buscar usuario…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                className={`dash__filter-btn${allPageSelected ? " dash__filter-btn--active" : ""}`}
                onClick={toggleAll}
                title="Seleccionar/deseleccionar página"
              >
                {allPageSelected ? "✓ Todos" : somePageSelected ? "~ Parcial" : "Sel. página"}
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="dash__spinner" />
          ) : users.length === 0 ? (
            <div className="dash__empty">
              <span className="dash__empty-icon">⊹</span>
              <p className="dash__empty-text">Sin usuarios</p>
            </div>
          ) : (
            <>
              <div className="dash__table-wrap">
                <table className="dash__table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                          onChange={toggleAll}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Sub</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isChecked = selected.has(u._id);
                      return (
                        <tr
                          key={u._id}
                          onClick={() => toggleUser(u._id)}
                          style={{ cursor: "pointer", background: isChecked ? "rgba(100,220,120,.06)" : undefined, transition: "background .15s" }}
                        >
                          <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleUser(u._id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td>
                            <div className="dash__table-user">
                              <div style={{ position: "relative" }}>
                                <Avatar src={u.avatarUrl} name={u.username} size={30} />
                                {u.isOnline && (
                                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 7, height: 7, borderRadius: "50%", background: "#64dc78", border: "2px solid #0d0d1a" }} />
                                )}
                              </div>
                              <div>
                                <div className="dash__table-name">{u.username}</div>
                                <div className="dash__table-email">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: roleBadgeColor[u.role] || "var(--nk-muted)" }}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            {u.isBanned
                              ? <span className="dash__badge dash__badge--banned">Baneado</span>
                              : u.isSuspended
                                ? <span className="dash__badge dash__badge--frozen">Suspendido</span>
                                : u.isOnline
                                  ? <span className="dash__badge dash__badge--online">Online</span>
                                  : <span className="dash__badge dash__badge--offline">Offline</span>}
                          </td>
                          <td>
                            <span style={{ ...monoSm }}>{u.subscription?.type || "free"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {pages > 1 && (
                <div className="dash__pagination">
                  <button className="dash__page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
                  {page > 3 && (<><button className="dash__page-btn" onClick={() => setPage(1)}>1</button><span className="dash__page-ellipsis">…</span></>)}
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const p = Math.max(1, page - 2) + i;
                    if (p > pages) return null;
                    return (
                      <button key={p} className={`dash__page-btn${p === page ? " dash__page-btn--active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                    );
                  })}
                  {page < pages - 2 && (<><span className="dash__page-ellipsis">…</span><button className="dash__page-btn" onClick={() => setPage(pages)}>{pages}</button></>)}
                  <button className="dash__page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === pages}>›</button>
                  <span className="dash__page-info">{total} usuarios</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ HISTORIAL ═════════════════════════════════════════ */}
      {history.length > 0 && (
        <div className="dash__panel">
          <div className="dash__panel-header">
            <span className="dash__panel-title">Historial <span>últimos 15</span></span>
            <button className="dash__action-btn dash__action-btn--delete" style={{ fontSize: ".6rem" }} onClick={() => setHistory([])}>
              Limpiar
            </button>
          </div>
          {history.map((h) => (
            <div key={h.id} style={{ padding: ".7rem 1.2rem", borderBottom: "1px solid rgba(255,255,255,.04)", display: "grid", gridTemplateColumns: "1fr auto", gap: ".75rem", alignItems: "start" }}>
              <div>
                {h.msg.length > 80 ? h.msg.slice(0, 80) + "…" : h.msg}
                <div style={{ display: "flex", gap: ".4rem", marginTop: ".35rem", flexWrap: "wrap" }}>
                  <span className="dash__badge dash__badge--online" style={{ fontSize: ".58rem" }}>→ {h.targets}</span>
                  <span className="dash__badge dash__badge--user" style={{ fontSize: ".58rem" }}>{h.count} destinatario{h.count !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <span style={monoSm}>{h.ts}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
