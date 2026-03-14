"use client";

// ══════════════════════════════════════════════════════════════
// ChatWithComunidades.tsx
// Integra la lista de comunidades del usuario directamente
// en la pestaña "Comunidades" del /chat — sin cambiar de ruta.
// Funcionalidades:
//   • Ver comunidades donde el user es miembro
//   • Entrar a una comunidad (router.push /comunidad/[id])
//   • Salir de una comunidad
//   • Badge de mensajes no leídos por comunidad (via socket)
//   • Notificaciones de invitaciones pendientes
//   • Buscar entre tus comunidades
//   • Crear nueva comunidad (modal inline)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Globe, Search, Bell, Plus, LogOut, ChevronRight,
  Crown, Shield, MessageSquare, UserPlus, X, Check, Loader2,
  AlertCircle, Zap, Hash,
} from "lucide-react";

const API    = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL  || "http://localhost:5000";

// ─── Types ──────────────────────────────────────────────────
interface MyCommunity {
  _id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
  likeCount: number;
  creatorId: string;
  role: "admin" | "member";
  messagingOpen: boolean;
  unread?: number;       // mensajes nuevos desde última visita
  lastMessage?: string;  // preview
  lastActivity?: string; // ISO date
}

interface CommunityInvite {
  _id: string;
  communityId: string;
  communityName: string;
  communityAvatar?: string;
  invitedBy: string;
  invitedByUsername: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────
function isVid(url?: string) {
  return !!url && /\.(mp4|webm|mov|gif)(\?|$)/i.test(url);
}

function CommunityAvatar({ url, name, size = 44 }: { url?: string; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      overflow: "hidden", position: "relative",
      background: "linear-gradient(135deg,#1a0a14,#0a0a1e)",
      border: "2px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {url
        ? isVid(url)
          ? <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} autoPlay muted loop playsInline />
          : <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
        : <Globe size={Math.round(size * 0.45)} color="rgba(240,240,252,0.3)" />
      }
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span style={{
      minWidth: 18, height: 18, borderRadius: 9,
      background: "linear-gradient(135deg,#e63946,#c1121f)",
      color: "white", fontSize: ".62rem", fontWeight: 800,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 5px", flexShrink: 0,
      boxShadow: "0 2px 8px rgba(230,57,70,0.45)",
      fontFamily: "DM Sans, sans-serif",
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Create Community Modal ───────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,    setName]    = useState("");
  const [desc,    setDesc]    = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const tok = () => localStorage.getItem("nakama_token") ?? "";

  async function create() {
    if (!name.trim()) { setErr("El nombre es requerido."); return; }
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/comunidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      const d = await r.json();
      if (r.ok) { onCreated(); onClose(); }
      else setErr(d.message || "Error al crear.");
    } catch { setErr("Error de conexión."); }
    setLoading(false);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeIn .15s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#13132a", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18, width: "100%", maxWidth: 380,
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          animation: "fadeSlideUp .2s ease",
        }}
      >
        {/* header */}
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#e63946,#a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Users size={15} color="white" />
          </div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", color: "#f0f0fc", flex: 1 }}>
            Nueva comunidad
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,240,252,0.4)", display: "flex", padding: 4 }}>
            <X size={17} />
          </button>
        </div>

        {/* body */}
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: ".72rem", color: "rgba(240,240,252,0.45)", marginBottom: 6, fontFamily: "DM Sans,sans-serif", fontWeight: 600 }}>
              Nombre *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && create()}
              placeholder="Mi comunidad..."
              maxLength={60}
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                padding: "9px 12px", color: "#f0f0fc",
                fontSize: ".85rem", fontFamily: "DM Sans,sans-serif",
                outline: "none", transition: "border-color .15s",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(230,57,70,0.4)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: ".72rem", color: "rgba(240,240,252,0.45)", marginBottom: 6, fontFamily: "DM Sans,sans-serif", fontWeight: 600 }}>
              Descripción (opcional)
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="¿De qué trata tu comunidad?"
              maxLength={200}
              rows={3}
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                padding: "9px 12px", color: "#f0f0fc",
                fontSize: ".82rem", fontFamily: "DM Sans,sans-serif",
                outline: "none", resize: "none", transition: "border-color .15s",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(230,57,70,0.4)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          {err && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", borderRadius: 9, background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.2)", fontSize: ".75rem", color: "#e63946", fontFamily: "DM Sans,sans-serif" }}>
              <AlertCircle size={13} /> {err}
            </div>
          )}

          <button
            onClick={create}
            disabled={loading || !name.trim()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px 0", borderRadius: 11,
              background: "linear-gradient(135deg,#e63946,#a855f7)",
              border: "none", color: "white", fontSize: ".85rem", fontWeight: 700,
              fontFamily: "Syne,sans-serif", cursor: loading || !name.trim() ? "not-allowed" : "pointer",
              opacity: loading || !name.trim() ? 0.5 : 1, transition: "opacity .15s",
            }}
          >
            {loading ? <Loader2 size={15} style={{ animation: "spin .8s linear infinite" }} /> : <Plus size={15} />}
            Crear comunidad
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Card ─────────────────────────────────────────────
function InviteCard({ inv, onAction }: { inv: CommunityInvite; onAction: () => void }) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const tok = () => localStorage.getItem("nakama_token") ?? "";

  async function respond(accept: boolean) {
    setLoading(accept ? "accept" : "reject");
    try {
      await fetch(`${API}/comunidades/${inv.communityId}/invite/${inv._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ action: accept ? "accept" : "reject" }),
      });
      onAction();
    } catch {}
    setLoading(null);
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11,
      padding: "10px 14px",
      background: "rgba(230,57,70,0.05)",
      border: "1px solid rgba(230,57,70,0.12)",
      borderRadius: 12, marginBottom: 6,
      animation: "fadeSlideUp .2s ease",
    }}>
      <CommunityAvatar url={inv.communityAvatar} name={inv.communityName} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: ".8rem", fontWeight: 700, color: "#f0f0fc", fontFamily: "Syne,sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {inv.communityName}
        </div>
        <div style={{ fontSize: ".68rem", color: "rgba(240,240,252,0.4)", display: "flex", alignItems: "center", gap: 4, marginTop: 2, fontFamily: "DM Sans,sans-serif" }}>
          <UserPlus size={10} /> @{inv.invitedByUsername} te invitó
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => respond(true)}
          disabled={!!loading}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg,#34d399,#059669)",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: loading ? 0.6 : 1, transition: "opacity .15s",
          }}
        >
          {loading === "accept" ? <Loader2 size={13} color="white" style={{ animation: "spin .8s linear infinite" }} /> : <Check size={13} color="white" />}
        </button>
        <button
          onClick={() => respond(false)}
          disabled={!!loading}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: loading ? 0.6 : 1, transition: "opacity .15s",
          }}
        >
          {loading === "reject" ? <Loader2 size={13} color="rgba(240,240,252,0.5)" style={{ animation: "spin .8s linear infinite" }} /> : <X size={13} color="rgba(240,240,252,0.5)" />}
        </button>
      </div>
    </div>
  );
}

// ─── Community Row ────────────────────────────────────────────
function CommunityRow({
  community, currentUserId, onEnter, onLeave, onUpdate,
}: {
  community: MyCommunity;
  currentUserId: string;
  onEnter: (id: string) => void;
  onLeave: (id: string) => void;
  onUpdate: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const isAdmin = community.role === "admin" || community.creatorId === currentUserId;

  function handleLeave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Salir de "${community.name}"?`)) return;
    setLeaving(true);
    onLeave(community._id);
  }

  return (
    <div
      onClick={() => onEnter(community._id)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", borderRadius: 12, cursor: "pointer",
        background: "transparent",
        border: "1px solid transparent",
        transition: "background .15s, border-color .15s",
        position: "relative",
        opacity: leaving ? 0.5 : 1,
        animation: "fadeSlideUp .2s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = "transparent";
        (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
      }}
    >
      {/* Avatar with online indicator */}
      <div style={{ position: "relative" }}>
        <CommunityAvatar url={community.avatarUrl} name={community.name} size={46} />
        {/* unread dot */}
        {(community.unread ?? 0) > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            width: 12, height: 12, borderRadius: "50%",
            background: "#e63946", border: "2.5px solid #080814",
            boxShadow: "0 0 8px rgba(230,57,70,0.6)",
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: ".85rem", fontWeight: 700, color: "#f0f0fc",
          fontFamily: "Syne,sans-serif",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {community.name}
          {isAdmin && <Crown size={11} color="#fbbf24" />}
          {community.role === "admin" && !isAdmin && <Shield size={11} color="#a855f7" />}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginTop: 3,
          fontSize: ".69rem", color: "rgba(240,240,252,0.38)", fontFamily: "DM Sans,sans-serif",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Users size={9} /> {community.memberCount}
          </span>
          {community.lastMessage ? (
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
              {community.lastMessage}
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {community.messagingOpen
                ? <><MessageSquare size={9} /> Abierto</>
                : <><Shield size={9} /> Solo admins</>
              }
            </span>
          )}
        </div>
      </div>

      {/* Right side: unread badge + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <UnreadBadge count={community.unread ?? 0} />

        {/* Leave button — only for non-creator members */}
        {community.creatorId !== currentUserId && (
          <button
            onClick={handleLeave}
            disabled={leaving}
            title="Salir de la comunidad"
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: leaving ? "not-allowed" : "pointer",
              color: "rgba(240,240,252,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .15s", flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(230,57,70,0.1)";
              (e.currentTarget as HTMLButtonElement).style.color = "#e63946";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(230,57,70,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,240,252,0.35)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            {leaving ? <Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} /> : <LogOut size={12} />}
          </button>
        )}

        <ChevronRight size={14} color="rgba(240,240,252,0.2)" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT — drop this inside your Chat tab
// ══════════════════════════════════════════════════════════════
interface Props {
  currentUserId: string;
  currentUsername?: string;
}

export default function ComunidadesTab({ currentUserId, currentUsername }: Props) {
  const router = useRouter();

  const [communities, setCommunities] = useState<MyCommunity[]>([]);
  const [invites,     setInvites]     = useState<CommunityInvite[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [showCreate,  setShowCreate]  = useState(false);
  const [showInvites, setShowInvites] = useState(false);

  // unread counts managed locally, updated via socket
  const unreadRef = useRef<Record<string, number>>({});

  const tok = useCallback(() => localStorage.getItem("nakama_token") ?? "", []);

  // ── Load my communities ────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/comunidades/mis-comunidades`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (r.ok) {
        const data: MyCommunity[] = await r.json();
        // merge with stored unread counts
        setCommunities(data.map(c => ({ ...c, unread: unreadRef.current[c._id] ?? 0 })));
      }
    } catch {}
    setLoading(false);
  }, [tok]);

  // ── Load invites ───────────────────────────────────────────
  const loadInvites = useCallback(async () => {
    try {
      const r = await fetch(`${API}/comunidades/invites/pending`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (r.ok) {
        const data = await r.json();
        setInvites(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, [tok]);

  useEffect(() => { load(); loadInvites(); }, [load, loadInvites]);

  // ── Socket: listen for new messages in my communities ─────
  useEffect(() => {
    if (!currentUserId) return;
    let socket: any = null;

    import("socket.io-client").then(({ io }) => {
      socket = io(WS_URL, {
        auth: { token: tok() },
        transports: ["websocket"],
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        // join all my community rooms
        communities.forEach(c => {
          socket.emit("room:join", { roomType: "community", roomId: c._id }, () => {});
        });
      });

      // new message in a community → increment unread
      socket.on("message:new", (msg: any) => {
        const roomId = msg.roomId || msg.communityId;
        if (!roomId) return;
        // don't count your own messages
        const senderId = msg.sender?._id ?? msg.senderId;
        if (String(senderId) === String(currentUserId)) return;

        unreadRef.current[roomId] = (unreadRef.current[roomId] ?? 0) + 1;
        setCommunities(prev =>
          prev.map(c => c._id === roomId ? { ...c, unread: unreadRef.current[roomId], lastMessage: msg.text?.slice(0, 60) } : c)
        );
      });

      // invite received
      socket.on("community:invite", () => {
        loadInvites();
      });

      // member count updates
      socket.on("community:member_count", ({ communityId, memberCount }: any) => {
        setCommunities(prev => prev.map(c => c._id === communityId ? { ...c, memberCount } : c));
      });
    }).catch(console.error);

    return () => { socket?.disconnect(); };
  }, [currentUserId, communities.length]); // eslint-disable-line

  // ── Enter community (clear unread) ────────────────────────
  function handleEnter(id: string) {
    unreadRef.current[id] = 0;
    setCommunities(prev => prev.map(c => c._id === id ? { ...c, unread: 0 } : c));
    router.push(`/comunidad/${id}`);
  }

  // ── Leave community ────────────────────────────────────────
  async function handleLeave(id: string) {
    try {
      await fetch(`${API}/comunidades/${id}/leave`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      setCommunities(prev => prev.filter(c => c._id !== id));
    } catch {}
  }

  // ── Filtered list ──────────────────────────────────────────
  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread  = communities.reduce((s, c) => s + (c.unread ?? 0), 0);
  const pendingCount = invites.length;

  // ══ RENDER ═══════════════════════════════════════════════
  return (
    <>
      <style>{`
        @keyframes spin        { to { transform: rotate(360deg) } }
        @keyframes fadeIn      { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column", height: "100%",
        background: "#080814", color: "#f0f0fc",
        fontFamily: "DM Sans, sans-serif",
        overflow: "hidden",
      }}>

        {/* ── TOP BAR ─────────────────────────────────────── */}
        <div style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: "Syne,sans-serif", fontSize: "1rem", fontWeight: 800, color: "#f0f0fc", display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={16} color="#e63946" /> Mis comunidades
                {totalUnread > 0 && <UnreadBadge count={totalUnread} />}
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: ".69rem", color: "rgba(240,240,252,0.35)" }}>
                {communities.length} comunidad{communities.length !== 1 ? "es" : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {/* Invites bell */}
              <button
                onClick={() => setShowInvites(v => !v)}
                title="Invitaciones"
                style={{
                  position: "relative", width: 34, height: 34, borderRadius: 9,
                  background: showInvites ? "rgba(230,57,70,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${showInvites ? "rgba(230,57,70,0.25)" : "rgba(255,255,255,0.09)"}`,
                  cursor: "pointer", color: showInvites ? "#e63946" : "rgba(240,240,252,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}
              >
                <Bell size={15} />
                {pendingCount > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "#e63946", color: "white",
                    fontSize: ".58rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid #080814",
                  }}>
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </button>

              {/* Create community */}
              <button
                onClick={() => setShowCreate(true)}
                title="Crear comunidad"
                style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: "linear-gradient(135deg,#e63946,#a855f7)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 3px 12px rgba(230,57,70,0.35)",
                  transition: "opacity .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                <Plus size={16} color="white" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "8px 12px",
            transition: "border-color .15s",
          }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(230,57,70,0.3)")}
            onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          >
            <Search size={13} color="rgba(240,240,252,0.3)" style={{ flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar comunidad..."
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#f0f0fc", fontSize: ".8rem", fontFamily: "DM Sans,sans-serif",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,240,252,0.3)", display: "flex", padding: 2 }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── INVITES PANEL ────────────────────────────────── */}
        {showInvites && invites.length > 0 && (
          <div style={{
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(230,57,70,0.025)",
            flexShrink: 0,
          }}>
            <p style={{ margin: "0 0 8px", fontSize: ".68rem", fontWeight: 700, color: "rgba(240,240,252,0.45)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Invitaciones pendientes
            </p>
            {invites.map(inv => (
              <InviteCard
                key={inv._id}
                inv={inv}
                onAction={() => { loadInvites(); load(); }}
              />
            ))}
          </div>
        )}
        {showInvites && invites.length === 0 && (
          <div style={{ padding: "10px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: ".75rem", color: "rgba(240,240,252,0.3)", textAlign: "center", fontFamily: "DM Sans,sans-serif" }}>
              No tenés invitaciones pendientes
            </p>
          </div>
        )}

        {/* ── COMMUNITY LIST ───────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <Loader2 size={22} color="#e63946" style={{ animation: "spin .8s linear infinite", opacity: 0.5 }} />
            </div>
          )}

          {!loading && communities.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "60%", gap: 14, padding: "40px 24px", textAlign: "center",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Users size={28} color="rgba(230,57,70,0.5)" />
              </div>
              <div>
                <p style={{ margin: "0 0 6px", fontFamily: "Syne,sans-serif", fontSize: ".9rem", fontWeight: 700, color: "rgba(240,240,252,0.7)" }}>
                  No estás en ninguna comunidad
                </p>
                <p style={{ margin: 0, fontSize: ".77rem", color: "rgba(240,240,252,0.35)", lineHeight: 1.5 }}>
                  Creá la tuya o esperá una invitación
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 20px", borderRadius: 10,
                  background: "linear-gradient(135deg,#e63946,#a855f7)",
                  border: "none", color: "white",
                  fontSize: ".8rem", fontWeight: 700, fontFamily: "Syne,sans-serif",
                  cursor: "pointer", boxShadow: "0 4px 16px rgba(230,57,70,0.3)",
                }}
              >
                <Plus size={14} /> Crear comunidad
              </button>
            </div>
          )}

          {!loading && filtered.length === 0 && communities.length > 0 && (
            <p style={{ textAlign: "center", fontSize: ".77rem", color: "rgba(240,240,252,0.3)", padding: "24px 0" }}>
              Sin resultados para "{search}"
            </p>
          )}

          {/* Rows sorted: with unread first */}
          {[...filtered]
            .sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0))
            .map(c => (
              <CommunityRow
                key={c._id}
                community={c}
                currentUserId={currentUserId}
                onEnter={handleEnter}
                onLeave={handleLeave}
                onUpdate={load}
              />
            ))
          }

          {/* Discover more */}
          {!loading && communities.length > 0 && (
            <button
              onClick={() => router.push("/comunidades")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                width: "100%", padding: "10px 0", marginTop: 8, borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)",
                color: "rgba(240,240,252,0.4)", fontSize: ".76rem", fontFamily: "DM Sans,sans-serif",
                cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,240,252,0.65)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,240,252,0.4)";
              }}
            >
              <Hash size={12} /> Explorar más comunidades
            </button>
          )}
        </div>
      </div>

      {/* ── CREATE MODAL ──────────────────────────────────── */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </>
  );
}


// ══════════════════════════════════════════════════════════════
// USAGE EXAMPLE — dentro de tu chat/page.tsx
// ══════════════════════════════════════════════════════════════
//
// import ComunidadesTab from "./ChatWithComunidades";
//
// const [activeTab, setActiveTab] = useState<"chats" | "comunidades">("chats");
// const { user } = useAuth();
//
// return (
//   <div style={{ display:"flex", height:"100dvh" }}>
//     {/* sidebar */}
//     <div style={{ width:320, display:"flex", flexDirection:"column" }}>
//       {/* tab buttons */}
//       <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
//         <button onClick={() => setActiveTab("chats")}    ...>Chats</button>
//         <button onClick={() => setActiveTab("comunidades")} ...>Comunidades</button>
//       </div>
//
//       {/* content */}
//       {activeTab === "chats"
//         ? <YourChatsListComponent />
//         : <ComunidadesTab currentUserId={user.id} currentUsername={user.username} />
//       }
//     </div>
//
//     {/* right panel: active chat */}
//     <div style={{ flex:1 }}> ... </div>
//   </div>
// );