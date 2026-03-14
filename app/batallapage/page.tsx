"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { BattlePlayer as BattlePlayerBase } from "../hooks/useBattleSocket";

// ═══════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════
// Extendemos el tipo del hook agregando el campo local `eliminated`
type BattlePlayer = BattlePlayerBase & { eliminated?: boolean };

interface Question {
  id:       string;
  texto:    string;
  opciones: string[];
  correcta: number;
  categoria: string;
}

interface PlayerAnswer {
  userId:    string;
  opcion:    number | null;
  tiempo:    number; // segundos tardados
  correcto:  boolean;
  pts:       number;
  poder?:    string;
}

interface PowerState {
  A: boolean; // +Tiempo
  B: boolean; // Eliminar 2
  C: boolean; // Cambiar
  D: boolean; // Piedad
}

type GamePhase =
  | "countdown"
  | "playing"
  | "question_result"
  | "round_result"
  | "final_result"
  | "duel"
  | "pact";

// ═══════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════
const CATEGORIAS_MAP: Record<string, string> = {
  shonen: "⚔️ Shonen", seinen: "🎭 Seinen", isekai: "🌀 Isekai",
  romance: "💞 Romance", mecha: "🤖 Mecha", clasico: "📼 Clásico",
  actual: "✨ Actual", peliculas: "🎬 Películas", personajes: "🦸 Personajes",
  opening: "🎵 Opening",
};

const PODERES_INFO = [
  { key: "A" as const, icon: "⏱️", nombre: "+Tiempo",    desc: "15→30 seg",       color: "#00c8ff" },
  { key: "B" as const, icon: "✂️", nombre: "Eliminar 2", desc: "Quita 2 opciones", color: "#a855f7" },
  { key: "C" as const, icon: "🔄", nombre: "Cambiar",    desc: "Nueva pregunta",   color: "#22c55e" },
  { key: "D" as const, icon: "🤍", nombre: "Piedad",     desc: "Solo 50 pts",      color: "#f59e0b" },
];

const TIEMPO_BASE = 15;
const PTS_CORRECTA = 100;
const PTS_PIEDAD = 50;
const PRIZE_WIN = 1000;
const PRIZE_PERFECT = 1500;
const PRIZE_PACT = 750;
const MAX_PREGUNTAS = 10;

// ═══════════════════════════════════════════════════════════
// MOCK PREGUNTAS — en prod vendrían de la API
// ═══════════════════════════════════════════════════════════
function generateQuestions(categorias: string[]): Question[] {
  const pool: Question[] = [
    { id:"q1",  texto: "¿Cuál es el ataque especial de Naruto?",           opciones:["Rasengan","Chidori","Amaterasu","Susanoo"], correcta:0, categoria:"shonen" },
    { id:"q2",  texto: "¿En qué ciudad vive Goku?",                        opciones:["Ciudad Parche","Monte Paozu","Ciudad Satán","Neo Ciudad"], correcta:1, categoria:"shonen" },
    { id:"q3",  texto: "¿Qué significa 'isekai'?",                         opciones:["Mundo paralelo","Magia oscura","Mundo diferente","Viaje en el tiempo"], correcta:2, categoria:"isekai" },
    { id:"q4",  texto: "¿Quién es el protagonista de 'Sword Art Online'?", opciones:["Asuna","Klein","Kirito","Silica"], correcta:2, categoria:"isekai" },
    { id:"q5",  texto: "¿Cuál es el opening de Attack on Titan?",          opciones:["Gurenge","Guren no Yumiya","Inferno","My Hero"], correcta:1, categoria:"opening" },
    { id:"q6",  texto: "¿En qué año se estrenó Dragon Ball Z?",            opciones:["1984","1986","1989","1992"], correcta:2, categoria:"clasico" },
    { id:"q7",  texto: "¿Cuál es la técnica prohibida de Edward Elric?",   opciones:["Alquimia humana","Piedra filosofal","Transmutación inversa","Gate of Truth"], correcta:0, categoria:"seinen" },
    { id:"q8",  texto: "¿Qué mecha pilota Shinji en NGE?",                 opciones:["Eva-00","Eva-01","Eva-02","Eva-03"], correcta:1, categoria:"mecha" },
    { id:"q9",  texto: "¿Cómo se llama la espada de Ichigo?",              opciones:["Benihime","Senbonzakura","Zangetsu","Ryūjin Jakka"], correcta:2, categoria:"shonen" },
    { id:"q10", texto: "¿Quién mata a Jiraiya?",                           opciones:["Itachi","Orochimaru","Pain","Madara"], correcta:2, categoria:"shonen" },
    { id:"q11", texto: "¿De dónde es Rem en Re:Zero?",                    opciones:["Roswaal Manor","Gran Catedral","Capital Lugnica","Villa Emilia"], correcta:0, categoria:"isekai" },
    { id:"q12", texto: "¿Cuántos Titanes Originales hay en AoT?",         opciones:["7","8","9","10"], correcta:2, categoria:"seinen" },
    { id:"q13", texto: "¿Cuál es el poder de Midoriya?",                  opciones:["One For All","All For One","Half-Cold Half-Hot","Zero Gravity"], correcta:0, categoria:"actual" },
    { id:"q14", texto: "¿Qué estudio animó 'Demon Slayer'?",              opciones:["Bones","ufotable","Madhouse","Mappa"], correcta:1, categoria:"actual" },
    { id:"q15", texto: "¿Cuántas pelotas del Dragón existen?",            opciones:["5","6","7","8"], correcta:2, categoria:"clasico" },
  ];

  // ✅ Fix: guard contra undefined/null durante el prerender de Next.js
  const safeCats = Array.isArray(categorias) ? categorias : [];
  const filtered = pool.filter(q => safeCats.includes(q.categoria));
  const base = filtered.length >= MAX_PREGUNTAS ? filtered : pool;
  return [...base].sort(() => Math.random() - 0.5).slice(0, MAX_PREGUNTAS);
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function BattleGame({
  players: initialPlayers,
  categorias,
  myUserId,
  isCreator,
  onFinish,
}: {
  players:    BattlePlayer[];
  categorias: string[];
  myUserId:   string;
  isCreator:  boolean;
  onFinish:   (results: BattlePlayerBase[]) => void;
}) {
  const [phase, setPhase]     = useState<GamePhase>("countdown");
  const [countdown, setCd]    = useState(3);
  const [showGo, setShowGo]   = useState(false);

  const [questions]           = useState<Question[]>(() => generateQuestions(categorias));
  const [qIndex, setQIndex]   = useState(0);
  const [timeLeft, setTime]   = useState(TIEMPO_BASE);
  const [eliminated, setElim] = useState<Set<string>>(new Set());
  const [activePower, setActivePower] = useState<Record<string, string | null>>({});
  const [powers, setPowers]   = useState<Record<string, PowerState>>(() =>
    Object.fromEntries(initialPlayers.map(p => [p.userId, { A:true, B:true, C:true, D:true }]))
  );
  const [hiddenOpts, setHidden] = useState<number[]>([]);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [roundAnswers, setRoundAnswers] = useState<PlayerAnswer[]>([]);
  const [players, setPlayers] = useState<BattlePlayer[]>(initialPlayers);
  const [duelPair, setDuelPair] = useState<string[]>([]);
  const [finalWinner, setFinalWinner] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentQ = questions[qIndex];

  // ── Countdown KOF ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      setShowGo(true);
      setTimeout(() => { setShowGo(false); setPhase("playing"); setTime(TIEMPO_BASE); }, 900);
      return;
    }
    const t = setTimeout(() => setCd(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Timer de pregunta ───────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          commitAnswer(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase, qIndex]);

  // ── Simular respuestas de otros jugadores (en prod viene por socket) ──
  const simulateOthers = useCallback((mySelectedOpt: number | null, myTime: number) => {
    const others = players.filter(p => p.userId !== myUserId && !eliminated.has(p.userId));
    return others.map(p => {
      const t        = Math.floor(Math.random() * TIEMPO_BASE) + 1;
      const opt      = Math.random() > 0.4 ? currentQ.correcta : Math.floor(Math.random() * 4);
      const correcto = opt === currentQ.correcta;
      const pwr      = activePower[p.userId];
      const pts      = correcto ? (pwr === "D" ? PTS_PIEDAD : PTS_CORRECTA) : 0;
      return { userId: p.userId, opcion: opt, tiempo: t, correcto, pts, poder: pwr ?? undefined };
    });
  }, [players, myUserId, eliminated, currentQ, activePower]);

  const commitAnswer = useCallback((opt: number | null) => {
    if (phase !== "playing") return;
    clearInterval(timerRef.current!);
    const myTime   = TIEMPO_BASE - timeLeft + 1;
    const pwr      = activePower[myUserId] ?? null;
    const correcto = opt !== null && opt === currentQ.correcta;
    const pts      = correcto ? (pwr === "D" ? PTS_PIEDAD : PTS_CORRECTA) : 0;
    const myAns: PlayerAnswer = { userId: myUserId, opcion: opt, tiempo: myTime, correcto, pts, poder: pwr ?? undefined };
    const others   = simulateOthers(opt, myTime);
    const all      = [myAns, ...others];
    setRoundAnswers(all);
    setMyAnswer(opt);

    // Actualizar scores
    setPlayers(prev => prev.map(p => {
      const ans = all.find(a => a.userId === p.userId);
      return ans ? { ...p, score: p.score + ans.pts } : p;
    }));

    // Limpiar poderes usados
    setActivePower({});
    setHidden([]);
    setPhase("question_result");
  }, [phase, timeLeft, myUserId, currentQ, activePower, simulateOthers]);

  const handleAnswer = (opt: number) => {
    if (myAnswer !== null || phase !== "playing") return;
    setMyAnswer(opt);
    commitAnswer(opt);
  };

  const nextQuestion = () => {
    const nextIdx = qIndex + 1;
    if (nextIdx >= MAX_PREGUNTAS) {
      resolveRound();
      return;
    }
    setQIndex(nextIdx);
    setMyAnswer(null);
    setRoundAnswers([]);
    setTime(TIEMPO_BASE);
    setPhase("playing");
  };

  // ── Resolver ronda ──────────────────────────────────────
  const resolveRound = () => {
    const sorted = [...players].filter(p => !eliminated.has(p.userId)).sort((a,b) => b.score - a.score);
    if (sorted.length <= 1) {
      setFinalWinner(sorted[0]?.userId ?? null);
      setPhase("final_result");
      return;
    }
    // Eliminar quien tenga menos si no empata
    const top = sorted[0];
    const last = sorted[sorted.length - 1];
    if (top.score !== last.score && sorted.length > 2) {
      setElim(prev => new Set([...prev, last.userId]));
      // Seguimos con los que quedan
      const remaining = sorted.filter(p => p.userId !== last.userId);
      if (remaining.length === 2 && remaining[0].score === remaining[1].score) {
        setDuelPair(remaining.map(p => p.userId));
        setPhase("duel");
      } else if (remaining.length === 1) {
        setFinalWinner(remaining[0].userId);
        setPhase("final_result");
      } else {
        setPhase("round_result");
      }
    } else if (sorted.length === 2) {
      if (sorted[0].score === sorted[1].score) {
        setDuelPair(sorted.map(p => p.userId));
        setPhase("duel");
      } else {
        setFinalWinner(sorted[0].userId);
        setPhase("final_result");
      }
    } else {
      setFinalWinner(sorted[0].userId);
      setPhase("final_result");
    }
  };

  // ── Poderes ─────────────────────────────────────────────
  const usePower = (key: "A"|"B"|"C"|"D") => {
    if (!powers[myUserId]?.[key] || phase !== "playing" || myAnswer !== null) return;
    setPowers(prev => ({ ...prev, [myUserId]: { ...prev[myUserId], [key]: false } }));
    setActivePower(prev => ({ ...prev, [myUserId]: key }));

    if (key === "A") {
      setTime(t => t + 15);
    } else if (key === "B") {
      const wrong = [0,1,2,3].filter(i => i !== currentQ.correcta);
      const toHide = wrong.sort(() => Math.random()-0.5).slice(0,2);
      setHidden(toHide);
    } else if (key === "C") {
      // Cambiar pregunta — en prod emite socket; aquí avanzamos al siguiente
      setQIndex(i => Math.min(i+1, MAX_PREGUNTAS-1));
      setMyAnswer(null);
      setRoundAnswers([]);
      setTime(TIEMPO_BASE);
    }
    // D: piedad solo cambia pts al responder
  };

  const handlePact  = () => setPhase("pact");
  const handleFight = () => {
    // Resetear scores para el duelo
    setPlayers(prev => prev.map(p => duelPair.includes(p.userId) ? {...p, score: 0} : p));
    setQIndex(0); setMyAnswer(null); setRoundAnswers([]); setTime(TIEMPO_BASE);
    setPhase("playing");
  };

  const handleFinalize = () => {
    onFinish(players);
  };

  // ═══════════════════════════════════════════════════════
  // RENDERS
  // ═══════════════════════════════════════════════════════
  if (phase === "countdown") return <CountdownScreen countdown={countdown} showGo={showGo} />;

  if (phase === "playing" || phase === "question_result") return (
    <QuestionScreen
      question={currentQ}
      qIndex={qIndex}
      total={MAX_PREGUNTAS}
      timeLeft={timeLeft}
      players={players}
      myUserId={myUserId}
      myAnswer={myAnswer}
      roundAnswers={roundAnswers}
      eliminated={eliminated}
      powers={powers[myUserId] ?? { A:true,B:true,C:true,D:true }}
      activePower={activePower[myUserId] ?? null}
      hiddenOpts={hiddenOpts}
      phase={phase}
      onAnswer={handleAnswer}
      onPower={usePower}
      onNext={nextQuestion}
    />
  );

  if (phase === "round_result") return (
    <RoundResultScreen
      players={players}
      eliminated={eliminated}
      onContinue={() => {
        setQIndex(0); setMyAnswer(null); setRoundAnswers([]); setTime(TIEMPO_BASE);
        setPhase("playing");
      }}
    />
  );

  if (phase === "duel") return (
    <DuelScreen
      players={players.filter(p => duelPair.includes(p.userId))}
      onPact={handlePact}
      onFight={handleFight}
    />
  );

  if (phase === "pact") return (
    <PactScreen
      players={players.filter(p => duelPair.includes(p.userId))}
      onFinalize={handleFinalize}
    />
  );

  if (phase === "final_result") return (
    <FinalResultScreen
      players={players}
      winnerId={finalWinner}
      myUserId={myUserId}
      onFinalize={handleFinalize}
    />
  );

  return null;
}

// ═══════════════════════════════════════════════════════════
// COUNTDOWN SCREEN — KOF Style
// ═══════════════════════════════════════════════════════════
function CountdownScreen({ countdown, showGo }: { countdown: number; showGo: boolean }) {
  const kofColors: Record<number, string> = {
    3: "#ff0000",
    2: "#ff8800",
    1: "#ffff00",
  };
  const num   = showGo ? null : countdown;
  const color = num ? kofColors[num] : "#00ff44";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Scanlines */}
      <div style={{
        position:"absolute", inset:0,
        backgroundImage:"repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 3px)",
        pointerEvents:"none",
      }}/>
      {/* Noise */}
      <div style={{
        position:"absolute", inset:0, opacity:0.06,
        backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        pointerEvents:"none",
      }}/>

      {/* Corner decoration */}
      {["top-left","top-right","bottom-left","bottom-right"].map(pos => (
        <div key={pos} style={{
          position:"absolute",
          top:    pos.includes("top")    ? 20 : undefined,
          bottom: pos.includes("bottom") ? 20 : undefined,
          left:   pos.includes("left")   ? 20 : undefined,
          right:  pos.includes("right")  ? 20 : undefined,
          width:48, height:48,
          border:`3px solid ${color}`,
          borderRight:  pos.includes("right")  ? `3px solid ${color}` : "none",
          borderLeft:   pos.includes("left")   ? `3px solid ${color}` : "none",
          borderTop:    pos.includes("top")    ? `3px solid ${color}` : "none",
          borderBottom: pos.includes("bottom") ? `3px solid ${color}` : "none",
          opacity:0.6,
          transition:"all 0.3s",
        }}/>
      ))}

      {/* Label top */}
      <div style={{
        fontFamily:"'Arial Black', Impact, sans-serif",
        fontSize:"0.75rem", letterSpacing:"0.4em",
        color:"rgba(255,255,255,0.4)", marginBottom:32,
        textTransform:"uppercase",
      }}>NAKAMA BATTLE SYSTEM</div>

      {/* Number / GO */}
      <div key={showGo ? "go" : countdown} style={{
        fontFamily:"'Arial Black', Impact, sans-serif",
        fontSize: showGo ? "clamp(80px,18vw,160px)" : "clamp(100px,22vw,220px)",
        fontWeight:900,
        lineHeight:1,
        color: color,
        textShadow:`
          0 0 20px ${color},
          0 0 60px ${color}88,
          0 0 120px ${color}44,
          4px 4px 0px #000,
          -4px -4px 0px #000
        `,
        letterSpacing: showGo ? "0.12em" : "-0.04em",
        animation:"kofPop 0.25s cubic-bezier(0.17,0.67,0.83,0.67)",
        userSelect:"none",
      }}>
        {showGo ? "GO!" : countdown}
      </div>

      {/* Subtext */}
      {!showGo && (
        <div style={{
          marginTop:20,
          fontFamily:"'Arial Black', Impact, sans-serif",
          fontSize:"0.8rem", letterSpacing:"0.3em",
          color:"rgba(255,255,255,0.3)",
          textTransform:"uppercase",
        }}>
          {countdown === 3 ? "ROUND 1" : countdown === 2 ? "FIGHT!" : "READY?"}
        </div>
      )}

      {/* Horizontal line */}
      <div style={{
        position:"absolute", bottom:120, left:0, right:0,
        height:2,
        background:`linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity:0.5,
        boxShadow:`0 0 20px ${color}`,
      }}/>

      <style>{`
        @keyframes kofPop {
          0%   { transform: scale(1.8); opacity:0; }
          60%  { transform: scale(0.92); }
          100% { transform: scale(1); opacity:1; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUESTION SCREEN
// ═══════════════════════════════════════════════════════════
function QuestionScreen({
  question, qIndex, total, timeLeft, players, myUserId, myAnswer,
  roundAnswers, eliminated, powers, activePower, hiddenOpts,
  phase, onAnswer, onPower, onNext,
}: {
  question:    Question;
  qIndex:      number;
  total:       number;
  timeLeft:    number;
  players:     BattlePlayer[];
  myUserId:    string;
  myAnswer:    number | null;
  roundAnswers: PlayerAnswer[];
  eliminated:  Set<string>;
  powers:      PowerState;
  activePower: string | null;
  hiddenOpts:  number[];
  phase:       GamePhase;
  onAnswer:    (opt: number) => void;
  onPower:     (key: "A"|"B"|"C"|"D") => void;
  onNext:      () => void;
}) {
  const isResult = phase === "question_result";
  const pct      = (timeLeft / (activePower === "A" ? 30 : TIEMPO_BASE)) * 100;
  const danger   = timeLeft <= 5;

  return (
    <div style={{
      minHeight:"100vh", background:"#080810",
      fontFamily:"'Arial Black', Impact, sans-serif",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
    }}>
      {/* TOP BAR */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 16px",
        background:"rgba(255,255,255,0.03)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize:"0.6rem", letterSpacing:"0.25em", color:"#f97316" }}>
          NAKAMA BATTLE
        </div>
        <div style={{
          fontSize:"0.72rem", color:"#fff", opacity:0.6,
          fontFamily:"'Segoe UI', sans-serif",
        }}>
          Pregunta {qIndex+1}/{total} · {CATEGORIAS_MAP[question.categoria] ?? question.categoria}
        </div>
        {/* Timer */}
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          color: danger ? "#ef4444" : "#fff",
          animation: danger ? "dangerPulse 0.5s ease infinite" : "none",
        }}>
          <span style={{ fontSize:"1.4rem", fontWeight:900 }}>{timeLeft}</span>
          <span style={{ fontSize:"0.6rem", opacity:0.5 }}>SEG</span>
        </div>
      </div>

      {/* Timer Bar */}
      <div style={{ height:4, background:"rgba(255,255,255,0.06)" }}>
        <div style={{
          height:"100%", width:`${pct}%`,
          background: danger
            ? "linear-gradient(90deg,#ef4444,#ff0000)"
            : "linear-gradient(90deg,#f97316,#fbbf24)",
          boxShadow: danger ? "0 0 12px #ef4444" : "0 0 12px #f97316",
          transition:"width 1s linear",
        }}/>
      </div>

      {/* PLAYER CARDS */}
      <div style={{
        display:"grid",
        gridTemplateColumns: `repeat(${Math.min(players.filter(p=>!eliminated.has(p.userId)).length,4)}, 1fr)`,
        gap:8, padding:"10px 12px",
      }}>
        {players.filter(p => !eliminated.has(p.userId)).map(p => {
          const ans     = roundAnswers.find(a => a.userId === p.userId);
          const isMe    = p.userId === myUserId;
          const hasAns  = ans !== null && ans !== undefined;

          return (
            <div key={p.userId} style={{
              background: isMe
                ? "linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.06))"
                : "rgba(255,255,255,0.03)",
              border:`1.5px solid ${isMe ? "#f97316" : "rgba(255,255,255,0.07)"}`,
              borderRadius:10, padding:"10px 8px",
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              transition:"all 0.3s",
            }}>
              {/* Avatar */}
              <div style={{ position:"relative" }}>
                <div style={{
                  width:44, height:44, borderRadius:"50%", overflow:"hidden",
                  border:`2px solid ${isMe ? "#f97316" : "rgba(255,255,255,0.12)"}`,
                }}>
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt={p.username} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <div style={{
                        width:"100%",height:"100%",
                        background:"linear-gradient(135deg,#f97316,#e05000)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:"1.1rem",fontWeight:900,color:"#fff",
                      }}>{p.username[0].toUpperCase()}</div>
                  }
                </div>
                {/* Answered indicator */}
                {isResult && hasAns && (
                  <div style={{
                    position:"absolute", bottom:-2, right:-2,
                    width:16, height:16, borderRadius:"50%",
                    background: ans.correcto ? "#22c55e" : "#ef4444",
                    border:"2px solid #080810",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"0.55rem",
                  }}>
                    {ans.correcto ? "✓" : "✗"}
                  </div>
                )}
                {!isResult && (
                  <div style={{
                    position:"absolute", bottom:-2, right:-2,
                    width:14, height:14, borderRadius:"50%",
                    background: (isMe && myAnswer !== null) ? "#22c55e" : (hasAns ? "#22c55e" : "#6b7280"),
                    border:"2px solid #080810",
                    animation: (!isMe && !hasAns && !isResult) ? "waitPulse 1.5s ease infinite" : "none",
                  }}/>
                )}
              </div>

              {/* Name */}
              <div style={{
                fontSize:"0.62rem", fontWeight:700,
                color: isMe ? "#f97316" : "#fff",
                opacity: isMe ? 1 : 0.7,
                overflow:"hidden", textOverflow:"ellipsis",
                whiteSpace:"nowrap", maxWidth:80,
                fontFamily:"'Segoe UI',sans-serif",
              }}>
                {isMe ? "TÚ" : p.username}
              </div>

              {/* Score */}
              <div style={{
                fontSize:"1rem", fontWeight:900, color:"#00c8ff",
                letterSpacing:"-0.02em",
              }}>
                {p.score.toLocaleString()}
                <span style={{fontSize:"0.5rem",color:"#6b7280",marginLeft:2}}>pts</span>
              </div>

              {/* Result detail */}
              {isResult && hasAns && (
                <div style={{
                  fontSize:"0.6rem", color: ans.correcto ? "#22c55e" : "#ef4444",
                  fontFamily:"'Segoe UI',sans-serif",
                  textAlign:"center",
                }}>
                  {ans.correcto ? `+${ans.pts} pts` : "Sin puntos"}
                  {ans.poder === "D" && ans.correcto && <span style={{color:"#f59e0b"}}> (Piedad)</span>}
                  <br/>
                  <span style={{color:"rgba(255,255,255,0.3)"}}>en {ans.tiempo}s</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* QUESTION */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"8px 16px 0" }}>
        <div style={{
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:12, padding:"14px 16px", marginBottom:10,
        }}>
          <p style={{
            margin:0, fontSize:"clamp(0.85rem,2.5vw,1rem)",
            color:"#fff", lineHeight:1.5,
            fontFamily:"'Segoe UI',sans-serif", fontWeight:700,
          }}>
            {question.texto}
          </p>
        </div>

        {/* Opciones */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, flex:1 }}>
          {question.opciones.map((opt, i) => {
            const hidden   = hiddenOpts.includes(i);
            const selected = myAnswer === i;
            const correct  = question.correcta === i;
            const wrong    = isResult && selected && !correct;
            const showRight = isResult && correct;

            let bg = "rgba(255,255,255,0.04)";
            let border = "1px solid rgba(255,255,255,0.1)";
            let color  = "#fff";

            if (hidden && !isResult) { bg = "rgba(0,0,0,0.3)"; border = "1px dashed rgba(255,255,255,0.08)"; color="#3a3a4a"; }
            else if (showRight) { bg = "rgba(34,197,94,0.15)"; border = "1.5px solid #22c55e"; color="#22c55e"; }
            else if (wrong)     { bg = "rgba(239,68,68,0.12)";  border = "1.5px solid #ef4444"; color="#ef4444"; }
            else if (selected && !isResult) { bg = "rgba(249,115,22,0.12)"; border = "1.5px solid #f97316"; color="#f97316"; }

            const LETTERS = ["A","B","C","D"];

            return (
              <button key={i}
                disabled={hidden || isResult || myAnswer !== null}
                onClick={() => onAnswer(i)}
                style={{
                  background: bg, border, borderRadius:10,
                  color, padding:"12px 14px",
                  cursor: (!hidden && !isResult && myAnswer === null) ? "pointer" : "default",
                  textAlign:"left", display:"flex", alignItems:"center", gap:10,
                  transition:"all 0.2s",
                  fontFamily:"'Segoe UI',sans-serif",
                  transform: selected ? "scale(1.01)" : "scale(1)",
                }}>
                <span style={{
                  width:24, height:24, borderRadius:6, flexShrink:0,
                  background:"rgba(255,255,255,0.07)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"0.7rem", fontWeight:900, color:"rgba(255,255,255,0.4)",
                  fontFamily:"'Arial Black',sans-serif",
                }}>{LETTERS[i]}</span>
                <span style={{fontSize:"0.82rem", fontWeight:600, lineHeight:1.3}}>
                  {hidden && !isResult ? "••••" : opt}
                </span>
                {showRight && <span style={{marginLeft:"auto", fontSize:"0.8rem"}}>✓</span>}
                {wrong     && <span style={{marginLeft:"auto", fontSize:"0.8rem"}}>✗</span>}
              </button>
            );
          })}
        </div>

        {/* PODERES */}
        <div style={{
          display:"flex", gap:6, padding:"10px 0 6px",
          justifyContent:"center",
        }}>
          {PODERES_INFO.map(p => {
            const avail = powers[p.key] && !isResult && myAnswer === null;
            const used  = !powers[p.key];
            return (
              <button key={p.key}
                onClick={() => onPower(p.key)}
                disabled={!avail}
                title={`${p.nombre}: ${p.desc}`}
                style={{
                  width:48, height:48, borderRadius:10,
                  background: used
                    ? "rgba(255,255,255,0.02)"
                    : avail
                    ? `rgba(${hexToRgb(p.color)},0.12)`
                    : "rgba(255,255,255,0.02)",
                  border:`1.5px solid ${used ? "rgba(255,255,255,0.05)" : avail ? p.color : "rgba(255,255,255,0.05)"}`,
                  cursor: avail ? "pointer" : "not-allowed",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  gap:2, opacity: used ? 0.25 : 1,
                  transition:"all 0.2s",
                }}>
                <span style={{fontSize:"1.1rem"}}>{used ? "✗" : p.icon}</span>
                <span style={{
                  fontSize:"0.42rem",
                  color: used ? "rgba(255,255,255,0.2)" : p.color,
                  fontFamily:"'Segoe UI',sans-serif",
                  fontWeight:700, letterSpacing:"0.05em",
                  textTransform:"uppercase",
                }}>{p.key}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* NEXT BUTTON (solo en result) */}
      {isResult && (
        <div style={{ padding:"10px 16px 20px", display:"flex", justifyContent:"center" }}>
          <button onClick={onNext} style={{
            background:"linear-gradient(135deg,#f97316,#e05000)",
            border:"none", color:"#fff", fontWeight:900,
            padding:"12px 40px", borderRadius:12, cursor:"pointer",
            fontSize:"0.9rem", letterSpacing:"0.06em",
            boxShadow:"0 4px 20px rgba(249,115,22,0.4)",
            fontFamily:"'Arial Black',sans-serif",
            animation:"readyPulse 1s ease infinite",
          }}>
            {qIndex + 1 >= MAX_PREGUNTAS ? "VER RESULTADO" : "SIGUIENTE ▶"}
          </button>
        </div>
      )}

      <style>{`
        @keyframes dangerPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes waitPulse   { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.4; transform:scale(0.8)} }
        @keyframes readyPulse  { 0%,100%{box-shadow:0 4px 20px rgba(249,115,22,0.4)} 50%{box-shadow:0 4px 40px rgba(249,115,22,0.7)} }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROUND RESULT SCREEN
// ═══════════════════════════════════════════════════════════
function RoundResultScreen({
  players, eliminated, onContinue,
}: {
  players: BattlePlayer[]; eliminated: Set<string>; onContinue: () => void;
}) {
  const active = players.filter(p => !eliminated.has(p.userId)).sort((a,b) => b.score - a.score);
  const elim   = players.filter(p => eliminated.has(p.userId));

  return (
    <div style={{
      minHeight:"100vh", background:"#080810",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:24, gap:24, fontFamily:"'Arial Black',Impact,sans-serif",
    }}>
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#f97316" }}>RESULTADO DE RONDA</div>
      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.4rem,5vw,2rem)" }}>CONTINÚAN</h2>

      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:360 }}>
        {active.map((p,i) => (
          <div key={p.userId} style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"14px 16px", borderRadius:12,
            background:`linear-gradient(135deg,rgba(249,115,22,0.08),rgba(249,115,22,0.03))`,
            border:`1.5px solid ${i===0?"#f97316":"rgba(255,255,255,0.08)"}`,
          }}>
            <span style={{fontSize:"1.4rem"}}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
            <AvatarSmall url={p.avatarUrl} name={p.username}/>
            <span style={{flex:1,color:"#fff",fontSize:"0.85rem",fontFamily:"'Segoe UI',sans-serif"}}>{p.username}</span>
            <span style={{color:"#00c8ff",fontWeight:900}}>{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {elim.length > 0 && (
        <>
          <h3 style={{ color:"#ef4444", margin:"8px 0 0", fontSize:"1rem" }}>ELIMINADOS</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%", maxWidth:360 }}>
            {elim.map(p => (
              <div key={p.userId} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"10px 14px", borderRadius:10,
                background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)",
                opacity:0.7,
              }}>
                <span style={{fontSize:"1.1rem"}}>💀</span>
                <AvatarSmall url={p.avatarUrl} name={p.username}/>
                <span style={{flex:1,color:"#9ca3af",fontSize:"0.82rem",fontFamily:"'Segoe UI',sans-serif"}}>{p.username}</span>
                <span style={{color:"#6b7280",fontWeight:700}}>{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button onClick={onContinue} style={{
        marginTop:8,
        background:"linear-gradient(135deg,#f97316,#e05000)",
        border:"none", color:"#fff", fontWeight:900,
        padding:"14px 48px", borderRadius:12, cursor:"pointer",
        fontSize:"1rem", letterSpacing:"0.08em",
        boxShadow:"0 4px 24px rgba(249,115,22,0.4)",
      }}>
        CONTINUAR ⚔️
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DUEL SCREEN — Desempate o Pacto
// ═══════════════════════════════════════════════════════════
function DuelScreen({
  players, onPact, onFight,
}: {
  players: BattlePlayer[]; onPact: () => void; onFight: () => void;
}) {
  const [p1, p2] = players;
  return (
    <div style={{
      minHeight:"100vh", background:"#080810",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:24, gap:20, fontFamily:"'Arial Black',Impact,sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      {/* BG effect */}
      <div style={{
        position:"absolute", inset:0,
        background:"radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 70%)",
        pointerEvents:"none",
      }}/>

      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#f97316" }}>¡EMPATE!</div>
      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.6rem,5vw,2.4rem)", textAlign:"center" }}>
        DUELO FINAL
      </h2>

      {/* Players VS */}
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <PlayerMini player={p1}/>
        <div style={{
          fontSize:"clamp(1.8rem,6vw,3rem)", fontWeight:900,
          color:"#f97316",
          textShadow:"0 0 20px #f97316",
        }}>VS</div>
        <PlayerMini player={p2}/>
      </div>

      <p style={{
        color:"rgba(255,255,255,0.4)", fontSize:"0.8rem",
        fontFamily:"'Segoe UI',sans-serif", textAlign:"center",
        maxWidth:280, lineHeight:1.6,
      }}>
        Ambos tienen el mismo puntaje. Pueden pelear en un duelo de 10 preguntas, o hacer un pacto de caballeros y repartirse los premios.
      </p>

      <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
        <button onClick={onFight} style={{
          background:"linear-gradient(135deg,#ef4444,#b91c1c)",
          border:"none", color:"#fff", fontWeight:900,
          padding:"14px 32px", borderRadius:12, cursor:"pointer",
          fontSize:"0.9rem", letterSpacing:"0.06em",
          boxShadow:"0 4px 20px rgba(239,68,68,0.35)",
        }}>⚔️ PELEAR</button>
        <button onClick={onPact} style={{
          background:"rgba(255,255,255,0.04)",
          border:"1.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.8)",
          fontWeight:900, padding:"14px 32px", borderRadius:12, cursor:"pointer",
          fontSize:"0.9rem", letterSpacing:"0.06em",
        }}>🤝 PACTO DE CABALLEROS</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PACT SCREEN
// ═══════════════════════════════════════════════════════════
function PactScreen({ players, onFinalize }: { players: BattlePlayer[]; onFinalize: () => void }) {
  return (
    <div style={{
      minHeight:"100vh", background:"#080810",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:24, gap:20, fontFamily:"'Arial Black',Impact,sans-serif",
    }}>
      <span style={{fontSize:"3rem"}}>🤝</span>
      <h2 style={{color:"#fff",margin:0,fontSize:"clamp(1.6rem,5vw,2.2rem)",textAlign:"center"}}>
        PACTO DE CABALLEROS
      </h2>
      <p style={{color:"rgba(255,255,255,0.5)",fontSize:"0.85rem",fontFamily:"'Segoe UI',sans-serif",textAlign:"center",maxWidth:300}}>
        La sabiduría y el respeto mutuo llevan a un acuerdo honorable.
      </p>

      <div style={{display:"flex",gap:20,alignItems:"center"}}>
        {players.map(p => (
          <div key={p.userId} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:10,
            padding:"20px 24px", borderRadius:14,
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
          }}>
            <AvatarMed url={p.avatarUrl} name={p.username}/>
            <div style={{color:"#fff",fontFamily:"'Segoe UI',sans-serif",fontWeight:700}}>{p.username}</div>
            <div style={{color:"#f59e0b",fontSize:"1.4rem",fontWeight:900}}>
              {PRIZE_PACT.toLocaleString()}
              <span style={{fontSize:"0.6rem",color:"#6b7280",marginLeft:4}}>pts</span>
            </div>
          </div>
        ))}
      </div>

      <p style={{color:"rgba(255,255,255,0.3)",fontSize:"0.72rem",fontFamily:"'Segoe UI',sans-serif"}}>
        Cada uno recibe {PRIZE_PACT} puntos
      </p>

      <button onClick={onFinalize} style={{
        background:"linear-gradient(135deg,#f59e0b,#d97706)",
        border:"none", color:"#000", fontWeight:900,
        padding:"14px 40px", borderRadius:12, cursor:"pointer",
        fontSize:"0.95rem", letterSpacing:"0.06em",
        boxShadow:"0 4px 20px rgba(245,158,11,0.4)",
      }}>
        CONFIRMAR Y FINALIZAR
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FINAL RESULT SCREEN — Ganador con efectos épicos
// ═══════════════════════════════════════════════════════════
function FinalResultScreen({
  players, winnerId, myUserId, onFinalize,
}: {
  players: BattlePlayer[]; winnerId: string | null; myUserId: string; onFinalize: () => void;
}) {
  const sorted = [...players].sort((a,b) => b.score - a.score);
  const winner = players.find(p => p.userId === winnerId);
  const perfect = winner && winner.score >= PTS_CORRECTA * MAX_PREGUNTAS;
  const prize   = perfect ? PRIZE_PERFECT : PRIZE_WIN;
  const amWinner = winnerId === myUserId;

  return (
    <div style={{
      minHeight:"100vh", background:"#080810",
      display:"flex",flexDirection:"column",alignItems:"center",
      padding:"24px 16px 32px", gap:20,
      fontFamily:"'Arial Black',Impact,sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      {/* BG Rays for winner */}
      {winnerId && (
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:`radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.12) 0%, transparent 65%)`,
        }}/>
      )}

      {/* Confetti dots */}
      {[...Array(20)].map((_,i) => (
        <div key={i} style={{
          position:"absolute",
          left:`${Math.random()*100}%`,
          top:`${Math.random()*60}%`,
          width: Math.random()*6+2,
          height: Math.random()*6+2,
          borderRadius:"50%",
          background:["#f97316","#fbbf24","#22c55e","#00c8ff","#a855f7"][i%5],
          opacity:0.6,
          animation:`confettiFall ${1.5+Math.random()*2}s ease ${Math.random()*2}s infinite`,
        }}/>
      ))}

      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#f97316", zIndex:1 }}>
        FIN DE LA BATALLA
      </div>

      {winner && (
        <>
          <div style={{fontSize:"clamp(2rem,8vw,4rem)"}}>{amWinner?"🏆":"👑"}</div>
          <h2 style={{
            color: amWinner ? "#fbbf24" : "#fff",
            margin:0, fontSize:"clamp(1.4rem,5vw,2.2rem)",
            textAlign:"center", zIndex:1,
            textShadow: amWinner ? "0 0 30px rgba(251,191,36,0.6)" : "none",
          }}>
            {amWinner ? "¡GANASTE!" : `${winner.username} ganó`}
          </h2>
          <div style={{
            fontSize:"2rem", fontWeight:900, color:"#fbbf24", zIndex:1,
            textShadow:"0 0 20px rgba(251,191,36,0.5)",
          }}>
            {prize.toLocaleString()} pts
            {perfect && <span style={{fontSize:"0.8rem",color:"#a855f7",marginLeft:8}}>¡PERFECTO!</span>}
          </div>
        </>
      )}

      {/* Ranking */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%", maxWidth:400, zIndex:1 }}>
        {sorted.map((p,i) => {
          const isWin = p.userId === winnerId;
          return (
            <div key={p.userId} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"14px 16px", borderRadius:12,
              position:"relative", overflow:"hidden",
              border: isWin
                ? "1.5px solid rgba(251,191,36,0.5)"
                : "1px solid rgba(255,255,255,0.06)",
              transition:"all 0.3s",
            }}>
              {/* Winner glow BG */}
              {isWin && (
                <div style={{
                  position:"absolute", inset:0,
                  background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(249,115,22,0.06))",
                  pointerEvents:"none",
                }}/>
              )}
              {/* Loser dark overlay */}
              {!isWin && (
                <div style={{
                  position:"absolute", inset:0,
                  background:"rgba(0,0,0,0.5)",
                  pointerEvents:"none",
                }}/>
              )}

              <span style={{ fontSize:"1.4rem", zIndex:1 }}>
                {isWin ? "🏆" : i===1 ? "🥈" : i===2 ? "🥉" : "💀"}
              </span>
              <AvatarMed url={p.avatarUrl} name={p.username} size={36}
                style={{ zIndex:1, filter: isWin ? "none" : "grayscale(80%) brightness(0.4)" }}
              />
              <div style={{ flex:1, zIndex:1 }}>
                <div style={{
                  color: isWin ? "#fbbf24" : "#6b7280",
                  fontFamily:"'Segoe UI',sans-serif", fontWeight:700, fontSize:"0.85rem",
                }}>{p.username}{p.userId===myUserId&&" (tú)"}</div>
                <div style={{
                  fontSize:"0.65rem",
                  color: isWin ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.15)",
                  fontFamily:"'Segoe UI',sans-serif",
                }}>
                  {isWin ? `Gana ${prize.toLocaleString()} pts` : `Obtiene ${p.score.toLocaleString()} pts`}
                </div>
              </div>
              <div style={{
                fontSize:"1rem", fontWeight:900, zIndex:1,
                color: isWin ? "#fbbf24" : "#4b5563",
              }}>
                {p.score.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onFinalize} style={{
        background:"linear-gradient(135deg,#f97316,#e05000)",
        border:"none", color:"#fff", fontWeight:900,
        padding:"14px 48px", borderRadius:12, cursor:"pointer",
        fontSize:"0.95rem", letterSpacing:"0.08em",
        boxShadow:"0 4px 24px rgba(249,115,22,0.4)",
        zIndex:1, marginTop:8,
      }}>
        FINALIZAR BATALLA
      </button>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 0.6; }
          100% { transform: translateY(60px)  rotate(180deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MICRO HELPERS
// ═══════════════════════════════════════════════════════════
function AvatarSmall({ url, name }: { url?: string | null; name: string }) {
  return (
    <div style={{ width:32, height:32, borderRadius:"50%", overflow:"hidden", flexShrink:0,
      border:"2px solid rgba(255,255,255,0.1)" }}>
      {url
        ? <img src={url} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        : <div style={{
            width:"100%",height:"100%",
            background:"linear-gradient(135deg,#f97316,#e05000)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"0.75rem",fontWeight:900,color:"#fff",
          }}>{name[0].toUpperCase()}</div>
      }
    </div>
  );
}

function AvatarMed({ url, name, size=44, style:extraStyle }: {
  url?: string|null; name:string; size?:number; style?: React.CSSProperties;
}) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", overflow:"hidden", flexShrink:0,
      border:"2px solid rgba(255,255,255,0.12)", ...extraStyle }}>
      {url
        ? <img src={url} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        : <div style={{
            width:"100%",height:"100%",
            background:"linear-gradient(135deg,#f97316,#e05000)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize: size*0.35, fontWeight:900, color:"#fff",
          }}>{name[0].toUpperCase()}</div>
      }
    </div>
  );
}

function PlayerMini({ player }: { player: BattlePlayer }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
      <AvatarMed url={player.avatarUrl} name={player.username} size={52}/>
      <div style={{ color:"#fff", fontSize:"0.75rem", fontFamily:"'Segoe UI',sans-serif", fontWeight:700 }}>
        {player.username}
      </div>
      <div style={{ color:"#00c8ff", fontSize:"0.9rem", fontWeight:900 }}>
        {player.score.toLocaleString()}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}