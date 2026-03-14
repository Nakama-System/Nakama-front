"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BattlePlayer } from "../hooks/useBattleSocket";

// ═══════════════════════════════════════════════════════════
// TIPOS LOCALES
// ═══════════════════════════════════════════════════════════
interface BattleRecord {
  battleId:    string;
  roomId:      string;
  communityId: string | null;
  nombre:      string;
  categorias:  string[];
  players:     BattlePlayer[];
  winnerId:    string | null;
  tipo:        "win" | "pact" | "cancelled";
  prize:       number;
  pactPrize?:  number;
  createdAt:   string;
}

const PRIZE_WIN     = 1000;
const PRIZE_PERFECT = 1500;
const PRIZE_PACT    = 750;
const MAX_PREGUNTAS = 10;
const PTS_CORRECTA  = 100;

// ═══════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════
export default function BattleFinisher({
  battleId,
  roomId,
  communityId,
  nombre,
  categorias,
  players,
  winnerId,
  tipo,
  token,
  myUserId,
}: {
  battleId:    string;
  roomId:      string;
  communityId: string | null;
  nombre:      string;
  categorias:  string[];
  players:     BattlePlayer[];
  winnerId:    string | null;
  tipo:        "win" | "pact" | "cancelled";
  token:       string;
  myUserId:    string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"saving" | "done" | "error">("saving");
  const [msg,    setMsg]    = useState("Guardando resultados...");
  const [dots,   setDots]   = useState(".");

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { saveBattle(); }, []); // eslint-disable-line

  async function saveBattle() {
    const winnerScore = players.find(p => p.userId === winnerId)?.score ?? 0;
    const perfect     = winnerScore >= PTS_CORRECTA * MAX_PREGUNTAS;
    const prize       = tipo === "pact" ? PRIZE_PACT : winnerId ? (perfect ? PRIZE_PERFECT : PRIZE_WIN) : 0;

    const record: BattleRecord = {
      battleId, roomId, communityId, nombre, categorias, players,
      winnerId, tipo, prize,
      pactPrize:  tipo === "pact" ? PRIZE_PACT : undefined,
      createdAt:  new Date().toISOString(),
    };

    // Guardar historial local
    try {
      const existing = JSON.parse(localStorage.getItem("nakama_battle_history") ?? "[]");
      existing.unshift(record);
      localStorage.setItem("nakama_battle_history", JSON.stringify(existing.slice(0, 50)));
    } catch {}

    // Enviar al servidor
    try {
      const res = await fetch(
        `${"https://nakama-vercel-backend.vercel.app"}/battles/${battleId}/finish`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            winnerId,
            tipo,
            prize,
            players: players.map(p => ({
              userId: p.userId,
              score:  p.score,
              prize:  tipo === "pact"
                ? PRIZE_PACT
                : p.userId === winnerId ? prize : p.score,
            })),
            communityId,
          }),
        },
      );
      if (!res.ok) throw new Error("Server error");
      setMsg("¡Resultados guardados!");
    } catch {
      setMsg("Redirigiendo...");
    }

    setStatus("done");
    setTimeout(() => redirect(), 2200);
  }

  function redirect() {
    if (communityId) router.push(`/comunidad/${communityId}`);
    else             router.push("/");
  }

  const winner = players.find(p => p.userId === winnerId);
  const amWin  = winnerId === myUserId;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"#080810",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      gap:24, padding:24,
      fontFamily:"'Arial Black', Impact, sans-serif",
    }}>
      {/* Background pulse */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 70%)",
        animation:"bgBreath 3s ease infinite",
      }}/>

      <div style={{ fontSize:"3.5rem", animation:"iconBounce 1s ease infinite" }}>
        {status === "saving" ? "⏳" : status === "error" ? "⚠️" : "🏁"}
      </div>

      <h2 style={{
        color:"#fff", margin:0,
        fontSize:"clamp(1.6rem,5vw,2.2rem)",
        letterSpacing:"0.04em", zIndex:1,
      }}>
        FIN DEL JUEGO
      </h2>

      {winner && (
        <div style={{
          display:"flex", alignItems:"center", gap:12,
          background:"rgba(251,191,36,0.08)",
          border:"1px solid rgba(251,191,36,0.25)",
          borderRadius:14, padding:"12px 20px", zIndex:1,
        }}>
          <span style={{ fontSize:"1.5rem" }}>🏆</span>
          <div>
            <div style={{ fontSize:"0.6rem", letterSpacing:"0.2em", color:"rgba(255,255,255,0.35)" }}>CAMPEÓN</div>
            <div style={{ color:"#fbbf24", fontWeight:900, fontSize:"1rem" }}>
              {winner.username}
              {amWin && <span style={{ color:"#f97316", marginLeft:8, fontSize:"0.7rem" }}>¡SOS VOS!</span>}
            </div>
          </div>
        </div>
      )}

      {tipo === "pact" && (
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          background:"rgba(245,158,11,0.08)",
          border:"1px solid rgba(245,158,11,0.2)",
          borderRadius:12, padding:"10px 18px", zIndex:1,
        }}>
          <span style={{ fontSize:"1.2rem" }}>🤝</span>
          <span style={{ color:"#f59e0b", fontSize:"0.85rem", fontFamily:"'Segoe UI',sans-serif" }}>
            Pacto de Caballeros — {PRIZE_PACT} pts cada uno
          </span>
        </div>
      )}

      <div style={{
        display:"flex", alignItems:"center", gap:10,
        color:"rgba(255,255,255,0.45)",
        fontSize:"0.82rem", fontFamily:"'Segoe UI',sans-serif",
        zIndex:1,
      }}>
        {status === "saving" && (
          <div style={{
            width:16, height:16, borderRadius:"50%",
            border:"2px solid #f97316", borderTopColor:"transparent",
            animation:"spin 0.8s linear infinite", flexShrink:0,
          }}/>
        )}
        {status === "done"  && <span style={{ color:"#22c55e" }}>✓</span>}
        {status === "error" && <span style={{ color:"#ef4444" }}>!</span>}
        <span>{msg}{status === "saving" ? dots : ""}</span>
      </div>

      {status === "done" && (
        <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.2)", fontFamily:"'Segoe UI',sans-serif", zIndex:1 }}>
          Regresando a la comunidad...
        </div>
      )}

      <style>{`
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes bgBreath    { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes iconBounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
    </div>
  );
}
