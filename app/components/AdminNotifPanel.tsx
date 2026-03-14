// components/AdminNotifPanel.tsx
"use client";

import { useRouter } from "next/navigation";
import type { AdminNotif } from "../hooks/useAdminNotifications";

const TYPE_COLORS: Record<string, string> = {
  ban:    "#e63946",
  freeze: "#a8daff",
  warn:   "#f39c12",
  role:   "#64dc78",
  admin:  "#7c83fd",
};

const TYPE_BG: Record<string, string> = {
  ban:    "rgba(230,57,70,.10)",
  freeze: "rgba(168,218,255,.08)",
  warn:   "rgba(243,156,18,.10)",
  role:   "rgba(100,220,120,.08)",
  admin:  "rgba(124,131,253,.10)",
};

interface Props {
  notifications: AdminNotif[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
  onClear: () => void;
  style?: React.CSSProperties;
}

export default function AdminNotifPanel({
  notifications,
  onClose,
  onMarkAllRead,
  onMarkOneRead,
  onClear,
  style,
}: Props) {
  const router = useRouter();

  function handleClick(n: AdminNotif) {
    onMarkOneRead(n.id);
    if (n.link) {
      router.push(n.link);
      onClose();
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 320,
        background: "#13131f",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,.5)",
        zIndex: 9999,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px 10px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}>
        <span style={{ fontWeight: 600, fontSize: ".85rem", letterSpacing: ".03em" }}>
          Notificaciones
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {notifications.some((n) => !n.read) && (
            <button onClick={onMarkAllRead} style={btnStyle("#7c83fd")}>
              Leer todas
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={onClear} style={btnStyle("#666")}>
              Limpiar
            </button>
          )}
          <button onClick={onClose} style={btnStyle("#555")}>✕</button>
        </div>
      </div>

      {/* Lista */}
      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "#555",
            fontSize: ".82rem",
          }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>🔔</div>
            No hay notificaciones
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: "flex",
                gap: 10,
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,.04)",
                background: n.read ? "transparent" : TYPE_BG[n.type] || "rgba(124,131,253,.06)",
                cursor: n.link ? "pointer" : "default",
                transition: "background .15s",
              }}
            >
              {/* Ícono */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: (TYPE_COLORS[n.type] || "#7c83fd") + "22",
                border: `1px solid ${(TYPE_COLORS[n.type] || "#7c83fd")}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                flexShrink: 0,
              }}>
                {n.icon}
              </div>

              {/* Texto */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: ".78rem",
                  fontWeight: n.read ? 400 : 600,
                  marginBottom: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  {n.title}
                  {!n.read && (
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: TYPE_COLORS[n.type] || "#7c83fd",
                      flexShrink: 0,
                    }} />
                  )}
                </div>
                <div style={{
                  fontSize: ".72rem",
                  color: "#888",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  {n.message}
                </div>
                <div style={{
                  fontSize: ".62rem",
                  color: "#555",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span>{new Date(n.createdAt).toLocaleString("es-AR")}</span>
                  {n.link && (
                    <span style={{ color: TYPE_COLORS[n.type] || "#7c83fd" }}>
                      Ver →
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${color}44`,
    color,
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: ".68rem",
    cursor: "pointer",
  };
}