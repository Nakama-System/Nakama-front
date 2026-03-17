"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/authContext";
import type { BattlePlayer, BattleState } from "../../hooks/useBattleSocket";
import { io, Socket } from "socket.io-client";
import BattleGame     from "../../batallapage/BattleGame";
import BattleFinisher from "../../batallapage/Battlefinisher";
import {
  Volume2, VolumeX, Volume1,
  SkipForward, SkipBack, Play, Pause,
} from "lucide-react";

const API = "https://nakama-backend-render.onrender.com";

const INVITE_TIMEOUT_SEG = 30;

const LOBBY_TRACKS = [
  { src: "/assets/lobby1.mp3", label: "Track 1" },
  { src: "/assets/lobby2.mp3", label: "Track 2" },
  { src: "/assets/lobby3.mp3", label: "Track 3" },
  { src: "/assets/lobby4.mp3", label: "Track 4" },
];

interface RoomData {
  roomId:     string;
  battleId:   string;
  nombre:     string;
  categorias: string[];
}

type GlobalPhase = "lobby" | "game" | "finishing";

interface FinishPayload {
  players:  BattlePlayer[];
  winnerId: string | null;
  tipo:     "win" | "pact" | "cancelled";
}

function StatusDot({ status }: { status: BattlePlayer["status"] }) {
  const map: Record<string, { color: string; label: string }> = {
    accepted: { color:"#22c55e", label:"Listo"     },
    pending:  { color:"#f59e0b", label:"Esperando" },
    declined: { color:"#ef4444", label:"Rechazó"   },
  };
  const { color, label } = map[status] ?? map.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.75rem", color }}>
      <span style={{ width:8, height:8, borderRadius:"50%", background:color, boxShadow:`0 0 6px ${color}`, display:"inline-block" }} />
      {label}
    </span>
  );
}

// ── Reproductor de música del lobby ──────────────────────────────────────────
function LobbyMusicPlayer() {
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const [trackIdx,  setTrackIdx]  = useState<number>(() => Math.floor(Math.random() * LOBBY_TRACKS.length));
  const [playing,   setPlaying]   = useState(false);
  const [volume,    setVolume]    = useState(0.4);
  const [muted,     setMuted]     = useState(false);
  const [showVol,   setShowVol]   = useState(false);

  const track = LOBBY_TRACKS[trackIdx];

  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(track.src);
    audio.loop   = false;
    audio.volume = muted ? 0 : volume;
    audioRef.current = audio;
    const handleEnded = () => setTrackIdx(prev => (prev + 1) % LOBBY_TRACKS.length);
    audio.addEventListener("ended", handleEnded);
    if (playing) audio.play().catch(() => setPlaying(false));
    return () => { audio.removeEventListener("ended", handleEnded); audio.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, []);

  const prevTrack  = () => setTrackIdx(prev => (prev - 1 + LOBBY_TRACKS.length) % LOBBY_TRACKS.length);
  const nextTrack  = () => setTrackIdx(prev => (prev + 1) % LOBBY_TRACKS.length);
  const togglePlay = () => setPlaying(p => !p);
  const toggleMute = () => setMuted(m => !m);

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div style={{ position:"fixed", bottom:24, right:20, zIndex:100, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, fontFamily:"'Segoe UI', sans-serif" }}>
      {showVol && (
        <div style={{ background:"rgba(15,15,25,0.95)", border:"1px solid rgba(249,115,22,0.25)", borderRadius:12, padding:"12px 14px", display:"flex", flexDirection:"column", alignItems:"center", gap:8, backdropFilter:"blur(8px)", boxShadow:"0 4px 24px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.3)", letterSpacing:"0.15em" }}>VOLUMEN</span>
          <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
            onChange={e => { setVolume(Number(e.target.value)); if (muted) setMuted(false); }}
            style={{ writingMode:"vertical-lr" as any, direction:"rtl" as any, height:80, cursor:"pointer", accentColor:"#f97316" }}
          />
          <span style={{ fontSize:"0.65rem", color:"#f97316", fontWeight:700 }}>{muted ? "0%" : `${Math.round(volume * 100)}%`}</span>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(15,15,25,0.92)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:999, padding:"8px 14px", backdropFilter:"blur(10px)", boxShadow: playing ? "0 0 20px rgba(249,115,22,0.25), 0 4px 16px rgba(0,0,0,0.4)" : "0 4px 16px rgba(0,0,0,0.4)", transition:"box-shadow 0.3s ease" }}>
        <div style={{ position:"relative", display:"flex", alignItems:"center", marginRight:2 }}>
          <Volume2 size={15} color={playing ? "#f97316" : "rgba(255,255,255,0.3)"} style={{ transition:"color 0.3s", animation: playing ? "speakerPulse 1.8s ease infinite" : "none" }}/>
          {playing && (<><span style={barStyle(1, playing)}/><span style={barStyle(2, playing)}/><span style={barStyle(3, playing)}/></>)}
        </div>
        <span style={{ fontSize:"0.68rem", color: playing ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", maxWidth:64, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", transition:"color 0.3s" }}>{track.label}</span>
        <button onClick={prevTrack} style={iconBtn}><SkipBack size={13} color="rgba(255,255,255,0.5)"/></button>
        <button onClick={togglePlay} style={{ ...iconBtn, width:28, height:28, borderRadius:"50%", background: playing ? "linear-gradient(135deg,#f97316,#e05000)" : "rgba(255,255,255,0.08)", boxShadow: playing ? "0 0 10px rgba(249,115,22,0.5)" : "none", transition:"all 0.25s" }}>
          {playing ? <Pause size={13} color="#fff" fill="#fff"/> : <Play size={13} color="rgba(255,255,255,0.7)" fill="rgba(255,255,255,0.7)"/>}
        </button>
        <button onClick={nextTrack} style={iconBtn}><SkipForward size={13} color="rgba(255,255,255,0.5)"/></button>
        <button onClick={() => { if (!showVol) toggleMute(); }} onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)} style={iconBtn}>
          <VolumeIcon size={14} color={muted ? "#ef4444" : "rgba(255,255,255,0.5)"}/>
        </button>
      </div>
      <style>{`
        @keyframes speakerPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes barAnim1 { 0%,100%{height:4px} 50%{height:10px} }
        @keyframes barAnim2 { 0%,100%{height:8px} 33%{height:3px}  66%{height:12px} }
        @keyframes barAnim3 { 0%,100%{height:5px} 50%{height:9px}  25%{height:2px} }
      `}</style>
    </div>
  );
}

function barStyle(n: 1|2|3, playing: boolean): React.CSSProperties {
  const anims = { 1:"barAnim1", 2:"barAnim2", 3:"barAnim3" };
  return {
    display:"inline-block", width:2, height: n===1 ? 4 : n===2 ? 8 : 5,
    background:"#f97316", borderRadius:1, marginLeft:2, alignSelf:"center",
    animation: playing ? `${anims[n]} ${0.6 + n * 0.15}s ease-in-out infinite` : "none",
    transition:"height 0.2s",
  };
}

const iconBtn: React.CSSProperties = {
  background:"none", border:"none", cursor:"pointer", padding:4,
  display:"flex", alignItems:"center", justifyContent:"center",
  borderRadius:6, transition:"opacity 0.2s",
};

// ════════════════════════════════════════════════════════════
export default function BatallaPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { user, token } = useAuth();

  const [socket,        setSocket]        = useState<Socket | null>(null);
  const [battle,        setBattle]        = useState<BattleState | null>(null);
  const [roomData,      setRoomData]      = useState<RoomData | null>(null);
  const [online,        setOnline]        = useState<Set<string>>(new Set());
  const [answered,      setAnswered]      = useState<Set<string>>(new Set());
  const [loading,       setLoading]       = useState(true);
  const [starting,      setStarting]      = useState(false);
  const [globalPhase,   setGlobalPhase]   = useState<GlobalPhase>("lobby");
  const [finishPayload, setFinishPayload] = useState<FinishPayload | null>(null);

  const [inviteCountdown, setInviteCountdown] = useState<number | null>(null);
  const inviteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const battleRef         = useRef<BattleState | null>(null);
  const myIdRef           = useRef<string>("");
  const isCreatorRef      = useRef<boolean>(false);
  const startingRef       = useRef<boolean>(false);
  const tokenRef          = useRef<string>("");
  const globalPhaseRef    = useRef<GlobalPhase>("lobby");

  // ✅ NUEVO: delay de 10s antes de mostrar el botón iniciar cuando allReady
  const [allReadyDelay,     setAllReadyDelay]     = useState(false);  // true = botón visible
  const [allReadyCountdown, setAllReadyCountdown] = useState<number | null>(null);
  const allReadyTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevAllReadyRef     = useRef(false);

  useEffect(() => { battleRef.current      = battle;         }, [battle]);
  useEffect(() => { tokenRef.current       = token ?? "";    }, [token]);
  useEffect(() => { globalPhaseRef.current = globalPhase;    }, [globalPhase]);

  // ── Música ambiente del lobby ────────────────────────────
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio("/assets/musicambiente.mp3");
    audio.loop = true; audio.volume = 0.35;
    ambientAudioRef.current = audio;
    audio.play().catch(() => {});
    return () => { audio.pause(); ambientAudioRef.current = null; };
  }, []);

  const fadeOutAndNavigate = useCallback((href: string) => {
    const audio = ambientAudioRef.current;
    if (!audio || audio.paused) { router.push(href); return; }
    const FADE_MS = 1500, STEPS = 30;
    const startVol = audio.volume, stepVol = startVol / STEPS, stepMs = FADE_MS / STEPS;
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      audio.volume = Math.max(0, startVol - stepVol * step);
      if (step >= STEPS) { clearInterval(interval); audio.pause(); router.push(href); }
    }, stepMs);
  }, [router]);

  const myId    = user?.id ?? "";
  const players = battle?.players ?? [];

  const activePlayers  = players.filter(p => p.status !== "declined");
  const isCreator      = activePlayers.length > 0 && activePlayers[0].userId === myId;

  myIdRef.current      = myId;
  isCreatorRef.current = isCreator;

  const estado        = battle?.estado  ?? "waiting";
  const amReady       = players.find(p => p.userId===myId)?.status === "accepted";
  const nonDeclined   = activePlayers;
  const allReady      = nonDeclined.length >= 2 && nonDeclined.every(p => p.status === "accepted");
  const readyCount    = nonDeclined.filter(p => p.status === "accepted").length;
  const hasRivalReady = nonDeclined.some(p => p.userId !== myId && p.status === "accepted");
  const hasPending    = nonDeclined.some(p => p.status === "pending");
  const canStartEarly = isCreator && amReady && hasRivalReady && hasPending;

  // ✅ NUEVO: cuando allReady pasa de false→true, arrancar countdown de 10s
  useEffect(() => {
    if (!isCreator) return;

    // allReady acaba de volverse true
    if (allReady && !prevAllReadyRef.current) {
      prevAllReadyRef.current = true;
      setAllReadyDelay(false);
      setAllReadyCountdown(10);

      if (allReadyTimerRef.current) clearInterval(allReadyTimerRef.current);
      let remaining = 10;
      allReadyTimerRef.current = setInterval(() => {
        remaining -= 1;
        setAllReadyCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(allReadyTimerRef.current!);
          allReadyTimerRef.current = null;
          setAllReadyCountdown(null);
          setAllReadyDelay(true);
        }
      }, 1000);
    }

    // allReady volvió a false (alguien se fue)
    if (!allReady && prevAllReadyRef.current) {
      prevAllReadyRef.current = false;
      if (allReadyTimerRef.current) { clearInterval(allReadyTimerRef.current); allReadyTimerRef.current = null; }
      setAllReadyDelay(false);
      setAllReadyCountdown(null);
    }
  }, [allReady, isCreator]);

  // Limpiar timer al desmontar
  useEffect(() => () => {
    if (allReadyTimerRef.current) clearInterval(allReadyTimerRef.current);
  }, []);

  // ── Socket del LOBBY ─────────────────────────────────────
  useEffect(() => {
    if (!token || token.length < 20) return;
    const s = io(API, {
      auth:            { token },
      withCredentials: true,
      transports:      ["websocket"],
    });
    s.on("connect",       ()  => console.log("[batalla] conectado:", s.id));
    s.on("connect_error", (e) => console.error("[batalla] error:", e.message));
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
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
      headers:     { Authorization:`Bearer ${token}` },
      credentials: "include",
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        setBattle({
          roomId:     data.roomId     ?? roomId,
          nombre:     data.nombre     ?? "",
          players:    data.players    ?? [],
          estado:     data.estado     ?? "waiting",
          categorias: data.categorias ?? [],
        });
        setRoomData({
          roomId:     data.roomId  ?? roomId,
          battleId:   String(data._id ?? data.battleId ?? ""),
          nombre:     data.nombre  ?? "",
          categorias: data.categorias ?? [],
        });
        if (data.estado === "active") {
          setGlobalPhase("game");
          globalPhaseRef.current = "game";
        }
      })
      .catch(e => console.error("[batalla] fetch error:", e.message))
      .finally(() => setLoading(false));
  }, [roomId, token]);

  // ── Limpiar timer de invitación ──────────────────────────
  const clearInviteTimer = useCallback(() => {
    if (inviteIntervalRef.current) { clearInterval(inviteIntervalRef.current); inviteIntervalRef.current = null; }
    setInviteCountdown(null);
  }, []);

  // ── Disparar inicio ──────────────────────────────────────
  const doStart = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    clearInviteTimer();
    try {
      const res = await fetch(`${API}/battles/${roomId}/start`, {
        method:  "POST",
        headers: { Authorization:`Bearer ${tokenRef.current}` },
      });
      if (!res.ok) {
        setGlobalPhase("game");
        globalPhaseRef.current = "game";
      }
    } catch {
      setGlobalPhase("game");
      globalPhaseRef.current = "game";
    } finally {
      setStarting(false);
      startingRef.current = false;
    }
  }, [roomId, clearInviteTimer]);

  // ── Arrancar countdown de 30s (solo creador) ─────────────
  const startInviteCountdown = useCallback(() => {
    if (inviteIntervalRef.current !== null) return;
    let remaining = INVITE_TIMEOUT_SEG;
    setInviteCountdown(remaining);
    inviteIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setInviteCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(inviteIntervalRef.current!);
        inviteIntervalRef.current = null;
        setInviteCountdown(null);
        const current = battleRef.current;
        const myId    = myIdRef.current;
        const rivals  = (current?.players ?? []).filter(p => p.userId !== myId && p.status === "accepted");
        if (rivals.length >= 1) { doStart(); }
        else { fadeOutAndNavigate("/comunidad"); }
      }
    }, 1000);
  }, [doStart, fadeOutAndNavigate]);

  useEffect(() => () => clearInviteTimer(), [clearInviteTimer]);

  // ── Socket listeners del LOBBY ───────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    const joinRoom = () => {
      console.log("[batalla] emitiendo battle:join");
      socket.emit("battle:join", { roomId });
    };
    if (socket.connected) joinRoom();
    else socket.once("connect", joinRoom);

    const onStateUpdate = (data: { roomId:string; players:BattlePlayer[]; estado:string }) => {
      if (data.roomId && data.roomId !== roomId) return;
      console.log("[batalla] state_update →", data.estado, "phase actual:", globalPhaseRef.current);

      const next: BattleState = {
        roomId:     data.roomId,
        nombre:     battleRef.current?.nombre     ?? "",
        categorias: battleRef.current?.categorias ?? [],
        players:    data.players,
        estado:     data.estado as BattleState["estado"],
      };
      battleRef.current = next;
      setBattle(next);
      setLoading(false);

      if (data.estado === "active" && globalPhaseRef.current === "lobby") {
        console.log("[batalla] transitando a game phase por state_update active");
        clearInviteTimer();
        setGlobalPhase("game");
        globalPhaseRef.current = "game";
        return;
      }

      if (!isCreatorRef.current) return;

      const myId = myIdRef.current;
      const nonDeclined  = data.players.filter(p => p.status !== "declined");
      const creatorAcc   = data.players.find(p => p.userId === myId)?.status === "accepted";
      const hasPending   = nonDeclined.some(p => p.userId !== myId && p.status === "pending");
      const rivalAcc     = nonDeclined.filter(p => p.userId !== myId && p.status === "accepted").length;
      const allActiveAcc = nonDeclined.length >= 2 && nonDeclined.every(p => p.status === "accepted");
      const anyoneLeft   = nonDeclined.some(p => p.userId !== myId);

      if (!anyoneLeft && creatorAcc) { clearInviteTimer(); fadeOutAndNavigate("/comunidad"); return; }
      if (!creatorAcc) { clearInviteTimer(); return; }
      if (allActiveAcc) { clearInviteTimer(); return; }
      if (hasPending) { startInviteCountdown(); }
      else if (rivalAcc === 0) { clearInviteTimer(); fadeOutAndNavigate("/comunidad"); }
    };

    const onGameStart = (data: any) => {
      const incomingRoomId = data?.roomId ?? roomId;
      if (incomingRoomId !== roomId) return;
      console.log("[batalla] battle:game_start recibido, transitando a game");
      if (globalPhaseRef.current !== "lobby") return;
      clearInviteTimer();
      setGlobalPhase("game");
      globalPhaseRef.current = "game";
    };

    const onOnline   = ({ userId }: { userId:string }) => setOnline(p => new Set(p).add(userId));
    const onLeft     = ({ userId }: { userId:string }) => setOnline(p => { const s = new Set(p); s.delete(userId); return s; });
    const onAnswered = ({ userId }: { userId:string }) => {
      setAnswered(p => new Set(p).add(userId));
      setTimeout(() => setAnswered(p => { const s = new Set(p); s.delete(userId); return s; }), 2000);
    };
    const onScore    = ({ userId, score }: { userId:string; score:number }) =>
      setBattle(p => p ? { ...p, players: p.players.map(pl => pl.userId===userId ? {...pl,score} : pl) } : p);
    const onEnded    = (data: { ganadorId:string; players:BattlePlayer[] }) =>
      setBattle(p => p ? { ...p, estado:"finished", players:data.players } : p);
    const onInvitationExpired = ({ roomId: expiredRoomId }: { roomId: string }) => {
      if (expiredRoomId === roomId) fadeOutAndNavigate("/");
    };

    socket.on("battle:state_update",       onStateUpdate);
    socket.on("battle:game_start",         onGameStart);
    socket.on("battle:player_online",      onOnline);
    socket.on("battle:player_left",        onLeft);
    socket.on("battle:player_answered",    onAnswered);
    socket.on("battle:scores",             onScore);
    socket.on("battle:ended",              onEnded);
    socket.on("battle:invitation_expired", onInvitationExpired);

    return () => {
      socket.off("connect",                  joinRoom);
      socket.off("battle:state_update",      onStateUpdate);
      socket.off("battle:game_start",        onGameStart);
      socket.off("battle:player_online",     onOnline);
      socket.off("battle:player_left",       onLeft);
      socket.off("battle:player_answered",   onAnswered);
      socket.off("battle:scores",            onScore);
      socket.off("battle:ended",             onEnded);
      socket.off("battle:invitation_expired",onInvitationExpired);
    };
  }, [socket, roomId, clearInviteTimer, startInviteCountdown, router, fadeOutAndNavigate]);

  const sendReady = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit("battle:ready", { roomId }, (res: any) => console.log("[batalla] ready ack →", res));
    const myId = myIdRef.current;
    setBattle(prev => {
      if (!prev) return prev;
      const next = { ...prev, players: prev.players.map(p => p.userId===myId ? {...p, status:"accepted" as const} : p) };
      battleRef.current = next;
      return next;
    });
    if (isCreatorRef.current) {
      const current = battleRef.current;
      const hasPend = (current?.players ?? []).some(p => p.userId !== myId && p.status === "pending");
      if (hasPend) startInviteCountdown();
    }
  }, [socket, roomId, startInviteCountdown]);

  if (!token || loading) return <LoadingScreen />;

  if (globalPhase === "game" && battle) {
    return (
      <BattleGame
        roomId={roomId}
        players={activePlayers}
        categorias={battle.categorias}
        myUserId={myId}
        isCreator={isCreator}
        token={token}
        onFinish={(finalPlayers) => {
          const sorted   = [...finalPlayers].sort((a,b) => b.score - a.score);
          const winnerId = sorted[0]?.userId ?? null;
          const isPact   = sorted.length >= 2 && sorted[0].score === sorted[1].score;
          setFinishPayload({ players:finalPlayers, winnerId, tipo: isPact ? "pact" : "win" });
          setGlobalPhase("finishing");
          globalPhaseRef.current = "finishing";
        }}
      />
    );
  }

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
      <LobbyMusicPlayer />

      <header style={S.header}>
        <button style={S.backBtn} onClick={() => fadeOutAndNavigate("/")}>← Salir</button>
        <div style={S.headerTitle}>
          <span style={S.logo}>NAKAMA</span>
          <span style={S.roomName}>{roomData?.nombre ?? battle?.nombre ?? "Batalla"}</span>
        </div>
        <span style={S.badge(estado)}>{ESTADO_LABEL[estado] ?? estado}</span>
      </header>

      {(battle?.categorias?.length ?? 0) > 0 && (
        <div style={S.cats}>
          {battle!.categorias.map(c => <span key={c} style={S.catBadge}>{c}</span>)}
        </div>
      )}

      <section style={S.arena}>
        {activePlayers.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, color:"#6b7280" }}>
            <Spinner size={28} />
            <p style={{ margin:0, fontSize:"0.85rem" }}>Esperando jugadores...</p>
          </div>
        ) : (
          <>
            <div style={S.grid(nonDeclined.length)}>
              {nonDeclined.map(p => (
                <PlayerCard key={p.userId} player={p}
                  isMe={p.userId===myId}
                  isOnline={online.has(p.userId) || p.userId===myId}
                  hasAnswered={answered.has(p.userId)}
                />
              ))}
            </div>

            {players.some(p => p.status === "declined") && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginTop:8 }}>
                {players.filter(p => p.status === "declined").map(p => (
                  <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)" }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", display:"inline-block" }}/>
                    <span style={{ fontSize:"0.72rem", color:"#ef4444" }}>{p.username} rechazó</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <footer style={S.footer}>

        {/* 1 — Aún no acepté */}
        {estado === "waiting" && !amReady && (
          <button style={S.btnOrange} onClick={sendReady}>⚔️ Estoy listo</button>
        )}

        {/* 2 — Acepté pero hay pending sin rival listo */}
        {estado === "waiting" && amReady && !allReady && !canStartEarly && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <div style={S.waitMsg}>
              <PulseDot />
              Esperando jugadores ({readyCount}/{nonDeclined.length} listos)...
            </div>
            {isCreator && inviteCountdown !== null && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.3)" }}>
                  {inviteCountdown > 0 ? "Auto-inicio o cancelación en" : "Verificando..."}
                </div>
                <div style={{ fontSize:"1.8rem", fontWeight:900, lineHeight:1,
                  color: inviteCountdown <= 10 ? "#ef4444" : "#f59e0b",
                  textShadow:`0 0 16px ${inviteCountdown <= 10 ? "rgba(239,68,68,0.6)" : "rgba(245,158,11,0.6)"}`,
                }}>
                  {inviteCountdown}s
                </div>
                <div style={{ width:180, height:4, borderRadius:2, background:"rgba(255,255,255,0.08)" }}>
                  <div style={{ height:"100%", borderRadius:2, transition:"width 1s linear",
                    background: inviteCountdown <= 10 ? "linear-gradient(90deg,#ef4444,#dc2626)" : "linear-gradient(90deg,#f59e0b,#fbbf24)",
                    width:`${(inviteCountdown / INVITE_TIMEOUT_SEG) * 100}%`,
                  }}/>
                </div>
                <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.2)" }}>
                  Si nadie acepta, la batalla se cancela
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3 — Hay al menos 1 rival listo, otros pending → iniciar ya */}
        {estado === "waiting" && canStartEarly && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
            <div style={S.waitMsg}>
              <PulseDot color="#22c55e"/>
              {readyCount}/{nonDeclined.length} listos
            </div>
            {inviteCountdown !== null && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)" }}>Auto-inicio en</span>
                <span style={{ fontSize:"1.6rem", fontWeight:900, color: inviteCountdown <= 10 ? "#ef4444" : "#22c55e", lineHeight:1 }}>
                  {inviteCountdown}s
                </span>
                <div style={{ width:90, height:4, borderRadius:2, background:"rgba(255,255,255,0.08)" }}>
                  <div style={{ height:"100%", borderRadius:2, background:"linear-gradient(90deg,#22c55e,#16a34a)", width:`${(inviteCountdown / INVITE_TIMEOUT_SEG) * 100}%`, transition:"width 1s linear" }}/>
                </div>
              </div>
            )}
            <button
              onClick={() => doStart()}
              disabled={starting}
              style={{ ...S.btnOrange, background:"linear-gradient(135deg,#22c55e,#15803d)", boxShadow:"0 4px 28px rgba(34,197,94,0.5)", animation:"startPulse 1.8s ease infinite", cursor: starting ? "not-allowed" : "pointer" }}
            >
              {starting ? <><Spinner size={16}/> Iniciando...</> : "🚀 Iniciar con los que están"}
            </button>
            <span style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.2)" }}>
              Los que no respondieron no entrarán a la batalla
            </span>
          </div>
        )}

        {/* 4 — Todos listos: countdown de 10s antes de mostrar el botón */}
        {estado === "waiting" && allReady && isCreator && !allReadyDelay && allReadyCountdown !== null && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <div style={S.waitMsg}>
              <PulseDot color="#22c55e"/>
              ¡Todos listos! Preparando la batalla...
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)" }}>El botón aparece en</div>
              <div style={{ fontSize:"2.2rem", fontWeight:900, lineHeight:1,
                color: allReadyCountdown <= 5 ? "#f97316" : "#22c55e",
                textShadow:`0 0 20px ${allReadyCountdown <= 5 ? "rgba(249,115,22,0.7)" : "rgba(34,197,94,0.6)"}`,
              }}>
                {allReadyCountdown}s
              </div>
              <div style={{ width:160, height:4, borderRadius:2, background:"rgba(255,255,255,0.08)" }}>
                <div style={{ height:"100%", borderRadius:2,
                  width:`${((10 - allReadyCountdown) / 10) * 100}%`,
                  background: allReadyCountdown <= 5 ? "linear-gradient(90deg,#f97316,#fbbf24)" : "linear-gradient(90deg,#22c55e,#16a34a)",
                  transition:"width 1s linear",
                }}/>
              </div>
              <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.2)" }}>
                Dando tiempo al rival para conectarse al juego
              </div>
            </div>
          </div>
        )}

        {/* 5 — Todos listos + pasaron los 10s → botón habilitado */}
        {estado === "waiting" && allReady && isCreator && allReadyDelay && (
          <button
            onClick={() => doStart()}
            disabled={starting}
            style={{ ...S.btnOrange,
              background: starting ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#22c55e,#15803d)",
              boxShadow:  starting ? "none" : "0 4px 28px rgba(34,197,94,0.5)",
              cursor:     starting ? "not-allowed" : "pointer",
              animation:  starting ? "none" : "startPulse 1.8s ease infinite",
            }}
          >
            {starting ? <><Spinner size={16}/> Iniciando...</> : "¡INICIAR BATALLA!"}
          </button>
        )}

        {estado === "waiting" && allReady && !isCreator && (
          <div style={S.waitMsg}>
            <PulseDot color="#22c55e" />
            ¡Todos listos! Esperando que el creador inicie...
          </div>
        )}

        {estado === "active" && globalPhase === "lobby" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <div style={{ color:"#22c55e", fontWeight:700, fontSize:"1rem" }}>🎮 ¡Batalla iniciada!</div>
            <button style={{ ...S.btnOrange, fontSize:"0.85rem", padding:"10px 28px" }} onClick={() => {
              setGlobalPhase("game");
              globalPhaseRef.current = "game";
            }}>
              Entrar al juego →
            </button>
          </div>
        )}

        {estado === "finished" && (
          <button style={S.btnOrange} onClick={() => fadeOutAndNavigate("/")}>Volver al inicio</button>
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
    <div style={{ width:size, height:size, borderRadius:"50%", border:`${Math.max(2,size/12)}px solid rgba(249,115,22,0.3)`, borderTopColor:"#f97316", animation:"spin 0.75s linear infinite", flexShrink:0 }}/>
  );
}

function PulseDot({ color = "#f59e0b" }: { color?: string }) {
  return (
    <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:color, animation:"pulse 1.4s ease-in-out infinite", flexShrink:0 }}/>
  );
}

function PlayerCard({ player, isMe, isOnline, hasAnswered }: {
  player: BattlePlayer; isMe: boolean; isOnline: boolean; hasAnswered: boolean;
}) {
  return (
    <div style={{
      ...S.card,
      border: isMe ? "2px solid #f97316" : "2px solid rgba(255,255,255,0.08)",
      background: hasAnswered ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
      transform: hasAnswered ? "scale(1.03)" : "scale(1)",
      transition:"all 0.25s ease",
    }}>
      <div style={{ position:"relative", marginBottom:10 }}>
        <img
          src={player.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.username)}`}
          alt={player.username}
          style={{ borderRadius:"50%", objectFit:"cover", width:64, height:64 }}
        />
        <span style={{
          position:"absolute", bottom:0, right:0,
          width:13, height:13, borderRadius:"50%",
          background: isOnline ? "#22c55e" : "#4b5563",
          border:"2px solid #0a0a0f",
          boxShadow: isOnline ? "0 0 6px #22c55e" : "none",
        }}/>
      </div>
      <div style={{ fontWeight:700, fontSize:"0.9rem", color:"#fff", marginBottom:4, textAlign:"center" }}>
        {player.username}
        {isMe && <span style={{ color:"#f97316", marginLeft:5, fontSize:"0.65rem" }}>TÚ</span>}
      </div>
      <StatusDot status={player.status}/>
      <div style={{ marginTop:8, fontSize:"1.3rem", fontWeight:900, color:"#00c8ff", letterSpacing:"-0.02em" }}>
        {player.score.toLocaleString()}
        <span style={{ fontSize:"0.6rem", color:"#6b7280", marginLeft:3 }}>pts</span>
      </div>
      {hasAnswered && <div style={{ marginTop:5, fontSize:"0.68rem", color:"#22c55e" }}>✓ Respondió</div>}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
      <div style={{ width:48, height:48, borderRadius:"50%", border:"3px solid rgba(249,115,22,0.3)", borderTopColor:"#f97316", animation:"spin 0.75s linear infinite" }}/>
      <p style={{ color:"#9ca3af", fontSize:"0.9rem", margin:0 }}>Cargando sala...</p>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────
const ESTADO_LABEL: Record<string,string> = {
  waiting:"Sala de espera", active:"En curso", finished:"Finalizada", cancelled:"Cancelada",
};
const ESTADO_COLOR: Record<string,string> = {
  waiting:"#f59e0b", active:"#22c55e", finished:"#6b7280", cancelled:"#ef4444",
};

const S = {
  root: {
    minHeight:"100vh", background:"#0a0a0f", color:"#fff",
    fontFamily:"'Segoe UI',sans-serif", display:"flex", flexDirection:"column" as const,
  },
  header: {
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"16px 20px",
    borderBottom:"1px solid rgba(255,255,255,0.07)",
    background:"rgba(255,255,255,0.02)",
  },
  backBtn: {
    background:"transparent", border:"1px solid rgba(255,255,255,0.12)",
    color:"#9ca3af", padding:"6px 14px", borderRadius:8,
    cursor:"pointer", fontSize:"0.82rem",
  },
  headerTitle: {
    display:"flex", flexDirection:"column" as const, alignItems:"center", gap:2,
  },
  logo:     { fontSize:"0.65rem", letterSpacing:"0.2em", color:"#f97316", fontWeight:900 },
  roomName: {
    fontSize:"1rem", fontWeight:700, color:"#fff",
    maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const,
  },
  badge: (e: string) => ({
    fontSize:"0.72rem", fontWeight:700, padding:"4px 10px", borderRadius:20,
    background:`${ESTADO_COLOR[e] ?? "#6b7280"}22`,
    color: ESTADO_COLOR[e] ?? "#6b7280",
    border:`1px solid ${ESTADO_COLOR[e] ?? "#6b7280"}44`,
  }),
  cats: {
    display:"flex", flexWrap:"wrap" as const, gap:6,
    padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,0.05)",
  },
  catBadge: {
    fontSize:"0.72rem", padding:"3px 10px", borderRadius:20,
    background:"rgba(249,115,22,0.12)", color:"#f97316",
    border:"1px solid rgba(249,115,22,0.25)",
  },
  arena: {
    flex:1, padding:"24px 20px",
    display:"flex", flexDirection:"column" as const,
    alignItems:"center", justifyContent:"center", gap:12,
  },
  grid: (n: number) => ({
    display:"grid",
    gridTemplateColumns: n<=2 ? "1fr 1fr" : n===3 ? "1fr 1fr 1fr" : "1fr 1fr",
    gap:16, width:"100%", maxWidth:600,
  }),
  card: {
    padding:"20px 16px", borderRadius:14,
    display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4,
  },
  footer: {
    padding:"16px 20px 32px", display:"flex", justifyContent:"center",
    borderTop:"1px solid rgba(255,255,255,0.06)",
  },
  btnOrange: {
    background:"linear-gradient(135deg,#f97316,#e05000)",
    border:"none", color:"#fff", fontWeight:800, fontSize:"1rem",
    padding:"14px 40px", borderRadius:12, cursor:"pointer",
    letterSpacing:"0.04em", boxShadow:"0 4px 20px rgba(249,115,22,0.4)",
    display:"flex", alignItems:"center", gap:10,
  },
  waitMsg: { display:"flex", alignItems:"center", gap:10, color:"#9ca3af", fontSize:"0.88rem" },
};
