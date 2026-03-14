"use client";

// ─── moderation.tsx ──────────────────────────────────────────────────────────
// Exporta: CommunitiesView, BattlesView, ReportsView, BlocksView, FlagsView
// Importar en superadmin.tsx:
//   import { CommunitiesView, BattlesView, ReportsView, BlocksView, FlagsView } from "./moderation";
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

// ─── Tipos compartidos ────────────────────────────────────────────────────────

export interface CommunityRow {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  likeCount: number;
  theme: string;
  messagingOpen: boolean;
  createdAt: string;
  creatorId: string;
}

export interface BattleRow {
  _id: string;
  roomId: string;
  nombre: string;
  estado: string;
  createdAt: string;
  expiresAt: string;
  players: {
    userId: string;
    username: string;
    status: string;
    score: number;
  }[];
  configuracion: { totalPreguntas: number; tiempoPorPregunta: number };
}

export interface ReportRow {
  _id: string;
  reporter: { _id: string; username: string };
  reported: { _id: string; username: string };
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  adminNote?: string;
}

export interface BlockRow {
  _id: string;
  blocker: { _id: string; username: string; avatarUrl?: string };
  blocked: { _id: string; username: string; avatarUrl?: string };
  createdAt: string;
}

export interface FlagRow {
  _id: string;
  contentType: string;
  contentId: string;
  ownerId: { _id: string; username: string };
  flagReasons: string[];
  flagDetail: string;
  status: string;
  isAutoFlag: boolean;
  flaggedAt: string;
  actionTaken: string;
  cloudinaryUrl?: string;
}

// ─── Tipos de props compartidos ───────────────────────────────────────────────

export type ApiCall = (
  path: string,
  method?: string,
  body?: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export interface ConfirmModal {
  title: string;
  desc: string;
  onConfirm: () => void;
}

// ─── Avatar (local, para no depender del padre) ───────────────────────────────

function Avatar({
  src,
  name,
  size = 32,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  return (
    <div
      className="dash__table-avatar"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {src && !err ? (
        <img src={src} alt={name} onError={() => setErr(true)} />
      ) : (
        name?.charAt(0)?.toUpperCase() || "?"
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMMUNITIES VIEW
// ════════════════════════════════════════════════════════════
export function CommunitiesView({
  api,
  toast,
  confirm,
}: {
  api: ApiCall;
  toast: (m: string, t?: "success" | "error" | "info") => void;
  confirm: (c: ConfirmModal) => void;
}) {
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDq(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "15",
      ...(dq ? { search: dq } : {}),
    });
    const j = await api(`/communities?${params}`);
    if (j.ok) {
      setCommunities(j.data as CommunityRow[]);
      const p = j.pagination as { pages: number; total: number };
      setPages(p.pages);
      setTotal(p.total);
    } else if ((j.message as string) !== "Sin token")
      toast((j.message as string) || "Error cargando comunidades", "error");
    setLoading(false);
  }, [api, page, dq, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (
    path: string,
    method: string,
    body?: Record<string, unknown>,
  ) => {
    const j = await api(path, method, body);
    if (j.ok) {
      toast("✓ Acción realizada", "success");
      load();
    } else toast((j.message as string) || "Error", "error");
  };

  return (
    <div className="dash__panel">
      <div className="dash__panel-header">
        <span className="dash__panel-title">
          Comunidades <span>({total})</span>
        </span>
        <div className="dash__search">
          <svg
            className="dash__search-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="dash__search-input"
            placeholder="Buscar comunidad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="dash__spinner" />
      ) : communities.length === 0 ? (
        <div className="dash__empty">
          <span className="dash__empty-icon">⬡</span>
          <p className="dash__empty-text">Sin resultados</p>
        </div>
      ) : (
        <>
          <div className="dash__table-wrap">
            <table className="dash__table">
              <thead>
                <tr>
                  <th>Comunidad</th>
                  <th>Tema</th>
                  <th>Miembros</th>
                  <th>Likes</th>
                  <th>Chat</th>
                  <th>Creada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {communities.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="dash__table-user">
                        <Avatar name={c.name} size={32} />
                        <div>
                          <div className="dash__table-name">{c.name}</div>
                          <div
                            className="dash__table-email"
                            style={{
                              maxWidth: 160,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="dash__badge dash__badge--user">
                        {c.theme}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: ".8rem",
                      }}
                    >
                      {c.memberCount.toLocaleString()}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: ".8rem",
                        color: "var(--nk-muted)",
                      }}
                    >
                      {c.likeCount.toLocaleString()}
                    </td>
                    <td>
                      {c.messagingOpen ? (
                        <span className="dash__badge dash__badge--active">
                          Abierto
                        </span>
                      ) : (
                        <span className="dash__badge dash__badge--closed">
                          Cerrado
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: ".65rem",
                        color: "var(--nk-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(c.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td>
                      <div className="dash__actions">
                        <button
                          className={`dash__action-btn dash__action-btn--${c.messagingOpen ? "freeze" : "unfreeze"}`}
                          onClick={() =>
                            action(`/communities/${c._id}/freeze`, "POST", {
                              freeze: c.messagingOpen,
                            })
                          }
                        >
                          {c.messagingOpen ? "Congelar" : "Abrir"}
                        </button>
                        <button
                          className="dash__action-btn dash__action-btn--delete"
                          onClick={() =>
                            confirm({
                              title: `Eliminar "${c.name}"`,
                              desc: "Acción permanente.",
                              onConfirm: () =>
                                action(`/communities/${c._id}`, "DELETE"),
                            })
                          }
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
              <button
                className="dash__page-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`dash__page-btn${p === page ? " dash__page-btn--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="dash__page-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pages}
              >
                ›
              </button>
              <span className="dash__page-info">{total} comunidades</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BATTLES VIEW
// ════════════════════════════════════════════════════════════
export function BattlesView({
  api,
  toast,
  confirm,
}: {
  api: ApiCall;
  toast: (m: string, t?: "success" | "error" | "info") => void;
  confirm: (c: ConfirmModal) => void;
}) {
  const [battles, setB] = useState<BattleRow[]>([]);
  const [loading, setL] = useState(true);
  const [filter, setF] = useState("all");
  const [page, setP] = useState(1);
  const [pages, setPgs] = useState(1);

  const load = useCallback(async () => {
    setL(true);
    const j = await api(
      `/battles?page=${page}${filter !== "all" ? `&estado=${filter}` : ""}`,
    );
    if (j.ok) {
      setB(j.data as BattleRow[]);
      setPgs((j.pagination as { pages: number }).pages || 1);
    }
    setL(false);
  }, [api, page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const estadoBadge: Record<string, string> = {
    waiting: "frozen",
    active: "online",
    finished: "offline",
    cancelled: "banned",
  };

  return (
    <div className="dash__panel">
      <div className="dash__panel-header">
        <span className="dash__panel-title">Batallas</span>
        <div className="dash__filter-row">
          {["all", "waiting", "active", "finished", "cancelled"].map((f) => (
            <button
              key={f}
              className={`dash__filter-btn${filter === f ? " dash__filter-btn--active" : ""}`}
              onClick={() => {
                setF(f);
                setP(1);
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="dash__spinner" />
      ) : battles.length === 0 ? (
        <div className="dash__empty">
          <span className="dash__empty-icon">⚔</span>
          <p className="dash__empty-text">Sin batallas</p>
        </div>
      ) : (
        <>
          <div className="dash__table-wrap">
            <table className="dash__table">
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Nombre</th>
                  <th>Jugadores</th>
                  <th>Estado</th>
                  <th>Expira</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {battles.map((b) => (
                  <tr key={b._id}>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: ".65rem",
                        color: "var(--nk-muted)",
                      }}
                    >
                      {b.roomId}
                    </td>
                    <td>
                      <div className="dash__table-name">{b.nombre}</div>
                    </td>
                    <td>
                      {b.players.map((p) => (
                        <div
                          key={p.userId}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: ".62rem",
                            color: "var(--nk-muted)",
                          }}
                        >
                          @{p.username}{" "}
                          <span style={{ color: "var(--nk-cyan)" }}>
                            {p.score}pts
                          </span>
                        </div>
                      ))}
                    </td>
                    <td>
                      <span
                        className={`dash__badge dash__badge--${estadoBadge[b.estado] || "user"}`}
                      >
                        {b.estado}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: ".62rem",
                        color: "var(--nk-muted)",
                      }}
                    >
                      {b.expiresAt
                        ? new Date(b.expiresAt).toLocaleString("es-AR")
                        : "—"}
                    </td>
                    <td>
                      <div className="dash__actions">
                        {(b.estado === "active" || b.estado === "waiting") && (
                          <button
                            className="dash__action-btn dash__action-btn--ban"
                            onClick={() =>
                              confirm({
                                title: `Cancelar ${b.roomId}`,
                                desc: "Se cancelará la partida.",
                                onConfirm: () =>
                                  api(`/battles/${b._id}/cancel`, "POST").then(
                                    () => {
                                      toast("Cancelado", "success");
                                      load();
                                    },
                                  ),
                              })
                            }
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          className="dash__action-btn dash__action-btn--delete"
                          onClick={() =>
                            confirm({
                              title: "Eliminar batalla",
                              desc: "Permanente.",
                              onConfirm: () =>
                                api(`/battles/${b._id}`, "DELETE").then(() => {
                                  toast("Eliminado", "success");
                                  load();
                                }),
                            })
                          }
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
              <button
                className="dash__page-btn"
                onClick={() => setP((p) => p - 1)}
                disabled={page === 1}
              >
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`dash__page-btn${p === page ? " dash__page-btn--active" : ""}`}
                  onClick={() => setP(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="dash__page-btn"
                onClick={() => setP((p) => p + 1)}
                disabled={page === pages}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REPORTS VIEW
// ════════════════════════════════════════════════════════════
export function ReportsView({
  api,
  toast,
}: {
  api: ApiCall;
  toast: (m: string, t?: "success" | "error" | "info") => void;
}) {
  const [reports, setR] = useState<ReportRow[]>([]);
  const [loading, setL] = useState(true);
  const [filter, setF] = useState("pendiente");
  const [page, setP] = useState(1);
  const [pages, setPgs] = useState(1);
  const [noteTarget, setNT] = useState<ReportRow | null>(null);
  const [noteText, setNTxt] = useState("");

  const load = useCallback(async () => {
    setL(true);
    const j = await api(`/reports?page=${page}&status=${filter}`);
    if (j.ok) {
      setR(j.data as ReportRow[]);
      setPgs((j.pagination as { pages: number }).pages || 1);
    }
    setL(false);
  }, [api, page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: string, status: string, note?: string) => {
    const j = await api(`/reports/${id}/resolve`, "PATCH", {
      status,
      adminNote: note,
    });
    if (j.ok) {
      toast("Actualizado", "success");
      load();
    } else toast((j.message as string) || "Error", "error");
  };

  const RL: Record<string, string> = {
    spam: "Spam",
    acoso: "Acoso",
    contenido_inapropiado: "Inapropiado",
    violencia: "Violencia",
    odio: "Odio",
    desinformacion: "Desinfo",
    otro: "Otro",
  };

  const SC: Record<string, string> = {
    pendiente: "var(--nk-orange)",
    revisado: "var(--nk-cyan)",
    resuelto: "#64dc78",
  };

  return (
    <div className="dash__panel">
      <div className="dash__panel-header">
        <span className="dash__panel-title">Reportes</span>
        <div className="dash__filter-row">
          {["pendiente", "revisado", "resuelto"].map((f) => (
            <button
              key={f}
              className={`dash__filter-btn${filter === f ? " dash__filter-btn--active" : ""}`}
              onClick={() => {
                setF(f);
                setP(1);
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="dash__spinner" />
      ) : reports.length === 0 ? (
        <div className="dash__empty">
          <span className="dash__empty-icon">⚑</span>
          <p className="dash__empty-text">Sin reportes</p>
        </div>
      ) : (
        <>
          {reports.map((r) => (
            <div key={r._id} className="dash__report-card">
              <div className="dash__report-header">
                <span
                  className="dash__badge"
                  style={{
                    background: "rgba(230,57,70,.12)",
                    color: "var(--nk-red)",
                    border: "1px solid rgba(230,57,70,.3)",
                  }}
                >
                  {RL[r.reason] || r.reason}
                </span>
                <span
                  className="dash__badge"
                  style={{
                    background: SC[r.status] + "22",
                    color: SC[r.status],
                    border: `1px solid ${SC[r.status]}44`,
                  }}
                >
                  {r.status}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: ".55rem",
                    color: "var(--nk-muted)",
                    marginLeft: "auto",
                  }}
                >
                  {new Date(r.createdAt).toLocaleDateString("es-AR")}
                </span>
              </div>
              <p className="dash__report-meta">
                <strong>@{r.reporter?.username || "—"}</strong>
                <span style={{ color: "var(--nk-muted)" }}> → </span>
                <strong>@{r.reported?.username || "—"}</strong>
              </p>
              {r.details && (
                <p className="dash__report-detail">{r.details}</p>
              )}
              <div className="dash__actions">
                {r.status === "pendiente" && (
                  <button
                    className="dash__action-btn dash__action-btn--freeze"
                    onClick={() => resolve(r._id, "revisado")}
                  >
                    En revisión
                  </button>
                )}
                {r.status !== "resuelto" && (
                  <button
                    className="dash__action-btn dash__action-btn--unban"
                    onClick={() => resolve(r._id, "resuelto")}
                  >
                    Resolver
                  </button>
                )}
                <button
                  className="dash__action-btn dash__action-btn--view"
                  onClick={() => {
                    setNT(r);
                    setNTxt(r.adminNote || "");
                  }}
                >
                  Nota
                </button>
              </div>
            </div>
          ))}

          {pages > 1 && (
            <div className="dash__pagination">
              <button
                className="dash__page-btn"
                onClick={() => setP((p) => p - 1)}
                disabled={page === 1}
              >
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`dash__page-btn${p === page ? " dash__page-btn--active" : ""}`}
                  onClick={() => setP(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="dash__page-btn"
                onClick={() => setP((p) => p + 1)}
                disabled={page === pages}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}

      {noteTarget && (
        <div className="dash__modal-overlay" onClick={() => setNT(null)}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dash__modal-title">Nota Admin</h2>
            <textarea
              className="dash__notif-area"
              value={noteText}
              onChange={(e) => setNTxt(e.target.value)}
              style={{ marginBottom: "1.2rem" }}
            />
            <div className="dash__modal-actions">
              <button
                className="dash__modal-cancel"
                onClick={() => setNT(null)}
              >
                Cancelar
              </button>
              <button
                className="dash__modal-confirm"
                onClick={() => {
                  resolve(noteTarget._id, noteTarget.status, noteText);
                  setNT(null);
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCKS VIEW
// ════════════════════════════════════════════════════════════
export function BlocksView({
  api,
  toast,
  confirm,
}: {
  api: ApiCall;
  toast: (m: string, t?: "success" | "error" | "info") => void;
  confirm: (c: ConfirmModal) => void;
}) {
  const [blocks, setB] = useState<BlockRow[]>([]);
  const [loading, setL] = useState(true);
  const [search, setS] = useState("");
  const [dq, setDq] = useState("");
  const [page, setP] = useState(1);
  const [pages, setPgs] = useState(1);
  const [total, setT] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDq(search);
      setP(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setL(true);
    const params = new URLSearchParams({
      page: String(page),
      ...(dq ? { search: dq } : {}),
    });
    const j = await api(`/blocks?${params}`);
    if (j.ok) {
      setB(j.data as BlockRow[]);
      const p = j.pagination as { pages: number; total: number };
      setPgs(p.pages);
      setT(p.total);
    }
    setL(false);
  }, [api, page, dq]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dash__panel">
      <div className="dash__panel-header">
        <span className="dash__panel-title">
          Bloqueos <span>({total})</span>
        </span>
        <div className="dash__search">
          <svg
            className="dash__search-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="dash__search-input"
            placeholder="Buscar usuario…"
            value={search}
            onChange={(e) => setS(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="dash__spinner" />
      ) : blocks.length === 0 ? (
        <div className="dash__empty">
          <span className="dash__empty-icon">⊘</span>
          <p className="dash__empty-text">Sin bloqueos</p>
        </div>
      ) : (
        <>
          <div className="dash__table-wrap">
            <table className="dash__table">
              <thead>
                <tr>
                  <th>Bloqueador</th>
                  <th>Bloqueado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <div className="dash__table-user">
                        <Avatar
                          src={b.blocker?.avatarUrl}
                          name={b.blocker?.username || "?"}
                          size={28}
                        />
                        <span className="dash__table-name">
                          @{b.blocker?.username || "—"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="dash__table-user">
                        <Avatar
                          src={b.blocked?.avatarUrl}
                          name={b.blocked?.username || "?"}
                          size={28}
                        />
                        <span className="dash__table-name">
                          @{b.blocked?.username || "—"}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: ".65rem",
                        color: "var(--nk-muted)",
                      }}
                    >
                      {new Date(b.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td>
                      <button
                        className="dash__action-btn dash__action-btn--delete"
                        onClick={() =>
                          confirm({
                            title: "Eliminar bloqueo",
                            desc: `Entre @${b.blocker?.username} y @${b.blocked?.username}`,
                            onConfirm: () =>
                              api(`/blocks/${b._id}`, "DELETE").then(() => {
                                toast("Eliminado", "success");
                                load();
                              }),
                          })
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="dash__pagination">
              <button
                className="dash__page-btn"
                onClick={() => setP((p) => p - 1)}
                disabled={page === 1}
              >
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`dash__page-btn${p === page ? " dash__page-btn--active" : ""}`}
                  onClick={() => setP(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="dash__page-btn"
                onClick={() => setP((p) => p + 1)}
                disabled={page === pages}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FLAGS VIEW
// ════════════════════════════════════════════════════════════
export function FlagsView({
  api,
  toast,
}: {
  api: ApiCall;
  toast: (m: string, t?: "success" | "error" | "info") => void;
}) {
  const [flags, setF] = useState<FlagRow[]>([]);
  const [loading, setL] = useState(true);
  const [filter, setFl] = useState("pending");
  const [page, setP] = useState(1);
  const [pages, setPgs] = useState(1);

  const load = useCallback(async () => {
    setL(true);
    const j = await api(`/flags?page=${page}&status=${filter}`);
    if (j.ok) {
      setF(j.data as FlagRow[]);
      setPgs((j.pagination as { pages: number }).pages || 1);
    }
    setL(false);
  }, [api, page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, action: string) => {
    const j = await api(`/flags/${id}/review`, "PATCH", { action });
    if (j.ok) {
      toast("Flag actualizado", "success");
      load();
    } else toast((j.message as string) || "Error", "error");
  };

  const RC: Record<string, string> = {
    csam: "#e63946",
    grooming: "#e63946",
    violence: "#ff6b35",
    hate_speech: "#ff6b35",
    nudity: "#f39c12",
    harassment: "#f39c12",
    spam: "#666",
    other: "#666",
  };

  const SC: Record<string, string> = {
    pending: "var(--nk-orange)",
    under_review: "var(--nk-cyan)",
    removed: "var(--nk-red)",
    dismissed: "var(--nk-muted)",
  };

  return (
    <div className="dash__panel">
      <div className="dash__panel-header">
        <span className="dash__panel-title">Content Flags</span>
        <div className="dash__filter-row">
          {["pending", "under_review", "removed", "dismissed"].map((f) => (
            <button
              key={f}
              className={`dash__filter-btn${filter === f ? " dash__filter-btn--active" : ""}`}
              onClick={() => {
                setFl(f);
                setP(1);
              }}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="dash__spinner" />
      ) : flags.length === 0 ? (
        <div className="dash__empty">
          <span className="dash__empty-icon">⚐</span>
          <p className="dash__empty-text">Sin flags</p>
        </div>
      ) : (
        <>
          {flags.map((f) => (
            <div
              key={f._id}
              className="dash__report-card"
              style={{
                borderLeftColor: f.flagReasons.includes("csam")
                  ? "#e63946"
                  : "var(--nk-orange)",
              }}
            >
              <div className="dash__report-header">
                <span className="dash__badge dash__badge--frozen">
                  {f.contentType}
                </span>
                {f.flagReasons.map((fr) => (
                  <span
                    key={fr}
                    className="dash__badge"
                    style={{
                      background: (RC[fr] || "#666") + "22",
                      color: RC[fr] || "#666",
                      border: `1px solid ${RC[fr] || "#666"}44`,
                    }}
                  >
                    {fr}
                  </span>
                ))}
                <span
                  className="dash__badge"
                  style={{
                    background: SC[f.status] + "22",
                    color: SC[f.status],
                    border: `1px solid ${SC[f.status]}44`,
                  }}
                >
                  {f.status}
                </span>
                {f.isAutoFlag && (
                  <span className="dash__badge dash__badge--frozen">AUTO</span>
                )}
              </div>
              <p className="dash__report-meta">
                Owner: <strong>@{f.ownerId?.username || "—"}</strong>
              </p>
              {f.flagDetail && (
                <p className="dash__report-detail">{f.flagDetail}</p>
              )}
              {f.cloudinaryUrl && (
                <a
                  href={f.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: ".6rem",
                    color: "var(--nk-cyan)",
                    display: "block",
                    marginBottom: ".5rem",
                  }}
                >
                  ↗ Ver contenido
                </a>
              )}
              <div className="dash__actions">
                {(f.status === "pending" || f.status === "under_review") && (
                  <>
                    {f.status === "pending" && (
                      <button
                        className="dash__action-btn dash__action-btn--freeze"
                        onClick={() => review(f._id, "under_review")}
                      >
                        Revisar
                      </button>
                    )}
                    <button
                      className="dash__action-btn dash__action-btn--ban"
                      onClick={() => review(f._id, "removed")}
                    >
                      Eliminar
                    </button>
                    <button
                      className="dash__action-btn dash__action-btn--view"
                      onClick={() => review(f._id, "dismissed")}
                    >
                      Descartar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {pages > 1 && (
            <div className="dash__pagination">
              <button
                className="dash__page-btn"
                onClick={() => setP((p) => p - 1)}
                disabled={page === 1}
              >
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`dash__page-btn${p === page ? " dash__page-btn--active" : ""}`}
                  onClick={() => setP(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="dash__page-btn"
                onClick={() => setP((p) => p + 1)}
                disabled={page === pages}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ModerationPage() {
  return null;
}