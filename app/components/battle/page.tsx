"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/authContext";
import type { BattlePlayer, BattleState } from "../../hooks/useBattleSocket";
import { io, Socket } from "socket.io-client";
import BattleGame from "../../batallapage/BattleGame";
import BattleFinisher from "../../batallapage/Battlefinisher";

const API = "https://nakama-backend-render.onrender.com";

interface RoomData {
  roomId: string;
  battleId: string;
  nombre: string;
  categorias: string[];
}

type GlobalPhase = "lobby" | "game" | "finishing";

interface FinishPayload {
  players: BattlePlayer[];
  winnerId: string | null;
  tipo: "win" | "pact" | "cancelled";
}

function Avatar({
  url,
  name,
  size = 56,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const src =
    url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  return (
    <img
      src={src}
      alt={name}
      style={{
        borderRadius: "50%",
        objectFit: "cover",
        width: size,
        height: size,
      }}
    />
  );
}

function StatusDot({ status }: { status: BattlePlayer["status"] }) {
  const map: Record<string, { color: string; label: string }> = {
    accepted: { color: "#22c55e", label: "Listo" },
    pending: { color: "#f59e0b", label: "Esperando" },
    declined: { color: "#ef4444", label: "Rechazó" },
  };
  const { color, label } = map[status] ?? map.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: "0.75rem",
        color,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════
export default function BatallaPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { user, token } = useAuth();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [globalPhase, setGlobalPhase] = useState<GlobalPhase>("lobby");
  const [finishPayload, setFinishPayload] = useState<FinishPayload | null>(
    null,
  );

  const myId = user?.id ?? "";

  // ── Socket del LOBBY ─────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const s = io(API, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket"],
    });
    s.on("connect", () => console.log("[batalla] conectado:", s.id));
    s.on("connect_error", (e) => console.error("[batalla] error:", e.message));
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  // ── Fetch sala ───────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !token) return;
    try {
      const stored = sessionStorage.getItem("nakama_room");
      if (stored) {
        const p = JSON.parse(stored);
        if (p.roomId === roomId) setRoomData(p);
      }
    } catch {}

    fetch(`${API}/battles/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setBattle({
          roomId: data.roomId ?? roomId,
          nombre: data.nombre ?? "",
          players: data.players ?? [],
          estado: data.estado ?? "waiting",
          categorias: data.categorias ?? [],
        });
        setRoomData({
          roomId: data.roomId ?? roomId,
          battleId: String(data._id ?? data.battleId ?? ""),
          nombre: data.nombre ?? "",
          categorias: data.categorias ?? [],
        });
        // Si al cargar la sala ya está activa, ir directo al juego
        if (data.estado === "active") setGlobalPhase("game");
      })
      .catch((e) => console.error("[batalla] fetch error:", e.message))
      .finally(() => setLoading(false));
  }, [roomId, token]);

  // ── Socket listeners del LOBBY ───────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    const joinRoom = () => {
      console.log("[batalla] emitiendo battle:join");
      socket.emit("battle:join", { roomId });
    };
    if (socket.connected) joinRoom();
    else socket.once("connect", joinRoom);

    // ✅ FIX: state_update puede venir desde la room battle:{roomId}
    // O desde la room personal user:{myId} (cuando el invitado aún no está en la battle room)
    const onStateUpdate = (data: {
      roomId: string;
      players: BattlePlayer[];
      estado: string;
    }) => {
      // Ignorar updates que no son de esta sala
      if (data.roomId && data.roomId !== roomId) return;

      console.log(
        "[batalla] state_update →",
        data.estado,
        "players:",
        data.players?.length,
      );
      setBattle((prev) => ({
        roomId: data.roomId ?? prev?.roomId ?? roomId,
        nombre: prev?.nombre ?? "",
        categorias: prev?.categorias ?? [],
        players: data.players ?? prev?.players ?? [],
        estado: data.estado as BattleState["estado"],
      }));
      setLoading(false);
      // Cuando el estado pasa a "active" → ir al juego
      if (data.estado === "active") setGlobalPhase("game");
    };

    // ✅ FIX: escuchar battle:game_start también aquí (como fallback
    // por si el invitado está en el lobby cuando el creador inicia)
    const onGameStart = (data?: { roomId?: string }) => {
      if (data?.roomId && data.roomId !== roomId) return;
      console.log(
        "[batalla] game_start recibido en lobby → transitar al juego",
      );
      setGlobalPhase("game");
    };

    const onOnline = ({ userId }: { userId: string }) =>
      setOnline((p) => new Set(p).add(userId));
    const onLeft = ({ userId }: { userId: string }) =>
      setOnline((p) => {
        const s = new Set(p);
        s.delete(userId);
        return s;
      });
    const onAnswered = ({ userId }: { userId: string }) => {
      setAnswered((p) => new Set(p).add(userId));
      setTimeout(
        () =>
          setAnswered((p) => {
            const s = new Set(p);
            s.delete(userId);
            return s;
          }),
        2000,
      );
    };
    const onScore = ({ userId, score }: { userId: string; score: number }) =>
      setBattle((p) =>
        p
          ? {
              ...p,
              players: p.players.map((pl) =>
                pl.userId === userId ? { ...pl, score } : pl,
              ),
            }
          : p,
      );
    const onEnded = (data: { ganadorId: string; players: BattlePlayer[] }) =>
      setBattle((p) =>
        p ? { ...p, estado: "finished", players: data.players } : p,
      );

    socket.on("battle:state_update", onStateUpdate);
    socket.on("battle:game_start", onGameStart); // ✅ nuevo listener
    socket.on("battle:player_online", onOnline);
    socket.on("battle:player_left", onLeft);
    socket.on("battle:player_answered", onAnswered);
    socket.on("battle:scores", onScore);
    socket.on("battle:ended", onEnded);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("battle:state_update", onStateUpdate);
      socket.off("battle:game_start", onGameStart); // ✅ cleanup
      socket.off("battle:player_online", onOnline);
      socket.off("battle:player_left", onLeft);
      socket.off("battle:player_answered", onAnswered);
      socket.off("battle:scores", onScore);
      socket.off("battle:ended", onEnded);
    };
  }, [socket, roomId]);

  const sendReady = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit("battle:ready", { roomId }, (res: any) =>
      console.log("[batalla] ready ack →", res),
    );
    setBattle((prev) =>
      prev
        ? {
            ...prev,
            players: prev.players.map((p) =>
              p.userId === myId ? { ...p, status: "accepted" } : p,
            ),
          }
        : prev,
    );
  }, [socket, roomId, myId]);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch(`${API}/battles/${roomId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Fallback: emitir por socket directamente
        socket?.emit("battle:start", { roomId });
        setGlobalPhase("game");
      }
      // Si el endpoint existe, el backend emitirá battle:state_update con estado:"active"
    } catch {
      socket?.emit("battle:start", { roomId });
      setGlobalPhase("game");
    } finally {
      setStarting(false);
    }
  };

  const handleGameFinish = useCallback((finalPlayers: BattlePlayer[]) => {
    const sorted = [...finalPlayers].sort((a, b) => b.score - a.score);
    const winnerId = sorted[0]?.userId ?? null;
    const isPact = sorted.length >= 2 && sorted[0].score === sorted[1].score;
    setFinishPayload({
      players: finalPlayers,
      winnerId,
      tipo: isPact ? "pact" : "win",
    });
    setGlobalPhase("finishing");
  }, []);

  // ── Derivados ────────────────────────────────────────────
  const players = Array.isArray(battle?.players) ? battle.players : [];
  const estado = battle?.estado ?? "waiting";
  const amReady = players.find((p) => p.userId === myId)?.status === "accepted";
  const isCreator = players.length > 0 && players[0].userId === myId;
  const allReady =
    players.length > 1 && players.every((p) => p.status === "accepted");
  const readyCount = players.filter((p) => p.status === "accepted").length;

  // ── Guards ───────────────────────────────────────────────
  if (!token || loading) return <LoadingScreen />;

  // ── FASE JUEGO ───────────────────────────────────────────
  if (globalPhase === "game" && battle) {
    return (
      <BattleGame
        roomId={roomId}
        players={players}
        categorias={battle.categorias}
        myUserId={myId}
        isCreator={isCreator}
        token={token}
        onFinish={handleGameFinish}
      />
    );
  }

  // ── FASE GUARDANDO ───────────────────────────────────────
  if (globalPhase === "finishing" && finishPayload && roomData) {
    return (
      <BattleFinisher
        battleId={roomData.battleId}
        roomId={roomId}
        communityId={null}
        nombre={roomData.nombre}
        categorias={roomData.categorias}
        players={finishPayload.players}
        winnerId={finishPayload.winnerId}
        tipo={finishPayload.tipo}
        token={token}
        myUserId={myId}
      />
    );
  }

  // ── FASE LOBBY ───────────────────────────────────────────
  return (
    <div style={S.root}>
      <header style={S.header}>
        <button style={S.backBtn} onClick={() => router.push("/")}>
          ← Salir
        </button>
        <div style={S.headerTitle}>
          <span style={S.logo}>NAKAMA</span>
          <span style={S.roomName}>
            {roomData?.nombre ?? battle?.nombre ?? "Batalla"}
          </span>
        </div>
        <span style={S.badge(estado)}>{ESTADO_LABEL[estado] ?? estado}</span>
      </header>

      {(battle?.categorias?.length ?? 0) > 0 && (
        <div style={S.cats}>
          {battle!.categorias.map((c) => (
            <span key={c} style={S.catBadge}>
              {c}
            </span>
          ))}
        </div>
      )}

      <section style={S.arena}>
        {players.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              color: "#6b7280",
            }}
          >
            <Spinner size={28} />
            <p style={{ margin: 0, fontSize: "0.85rem" }}>
              Esperando jugadores...
            </p>
          </div>
        ) : (
          <div style={S.grid(players.length)}>
            {players.map((p) => (
              <PlayerCard
                key={p.userId}
                player={p}
                isMe={p.userId === myId}
                isOnline={online.has(p.userId) || p.userId === myId}
                hasAnswered={answered.has(p.userId)}
              />
            ))}
          </div>
        )}
      </section>

      <footer style={S.footer}>
        {estado === "waiting" && !amReady && (
          <button style={S.btnOrange} onClick={sendReady}>
            ⚔️ Estoy listo
          </button>
        )}

        {estado === "waiting" && amReady && !allReady && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={S.waitMsg}>
              <PulseDot />
              Esperando jugadores ({readyCount}/{players.length} listos)...
            </div>
            {isCreator && (
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "'Segoe UI',sans-serif",
                }}
              >
                El botón aparecerá cuando todos estén listos
              </span>
            )}
          </div>
        )}

        {estado === "waiting" && allReady && isCreator && (
          <button
            style={{
              ...S.btnOrange,
              background: starting
                ? "rgba(255,255,255,0.06)"
                : "linear-gradient(135deg,#22c55e,#15803d)",
              boxShadow: starting ? "none" : "0 4px 28px rgba(34,197,94,0.5)",
              cursor: starting ? "not-allowed" : "pointer",
              animation: starting ? "none" : "startPulse 1.8s ease infinite",
            }}
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? (
              <>
                <Spinner size={16} /> Iniciando...
              </>
            ) : (
              <> ¡INICIAR BATALLA!</>
            )}
          </button>
        )}

        {estado === "waiting" && allReady && !isCreator && (
          <div style={S.waitMsg}>
            <PulseDot color="#22c55e" />
            ¡Todos listos! Esperando que el creador inicie...
          </div>
        )}

        {estado === "active" && globalPhase === "lobby" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{ color: "#22c55e", fontWeight: 700, fontSize: "1rem" }}
            >
              🎮 ¡Batalla iniciada!
            </div>
            <button
              style={{
                ...S.btnOrange,
                fontSize: "0.85rem",
                padding: "10px 28px",
              }}
              onClick={() => setGlobalPhase("game")}
            >
              Entrar al juego →
            </button>
          </div>
        )}

        {estado === "finished" && (
          <button style={S.btnOrange} onClick={() => router.push("/")}>
            Volver al inicio
          </button>
        )}
      </footer>

      <style>{`
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes startPulse { 0%,100%{box-shadow:0 4px 28px rgba(34,197,94,0.5)} 50%{box-shadow:0 4px 44px rgba(34,197,94,0.85)} }
      `}</style>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────
function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${Math.max(2, size / 12)}px solid rgba(249,115,22,0.3)`,
        borderTopColor: "#f97316",
        animation: "spin 0.75s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function PulseDot({ color = "#f59e0b" }: { color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        animation: "pulse 1.4s ease-in-out infinite",
        flexShrink: 0,
      }}
    />
  );
}

function PlayerCard({
  player,
  isMe,
  isOnline,
  hasAnswered,
}: {
  player: BattlePlayer;
  isMe: boolean;
  isOnline: boolean;
  hasAnswered: boolean;
}) {
  return (
    <div
      style={{
        ...S.card,
        border: isMe ? "2px solid #f97316" : "2px solid rgba(255,255,255,0.08)",
        background: hasAnswered
          ? "rgba(34,197,94,0.08)"
          : "rgba(255,255,255,0.03)",
        transform: hasAnswered ? "scale(1.03)" : "scale(1)",
        transition: "all 0.25s ease",
      }}
    >
      <div style={{ position: "relative", marginBottom: 10 }}>
        <img
          src={
            player.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.username)}`
          }
          alt={player.username}
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            width: 64,
            height: 64,
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 13,
            height: 13,
            borderRadius: "50%",
            background: isOnline ? "#22c55e" : "#4b5563",
            border: "2px solid #0a0a0f",
            boxShadow: isOnline ? "0 0 6px #22c55e" : "none",
          }}
        />
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "#fff",
          marginBottom: 4,
          textAlign: "center",
        }}
      >
        {player.username}
        {isMe && (
          <span
            style={{ color: "#f97316", marginLeft: 5, fontSize: "0.65rem" }}
          >
            TÚ
          </span>
        )}
      </div>
      <StatusDot status={player.status} />
      <div
        style={{
          marginTop: 8,
          fontSize: "1.3rem",
          fontWeight: 900,
          color: "#00c8ff",
          letterSpacing: "-0.02em",
        }}
      >
        {player.score.toLocaleString()}
        <span style={{ fontSize: "0.6rem", color: "#6b7280", marginLeft: 3 }}>
          pts
        </span>
      </div>
      {hasAnswered && (
        <div style={{ marginTop: 5, fontSize: "0.68rem", color: "#22c55e" }}>
          ✓ Respondió
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "3px solid rgba(249,115,22,0.3)",
          borderTopColor: "#f97316",
          animation: "spin 0.75s linear infinite",
        }}
      />
      <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: 0 }}>
        Cargando sala...
      </p>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────
const ESTADO_LABEL: Record<string, string> = {
  waiting: "Sala de espera",
  active: "En curso",
  finished: "Finalizada",
  cancelled: "Cancelada",
};
const ESTADO_COLOR: Record<string, string> = {
  waiting: "#f59e0b",
  active: "#22c55e",
  finished: "#6b7280",
  cancelled: "#ef4444",
};

const S = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#fff",
    fontFamily: "'Segoe UI',sans-serif",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.02)",
  },
  backBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#9ca3af",
    padding: "6px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "0.82rem",
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 2,
  },
  logo: {
    fontSize: "0.65rem",
    letterSpacing: "0.2em",
    color: "#f97316",
    fontWeight: 900,
  },
  roomName: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#fff",
    maxWidth: 220,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  badge: (e: string) => ({
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 20,
    background: `${ESTADO_COLOR[e] ?? "#6b7280"}22`,
    color: ESTADO_COLOR[e] ?? "#6b7280",
    border: `1px solid ${ESTADO_COLOR[e] ?? "#6b7280"}44`,
  }),
  cats: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    padding: "12px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  catBadge: {
    fontSize: "0.72rem",
    padding: "3px 10px",
    borderRadius: 20,
    background: "rgba(249,115,22,0.12)",
    color: "#f97316",
    border: "1px solid rgba(249,115,22,0.25)",
  },
  arena: {
    flex: 1,
    padding: "24px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: (n: number) => ({
    display: "grid",
    gridTemplateColumns:
      n <= 2 ? "1fr 1fr" : n === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
    gap: 16,
    width: "100%",
    maxWidth: 600,
  }),
  card: {
    padding: "20px 16px",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 4,
  },
  footer: {
    padding: "16px 20px 32px",
    display: "flex",
    justifyContent: "center",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  btnOrange: {
    background: "linear-gradient(135deg,#f97316,#e05000)",
    border: "none",
    color: "#fff",
    fontWeight: 800,
    fontSize: "1rem",
    padding: "14px 40px",
    borderRadius: 12,
    cursor: "pointer",
    letterSpacing: "0.04em",
    boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  waitMsg: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#9ca3af",
    fontSize: "0.88rem",
  },
};
