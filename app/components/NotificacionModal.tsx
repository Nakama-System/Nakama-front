// ═══════════════════════════════════════════════════════════
// components/NotificationModal.tsx — VERSIÓN FINAL COMPLETA
// Modal mobile-first para leer notificaciones.
// • Bottom sheet en mobile, centered en desktop
// • Links clicables solo para pro/admin/superadmin
// • Detalle con vista completa del mensaje
// • Botón eliminar en lista Y en detalle
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import type { AdminNotif } from "../hooks/useAdminNotifications";

type UserRole = "user" | "pro" | "admin" | "superadmin";

interface NotificationModalProps {
  notifications: AdminNotif[];
  userRole: UserRole;
  onClose: () => void;
  onMarkOneRead: (id: string) => Promise<void> | void;
  onMarkAllRead: () => Promise<void> | void;
  onDeleteOne: (id: string) => Promise<void> | void;
  onDeleteAll: () => Promise<void> | void;
}

// ─── Helpers ─────────────────────────────────────────────
const canSeeLinks = (role: UserRole) =>
  ["pro", "admin", "superadmin"].includes(role);

function RenderBody({ body, role }: { body: string; role: UserRole }) {
  if (!canSeeLinks(role)) {
    return <p className="nm-body-text">{body}</p>;
  }
  const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;
  const parts = body.split(URL_PATTERN);
  return (
    <p className="nm-body-text">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="nm-link">
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </p>
  );
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

// ─── Tarjeta en la lista ──────────────────────────────────
function NotiCard({
  notif, onOpen, onDelete,
}: {
  notif: AdminNotif;
  onOpen: (n: AdminNotif) => void;
  onDelete: (id: string) => void;
}) {
  function handleDeleteClick(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    onDelete(notif.id);
  }

  return (
    <div
      className={`nm-card ${notif.read ? "nm-card--read" : "nm-card--unread"}`}
      onClick={() => onOpen(notif)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(notif)}
    >
      {!notif.read && <span className="nm-dot" aria-hidden="true" />}
      <span className="nm-card-icon" aria-hidden="true">{notif.icon}</span>
      <div className="nm-card-content">
        <span className="nm-card-title">{notif.title}</span>
        <span className="nm-card-preview">
          {notif.message.length > 80 ? notif.message.slice(0, 80) + "…" : notif.message}
        </span>
        <span className="nm-card-date">{formatDate(notif.createdAt)}</span>
      </div>
      <button
        className="nm-delete-btn"
        aria-label="Eliminar notificación"
        type="button"
        onMouseDown={handleDeleteClick}
        onTouchEnd={handleDeleteClick}
      >
        ✕
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Modal principal
// ═══════════════════════════════════════════════════════════
export function NotificationModal({
  notifications, userRole, onClose,
  onMarkOneRead, onMarkAllRead, onDeleteOne, onDeleteAll,
}: NotificationModalProps) {
  const [selected, setSelected]         = useState<AdminNotif | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null); else onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Si la notif seleccionada fue eliminada, volver a la lista
  useEffect(() => {
    if (selected && !notifications.find((n) => n.id === selected.id)) {
      setSelected(null);
    }
  }, [notifications, selected]);

  const handleOpen = async (n: AdminNotif) => {
    setSelected(n);
    if (!n.read) await onMarkOneRead(n.id);
  };

  const handleDeleteOne = async (id: string) => {
    if (selected?.id === id) setSelected(null);
    await onDeleteOne(id);
  };

  const handleDeleteAll = async () => {
    setSelected(null);
    setConfirmClear(false);
    await onDeleteAll();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const bodyHasLink = selected ? /https?:\/\//.test(selected.message) : false;

  return (
    <>
      <style>{`
        .nm-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);
          backdrop-filter:blur(3px);display:flex;align-items:flex-end;
          justify-content:center;animation:nm-fi .18s ease}
        @media(min-width:600px){.nm-overlay{align-items:center}}
        @keyframes nm-fi{from{opacity:0}to{opacity:1}}

        .nm-panel{position:relative;width:100%;max-width:540px;background:#0f0f13;
          border:1px solid rgba(255,255,255,.08);border-radius:20px 20px 0 0;
          max-height:88svh;display:flex;flex-direction:column;overflow:hidden;
          animation:nm-su .22s cubic-bezier(.34,1.56,.64,1)}
        @media(min-width:600px){.nm-panel{border-radius:20px;max-height:82svh}}
        @keyframes nm-su{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}

        .nm-handle{width:40px;height:4px;background:rgba(255,255,255,.18);
          border-radius:2px;margin:10px auto 0;flex-shrink:0}
        @media(min-width:600px){.nm-handle{display:none}}

        .nm-header{display:flex;align-items:center;justify-content:space-between;
          padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
        .nm-header-left{display:flex;align-items:center;gap:10px}
        .nm-title{font-size:1.05rem;font-weight:700;color:#fff;letter-spacing:-.01em}
        .nm-badge{background:#e84040;color:#fff;font-size:.7rem;font-weight:800;
          border-radius:99px;padding:2px 7px;min-width:22px;text-align:center;line-height:1.4}
        .nm-header-actions{display:flex;gap:8px;align-items:center}

        .nm-action-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
          color:#aaa;font-size:.75rem;font-weight:600;padding:5px 11px;border-radius:8px;
          cursor:pointer;transition:background .15s,color .15s;white-space:nowrap}
        .nm-action-btn:hover{background:rgba(255,255,255,.12);color:#fff}
        .nm-action-btn--danger:hover{background:rgba(232,64,64,.18);color:#e84040;
          border-color:rgba(232,64,64,.3)}

        .nm-close-btn,.nm-back-btn{background:rgba(255,255,255,.06);color:#888;
          width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;
          display:flex;align-items:center;justify-content:center;
          transition:background .15s;flex-shrink:0;border:none}
        .nm-close-btn:hover,.nm-back-btn:hover{background:rgba(255,255,255,.12);color:#fff}

        .nm-confirm-bar{background:rgba(232,64,64,.1);border-bottom:1px solid rgba(232,64,64,.2);
          padding:10px 20px;display:flex;align-items:center;justify-content:space-between;
          gap:12px;flex-shrink:0}
        .nm-confirm-bar p{color:#e84040;font-size:.8rem;font-weight:600;margin:0}
        .nm-confirm-btns{display:flex;gap:8px}
        .nm-confirm-yes{background:#e84040;color:#fff;border:none;padding:5px 14px;
          border-radius:7px;font-size:.78rem;font-weight:700;cursor:pointer}
        .nm-confirm-no{background:rgba(255,255,255,.07);color:#aaa;
          border:1px solid rgba(255,255,255,.1);padding:5px 14px;
          border-radius:7px;font-size:.78rem;cursor:pointer}

        .nm-list{overflow-y:auto;flex:1;padding:8px 0;overscroll-behavior:contain}
        .nm-list::-webkit-scrollbar{width:4px}
        .nm-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}

        .nm-empty{display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:10px;padding:60px 20px;
          color:rgba(255,255,255,.25);font-size:.9rem}
        .nm-empty-icon{font-size:2.5rem;opacity:.35}

        .nm-card{display:flex;align-items:flex-start;gap:10px;padding:13px 20px;
          cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);
          transition:background .12s;position:relative;outline:none;user-select:none}
        .nm-card:hover{background:rgba(255,255,255,.04)}
        .nm-card:focus-visible{background:rgba(255,255,255,.06)}
        .nm-card:last-child{border-bottom:none}
        .nm-card--unread{background:rgba(99,179,255,.04)}

        .nm-dot{width:8px;height:8px;background:#5b9fff;border-radius:50%;
          flex-shrink:0;margin-top:6px}
        .nm-card-icon{font-size:1.3rem;flex-shrink:0;margin-top:1px}
        .nm-card-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
        .nm-card-title{font-size:.88rem;font-weight:700;color:#e8e8f0;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .nm-card-preview{font-size:.80rem;color:rgba(255,255,255,.45);line-height:1.4;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .nm-card-date{font-size:.72rem;color:rgba(255,255,255,.25);margin-top:2px}

        .nm-delete-btn{background:none;border:none;color:rgba(255,255,255,.25);
          cursor:pointer;font-size:.85rem;border-radius:6px;flex-shrink:0;
          transition:color .15s,background .15s;align-self:center;
          min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center}
        .nm-delete-btn:hover{color:#e84040;background:rgba(232,64,64,.12)}
        .nm-delete-btn:active{background:rgba(232,64,64,.22)}

        .nm-detail{flex:1;overflow-y:auto;display:flex;flex-direction:column;
          animation:nm-fi .16s ease}
        .nm-detail-header{display:flex;align-items:center;gap:10px;
          padding:14px 20px 12px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
        .nm-detail-title{font-size:.95rem;font-weight:700;color:#fff;flex:1;min-width:0}
        .nm-detail-body{padding:20px;flex:1}
        .nm-detail-meta{font-size:.75rem;color:rgba(255,255,255,.3);margin-bottom:16px;
          display:flex;flex-wrap:wrap;gap:6px;align-items:center}
        .nm-meta-tag{background:rgba(255,255,255,.06);border-radius:6px;
          padding:2px 8px;font-size:.7rem;color:rgba(255,255,255,.4)}

        .nm-body-text{font-size:.9rem;color:rgba(255,255,255,.75);line-height:1.7;
          white-space:pre-wrap;word-break:break-word;margin:0}
        .nm-link{color:#5b9fff;text-decoration:underline;word-break:break-all;transition:color .15s}
        .nm-link:hover{color:#7fb3ff}

        .nm-pro-notice{margin-top:16px;background:rgba(255,190,50,.07);
          border:1px solid rgba(255,190,50,.18);border-radius:10px;
          padding:10px 14px;font-size:.77rem;color:rgba(255,190,50,.8);line-height:1.5}
      `}</style>

      <div
        className="nm-overlay"
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-label="Notificaciones"
      >
        <div className="nm-panel">
          <div className="nm-handle" />

          {/* ── Header ── */}
          <div className="nm-header">
            <div className="nm-header-left">
              {selected && (
                <button className="nm-back-btn" onClick={() => setSelected(null)} aria-label="Volver">
                  ←
                </button>
              )}
              <span className="nm-title">{selected ? "Detalle" : "Notificaciones"}</span>
              {!selected && unreadCount > 0 && (
                <span className="nm-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </div>
            <div className="nm-header-actions">
              {!selected && notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <button className="nm-action-btn" onClick={onMarkAllRead}>
                      Leer todas
                    </button>
                  )}
                  <button
                    className="nm-action-btn nm-action-btn--danger"
                    onClick={() => setConfirmClear(true)}
                  >
                    Limpiar
                  </button>
                </>
              )}
              <button className="nm-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
            </div>
          </div>

          {/* ── Confirm limpiar todo ── */}
          {confirmClear && !selected && (
            <div className="nm-confirm-bar">
              <p>¿Eliminar todas las notificaciones?</p>
              <div className="nm-confirm-btns">
                <button className="nm-confirm-yes" onClick={handleDeleteAll}>
                  Sí, limpiar
                </button>
                <button className="nm-confirm-no" onClick={() => setConfirmClear(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── Vista detalle ── */}
          {selected ? (
            <div className="nm-detail">
              <div className="nm-detail-header">
                <span className="nm-card-icon">{selected.icon}</span>
                <span className="nm-detail-title">{selected.title}</span>
                <button
                  className="nm-delete-btn"
                  aria-label="Eliminar notificación"
                  type="button"
                  onClick={() => handleDeleteOne(selected.id)}
                >
                  ✕
                </button>
              </div>
              <div className="nm-detail-body">
                <div className="nm-detail-meta">
                  <span>{formatDate(selected.createdAt)}</span>
                  {selected.senderName && (
                    <span className="nm-meta-tag">✉ {selected.senderName}</span>
                  )}
                  {selected.fromSuperAdmin && (
                    <span className="nm-meta-tag">🛡 SuperAdmin</span>
                  )}
                  {selected.fromSystem && (
                    <span className="nm-meta-tag">⚙ Sistema</span>
                  )}
                </div>
                <RenderBody body={selected.message} role={userRole} />
                {!canSeeLinks(userRole) && bodyHasLink && (
                  <div className="nm-pro-notice">
                    🔒 Este mensaje contiene enlaces. Actualizá tu cuenta a{" "}
                    <strong>Pro</strong> para verlos y abrirlos.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Lista ── */
            <div className="nm-list" role="list">
              {notifications.length === 0 ? (
                <div className="nm-empty">
                  <span className="nm-empty-icon">🔔</span>
                  <span>No tenés notificaciones</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotiCard
                    key={n.id}
                    notif={n}
                    onOpen={handleOpen}
                    onDelete={handleDeleteOne}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}