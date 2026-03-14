"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Swords, X, Check, Clock } from "lucide-react";
import { io } from "socket.io-client";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface BattleInvitation {
  roomId:        string;
  battleId:      string;
  nombre:        string;
  categorias:    string[];
  creadorId:     string;
  creadorName:   string;
  creadorAvatar: string | null;
  expiresAt:     string;
  communityId:   string | null;
}

interface Props {
  invitation: BattleInvitation;
  token:      string;
  onClose:    () => void;
}

export default function BattleInvitationModal({ invitation, token, onClose }: Props) {
  const router  = useRouter();
  const [secsLeft, setSecsLeft] = useState(0);
  const [loading, setLoading]   = useState<"accept" | "decline" | null>(null);

  // ── Countdown ───────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(invitation.expiresAt).getTime() - Date.now()) / 1000));
      setSecsLeft(diff);
      if (diff === 0) onClose();
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [invitation.expiresAt, onClose]);

  // ── Aceptar ─────────────────────────────────────────────
  const accept = useCallback(async () => {
    if (loading) return;
    setLoading("accept");
    try {
      // 1. Llamar al endpoint HTTP para marcar como "accepted" en la DB
      await fetch(`${API}/battles/${invitation.roomId}/accept`, {
        method:      "POST",
        credentials: "include",
        headers:     { Authorization: `Bearer ${token}` },
      });

      // ✅ FIX 2: hacer socket join a la battle room ANTES de navegar
      // Esto garantiza que el invitado recibirá battle:game_start
      // cuando el creador pulse "Iniciar" o cuando pasen los 15s
      const tempSocket = io(API, {
        auth:            { token },
        withCredentials: true,
        transports:      ["websocket"],
      });

      await new Promise<void>((resolve) => {
        const doJoin = () => {
          tempSocket.emit("battle:join", { roomId: invitation.roomId }, (res: any) => {
            console.log("[BattleInvitationModal] battle:join ack:", res);
            resolve();
          });
        };
        if (tempSocket.connected) doJoin();
        else tempSocket.once("connect", doJoin);

        // Timeout de seguridad: si no responde en 3s, continuar igual
        setTimeout(resolve, 3000);
      });

      // Desconectar el socket temporal — BatallaPage creará el suyo propio
      tempSocket.disconnect();

      onClose();
      router.push(`/batalla/${invitation.roomId}`);
    } catch (err) {
      console.error("[BattleInvitationModal] accept error:", err);
      setLoading(null);
    }
  }, [loading, token, invitation.roomId, router, onClose]);

  // ── Rechazar ─────────────────────────────────────────────
  const decline = useCallback(async () => {
    if (loading) return;
    setLoading("decline");
    try {
      await fetch(`${API}/battles/${invitation.roomId}/decline`, {
        method:      "POST",
        credentials: "include",
        headers:     { Authorization: `Bearer ${token}` },
      });
    } catch {}
    onClose();
  }, [loading, token, invitation.roomId, onClose]);

  const pct  = Math.max(0, (secsLeft / 120) * 100);
  const cats = invitation.categorias.includes("todas")
    ? ["Todas las categorías"]
    : invitation.categorias.slice(0, 3);

  return createPortal(
    <div style={{
      position:   "fixed", inset: 0, zIndex: 99999,
      display:    "flex", alignItems: "flex-end", justifyContent: "center",
      padding:    "0 0 32px",
      pointerEvents: "none",
    }}>
      <div style={{
        pointerEvents:  "auto",
        width:          "100%",
        maxWidth:       420,
        margin:         "0 16px",
        background:     "linear-gradient(160deg, #0f0f1e 0%, #14101f 100%)",
        border:         "1px solid rgba(249,115,22,0.35)",
        borderRadius:   20,
        boxShadow:      "0 24px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(249,115,22,0.12)",
        overflow:       "hidden",
        animation:      "slideUp 0.35s cubic-bezier(.175,.885,.32,1.275)",
      }}>
        {/* Barra de tiempo */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
          <div style={{
            height:     "100%",
            width:      `${pct}%`,
            background: pct > 40 ? "#f97316" : "#ef4444",
            transition: "width 1s linear, background 0.4s",
          }} />
        </div>

        {/* Header */}
        <div style={{ padding: "16px 18px 12px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #f97316, #e05000)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(249,115,22,0.4)", flexShrink: 0,
          }}>
            <Swords size={22} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.65rem", color: "#f97316", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
              ⚔️ Invitación a batalla
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {invitation.nombre}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: secsLeft < 30 ? "#ef4444" : "#9ca3af", fontSize: "0.78rem", flexShrink: 0 }}>
            <Clock size={12} />
            {secsLeft}s
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "none",
            color: "#6b7280", width: 28, height: 28, borderRadius: 8,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Creador */}
        <div style={{ padding: "0 18px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={invitation.creadorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${invitation.creadorName}`}
            alt={invitation.creadorName}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(249,115,22,0.4)" }}
          />
          <div>
            <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>Te desafió </span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff" }}>@{invitation.creadorName}</span>
          </div>
        </div>

        {/* Categorías */}
        {cats.length > 0 && (
          <div style={{ padding: "0 18px 14px", display: "flex", flexWrap: "wrap", gap: 5 }}>
            {cats.map((c) => (
              <span key={c} style={{
                fontSize: "0.68rem", padding: "3px 9px", borderRadius: 20,
                background: "rgba(249,115,22,0.1)", color: "#f97316",
                border: "1px solid rgba(249,115,22,0.22)",
              }}>{c}</span>
            ))}
            {invitation.categorias.length > 3 && (
              <span style={{ fontSize: "0.68rem", color: "#6b7280" }}>+{invitation.categorias.length - 3} más</span>
            )}
          </div>
        )}

        {/* Botones */}
        <div style={{ padding: "0 18px 18px", display: "flex", gap: 10 }}>
          <button
            onClick={decline}
            disabled={!!loading}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 12,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444", fontWeight: 700, fontSize: "0.88rem",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading === "decline" ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <X size={15} /> Rechazar
          </button>
          <button
            onClick={accept}
            disabled={!!loading}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 12,
              background: "linear-gradient(135deg, #f97316, #e05000)",
              border: "none", color: "#fff", fontWeight: 800, fontSize: "0.88rem",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading === "accept" ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0 4px 18px rgba(249,115,22,0.4)",
            }}
          >
            {loading === "accept"
              ? <span style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
              : <><Check size={15} /> ¡Aceptar!</>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp  { from { opacity:0; transform:translateY(60px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes spin     { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body,
  );
}