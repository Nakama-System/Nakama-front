"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { BattlePlayer as BattlePlayerBase } from "../hooks/useBattleSocket";

// ═══════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════
type BattlePlayer = BattlePlayerBase & { eliminated?: boolean };

interface Question {
  id:        string;
  texto:     string;
  opciones:  string[];
  correcta:  number;
  categoria: string;
}

interface PlayerRoundResult {
  userId:   string;
  correcto: boolean;
  pts:      number;
  tiempo:   number;
  opcion:   number | null;
}

interface PowerState {
  A: boolean;
  B: boolean;
  C: boolean;
  D: boolean;
}

type GamePhase =
  | "waiting_start"
  | "countdown"
  | "playing"
  | "question_result"
  | "waiting_game_over"
  | "final_result"
  | "duel_creator"
  | "duel_waiting_decision"
  | "duel_waiting_response"
  | "duel_response"
  | "duel_rejected_result"
  | "pact";

// ═══════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const CATEGORIAS_MAP: Record<string, string> = {
  shonen:"⚔️ Shonen", seinen:"🎭 Seinen", isekai:"🌀 Isekai",
  romance:"💞 Romance", mecha:"🤖 Mecha", clasico:"📼 Clásico",
  actual:"✨ Actual", peliculas:"🎬 Películas", personajes:"🦸 Personajes",
  opening:"🎵 Opening",
};

const PODERES_INFO = [
  { key:"A" as const, icon:"⏱️", nombre:"+Tiempo",    desc:"15→30 seg",        color:"#00c8ff" },
  { key:"B" as const, icon:"✂️", nombre:"Eliminar 2", desc:"Quita 2 opciones", color:"#a855f7" },
  { key:"C" as const, icon:"🔄", nombre:"Cambiar",    desc:"Saltar pregunta",   color:"#22c55e" },
  { key:"D" as const, icon:"🤍", nombre:"Piedad",     desc:"Solo 50 pts",       color:"#f59e0b" },
];

const TIEMPO_BASE    = 15;
const PTS_CORRECTA   = 100;
const PTS_PIEDAD     = 50;
const PRIZE_WIN      = 1000;
const PRIZE_PERFECT  = 1500;
const PRIZE_PACT     = 750;
const MAX_PREGUNTAS  = 10;
const AUTO_START_SEG = 15;

// ✅ NUEVO: segundos que se espera a que el rival termine antes de resolver automáticamente
const WAITING_RIVAL_TIMEOUT_SEG = 30;

// ═══════════════════════════════════════════════════════════
// PREGUNTAS MOCK
// ═══════════════════════════════════════════════════════════
function generateQuestions(categorias: string[]): Question[] {
  const pool: Question[] = [
    { id:"q1",  texto:"¿Cuál es el ataque especial de Naruto?",           opciones:["Rasengan","Chidori","Amaterasu","Susanoo"],                        correcta:0, categoria:"shonen"  },
    { id:"q2",  texto:"¿En qué lugar vive Goku de niño?",                 opciones:["Ciudad Parche","Monte Paozu","Ciudad Satán","Neo Ciudad"],          correcta:1, categoria:"shonen"  },
    { id:"q3",  texto:"¿Qué significa 'isekai'?",                         opciones:["Mundo paralelo","Magia oscura","Mundo diferente","Viaje"],           correcta:2, categoria:"isekai"  },
    { id:"q4",  texto:"¿Quién es el protagonista de Sword Art Online?",   opciones:["Asuna","Klein","Kirito","Silica"],                                  correcta:2, categoria:"isekai"  },
    { id:"q5",  texto:"¿Cuál es el opening de Attack on Titan?",          opciones:["Gurenge","Guren no Yumiya","Inferno","My Hero"],                     correcta:1, categoria:"opening" },
    { id:"q6",  texto:"¿En qué año se estrenó Dragon Ball Z?",            opciones:["1984","1986","1989","1992"],                                        correcta:2, categoria:"clasico" },
    { id:"q7",  texto:"¿Cuál es la técnica prohibida de Edward Elric?",   opciones:["Alquimia humana","Piedra filosofal","Transmutación inversa","Gate"], correcta:0, categoria:"seinen"  },
    { id:"q8",  texto:"¿Qué mecha pilota Shinji Ikari?",                  opciones:["Eva-00","Eva-01","Eva-02","Eva-03"],                                correcta:1, categoria:"mecha"   },
    { id:"q9",  texto:"¿Cómo se llama la espada de Ichigo Kurosaki?",     opciones:["Benihime","Senbonzakura","Zangetsu","Ryūjin Jakka"],                correcta:2, categoria:"shonen"  },
    { id:"q10", texto:"¿Quién mata a Jiraiya en Naruto Shippuden?",       opciones:["Itachi","Orochimaru","Pain","Madara"],                              correcta:2, categoria:"shonen"  },
    { id:"q11", texto:"¿De dónde es Rem en Re:Zero?",                     opciones:["Roswaal Manor","Gran Catedral","Capital Lugnica","Villa Emilia"],   correcta:0, categoria:"isekai"  },
    { id:"q12", texto:"¿Cuántos Titanes Originales hay en AoT?",          opciones:["7","8","9","10"],                                                  correcta:2, categoria:"seinen"  },
    { id:"q13", texto:"¿Cuál es el poder de Izuku Midoriya?",             opciones:["One For All","All For One","Half-Cold Half-Hot","Zero Gravity"],    correcta:0, categoria:"actual"  },
    { id:"q14", texto:"¿Qué estudio animó Demon Slayer?",                 opciones:["Bones","ufotable","Madhouse","Mappa"],                              correcta:1, categoria:"actual"  },
    { id:"q15", texto:"¿Cuántas Dragon Balls existen?",                   opciones:["5","6","7","8"],                                                   correcta:2, categoria:"clasico" },
  ];
  const filtered = pool.filter(q => categorias.includes(q.categoria));
  const base     = filtered.length >= MAX_PREGUNTAS ? filtered : pool;
  return [...base].sort(() => Math.random() - 0.5).slice(0, MAX_PREGUNTAS);
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════
interface BattleGameProps {
  roomId:     string;
  players:    BattlePlayer[];   // ya viene filtrado: solo los que aceptaron (status !== "declined")
  categorias: string[];
  myUserId:   string;
  isCreator:  boolean;
  token:      string;
  onFinish:   (results: BattlePlayerBase[]) => void;
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function BattleGame({
  roomId, players: initialPlayers, categorias,
  myUserId, isCreator, token, onFinish,
}: BattleGameProps) {

  const socketRef        = useRef<Socket | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionsRef     = useRef<Question[]>([]);
  const creatorSetupDone = useRef(false);
  const autoTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Solo se permite 1 revancha.
  const duelRoundRef = useRef(0);

  // ✅ Scores acumulados localmente
  const myFinalScoreRef = useRef(0);

  // ✅ initialPlayers ya viene filtrado (solo accepted desde page.tsx → activePlayers)
  // Excluimos explícitamente cualquier "declined" que pudiera colarse
  const acceptedInitial = initialPlayers.filter(p => p.status !== "declined");
  const activeTotalRef  = useRef(acceptedInitial.length);
  const donePlayersRef  = useRef<Set<string>>(new Set());
  const myScoreAtDone   = useRef(0);

  // ✅ NUEVO: timer de espera al rival (30s tras terminar todas las preguntas)
  const rivalTimeoutRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rivalCountdown, setRivalCountdown] = useState<number | null>(null);

  // ── AUDIO: música ambiente ───────────────────────────────
  const gameAmbientRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio();
    a.preload = "none"; a.loop = true; a.volume = 0.35;
    a.src = "/assets/musicambientea.mp3";
    gameAmbientRef.current = a;
    a.play().catch(() => {});
    return () => { a.pause(); a.src = ""; gameAmbientRef.current = null; };
  }, []);

  // ── AUDIO: cuenta regresiva ──────────────────────────────
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    try {
      const audio = new Audio();
      audio.preload = "none";
      audio.src = "/assets/cuenta_regresiva.mp3";
      countdownAudioRef.current = audio;
    } catch { countdownAudioRef.current = null; }
    return () => { countdownAudioRef.current?.pause(); countdownAudioRef.current = null; };
  }, []);

  const playCountdownAudio = useCallback(() => {
    if (!countdownAudioRef.current) return;
    try { countdownAudioRef.current.currentTime = 0; countdownAudioRef.current.play().catch(() => {}); } catch {}
  }, []);

  const stopCountdownAudio = useCallback(() => {
    if (!countdownAudioRef.current) return;
    try { countdownAudioRef.current.pause(); countdownAudioRef.current.currentTime = 0; } catch {}
  }, []);

  const [phase,        setPhase]        = useState<GamePhase>("waiting_start");
  const [countdown,    setCd]           = useState(3);
  const [showGo,       setShowGo]       = useState(false);
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [qIndex,       setQIndex]       = useState(0);
  const [timeLeft,     setTime]         = useState(TIEMPO_BASE);
  const [powers,       setPowers]       = useState<PowerState>({ A:true, B:true, C:true, D:true });
  const [activePower,  setActivePower]  = useState<string | null>(null);
  const [hiddenOpts,   setHidden]       = useState<number[]>([]);
  const [myAnswer,     setMyAnswer]     = useState<number | null>(null);
  const [myLastResult, setMyLastResult] = useState<PlayerRoundResult | null>(null);
  const [answeredSet,  setAnsweredSet]  = useState<Set<string>>(new Set());

  // ✅ Solo los jugadores que aceptaron (sin declined)
  const [players,      setPlayers]      = useState<BattlePlayer[]>(acceptedInitial);

  const [duelPair,     setDuelPair]     = useState<string[]>([]);
  const [finalWinner,  setFinalWinner]  = useState<string | null>(null);
  const [autoSeg,      setAutoSeg]      = useState<number | null>(null);
  const [myScore,      setMyScore]      = useState(0);
  const [duelWinnerId, setDuelWinnerId] = useState<string | null>(null);
  const [pendingPlayers, setPendingPlayers] = useState<string[]>([]);

  // refs estables
  const qIndexRef      = useRef(0);
  const timeLeftRef    = useRef(TIEMPO_BASE);
  const activePowerRef = useRef<string | null>(null);
  const phaseRef       = useRef<GamePhase>("waiting_start");
  const isCreatorRef   = useRef(isCreator);
  const categoriasRef  = useRef(categorias);
  const myScoreRef     = useRef(0);
  const duelPairRef    = useRef<string[]>([]);
  const playersRef     = useRef<BattlePlayer[]>(acceptedInitial);

  useEffect(() => { qIndexRef.current      = qIndex;      }, [qIndex]);
  useEffect(() => { timeLeftRef.current    = timeLeft;    }, [timeLeft]);
  useEffect(() => { activePowerRef.current = activePower; }, [activePower]);
  useEffect(() => { phaseRef.current       = phase;       }, [phase]);
  useEffect(() => { myScoreRef.current     = myScore;     }, [myScore]);
  useEffect(() => { duelPairRef.current    = duelPair;    }, [duelPair]);
  useEffect(() => { playersRef.current     = players;     }, [players]);

  // ✅ NUEVO: limpiar el timer de espera al rival
  const clearRivalTimeout = useCallback(() => {
    if (rivalTimeoutRef.current) {
      clearInterval(rivalTimeoutRef.current);
      rivalTimeoutRef.current = null;
    }
    setRivalCountdown(null);
  }, []);

  // ✅ NUEVO: resolver el resultado final usando los scores actuales
  const resolveResult = useCallback((currentPlayers: BattlePlayer[]) => {
    clearRivalTimeout();
    const sorted = [...currentPlayers].sort((a, b) => b.score - a.score);
    const isTie  = sorted.length >= 2 && sorted[0].score === sorted[1].score;
    if (isTie) {
      const pair = [sorted[0].userId, sorted[1].userId];
      duelPairRef.current = pair;
      setDuelPair(pair);
      if (duelRoundRef.current >= 1) {
        setPhase("pact"); phaseRef.current = "pact"; return;
      }
      if (isCreatorRef.current) { setPhase("duel_creator"); phaseRef.current = "duel_creator"; }
      else                      { setPhase("duel_waiting_decision"); phaseRef.current = "duel_waiting_decision"; }
    } else {
      setFinalWinner(sorted[0]?.userId ?? null);
      setPhase("final_result"); phaseRef.current = "final_result";
    }
  }, [clearRivalTimeout]);

  // ✅ NUEVO: arrancar countdown de 30s esperando al rival
  const startRivalTimeout = useCallback(() => {
    if (rivalTimeoutRef.current !== null) return; // ya corriendo
    let remaining = WAITING_RIVAL_TIMEOUT_SEG;
    setRivalCountdown(remaining);

    rivalTimeoutRef.current = setInterval(() => {
      remaining -= 1;
      setRivalCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(rivalTimeoutRef.current!);
        rivalTimeoutRef.current = null;
        setRivalCountdown(null);
        if (phaseRef.current === "waiting_game_over") {
          console.log("[BattleGame] timeout rival → resolviendo con scores actuales");
          resolveResult(playersRef.current);
        }
      }
    }, 1000);
  }, [resolveResult]);

  // Limpiar al desmontar
  useEffect(() => () => clearRivalTimeout(), [clearRivalTimeout]);

  // ─────────────────────────────────────────────────────────
  // SOCKET
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(API, {
      auth:            { token },
      withCredentials: true,
      transports:      ["websocket"],
    });
    socketRef.current = s;

    const onConnect = () => {
      console.log("[BattleGame] conectado:", s.id);
      s.emit("battle:join_game", { roomId });

      if (isCreatorRef.current && !creatorSetupDone.current) {
        creatorSetupDone.current = true;
        const qs = generateQuestions(categoriasRef.current);
        questionsRef.current = qs;
        setQuestions(qs);
        s.emit("battle:set_questions", { roomId, questions: qs });

        setAutoSeg(AUTO_START_SEG);
        if (autoTimerRef.current) clearInterval(autoTimerRef.current);
        autoTimerRef.current = setInterval(() => {
          setAutoSeg(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(autoTimerRef.current!);
              autoTimerRef.current = null;
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };

    if (s.connected) onConnect();
    else s.once("connect", onConnect);

    s.on("battle:game_questions", (data: { questions: Question[] }) => {
      questionsRef.current = data.questions;
      setQuestions(data.questions);
    });

    s.on("battle:rematch_questions", (data: { questions: Question[] }) => {
      questionsRef.current = data.questions;
      setQuestions(data.questions);
    });

    s.on("battle:game_start", () => {
      if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; setAutoSeg(null); }
      setCd(3);
      setPhase("countdown"); phaseRef.current = "countdown";
    });

    s.on("battle:player_answered", (result: PlayerRoundResult) => {
      setAnsweredSet(prev => new Set(prev).add(result.userId));
    });

    // ✅ game_over del server: scores FINALES y REALES
    const onGameOver = (data: { players: BattlePlayer[]; winnerId: string | null }) => {
      const cur = phaseRef.current;
      const duelPhases: GamePhase[] = [
        "final_result","duel_creator","duel_waiting_decision",
        "duel_waiting_response","duel_response","duel_rejected_result","pact",
      ];
      if (duelPhases.includes(cur)) return;

      // ✅ Filtrar declined del resultado también
      const activePlayers = data.players.filter(p => p.status !== "declined");
      console.log("[BattleGame] game_over scores reales:", activePlayers.map(p => `${p.username}:${p.score}`));

      clearRivalTimeout(); // llegó el game_over → cancelar el timeout propio
      setPlayers(activePlayers);
      resolveResult(activePlayers);
    };
    s.on("battle:game_over", onGameOver);

    // ✅ FIX: player_done_ack — alguien terminó
    s.on("battle:player_done_ack", ({ doneCount, totalCount, pendingUsernames, doneUserIds }: {
      doneCount: number; totalCount: number; pendingUsernames: string[]; doneUserIds?: string[];
    }) => {
      if (doneUserIds) doneUserIds.forEach(id => donePlayersRef.current.add(id));
      setPendingPlayers(pendingUsernames);
      console.log(`[BattleGame] ${doneCount}/${totalCount} terminaron. Pendientes: ${pendingUsernames.join(", ")}`);

      // ✅ Si todos los activos terminaron → el server debería emitir game_over pronto
      const activeTotal = activeTotalRef.current;
      const doneSoFar   = donePlayersRef.current.size;
      if (doneSoFar >= activeTotal && phaseRef.current === "waiting_game_over") {
        console.log("[BattleGame] Todos los activos terminaron → resolviendo en 1s");
        setTimeout(() => {
          if (phaseRef.current !== "waiting_game_over") return;
          resolveResult(playersRef.current);
        }, 1000);
      }
    });

    // ✅ NUEVO: si un jugador activo se desconecta/rechaza durante el juego, actualizar activos
    s.on("battle:player_left", ({ userId }: { userId: string }) => {
      // Marcar como eliminated para que no bloquee el game_over
      setPlayers(prev => {
        const updated = prev.map(p => p.userId === userId ? { ...p, eliminated: true } : p);
        playersRef.current = updated;
        // Recalcular cuántos activos quedan
        const stillActive = updated.filter(p => !p.eliminated);
        activeTotalRef.current = stillActive.length;
        // Si yo ya terminé y el que se fue era el único pendiente → resolver
        const doneSoFar = donePlayersRef.current.size;
        if (doneSoFar >= activeTotalRef.current && phaseRef.current === "waiting_game_over") {
          setTimeout(() => {
            if (phaseRef.current !== "waiting_game_over") return;
            resolveResult(updated.filter(p => !p.eliminated));
          }, 800);
        }
        return updated;
      });
    });

    s.on("battle:duel_fight_proposed", ({ roomId: rid }: { roomId: string }) => {
      if (rid !== roomId) return;
      if (!isCreatorRef.current) { setPhase("duel_response"); phaseRef.current = "duel_response"; }
    });

    s.on("battle:duel_pact_proposed", ({ roomId: rid }: { roomId: string }) => {
      if (rid !== roomId) return;
      setPhase("pact"); phaseRef.current = "pact";
    });

    s.on("battle:duel_accepted", ({ roomId: rid }: { roomId: string }) => {
      if (rid !== roomId) return;
      doRematch();
    });

    s.on("battle:duel_rejected", ({ roomId: rid, loserId }: { roomId: string; loserId: string }) => {
      if (rid !== roomId) return;
      const winnerId = duelPairRef.current.find(id => id !== loserId) ?? null;
      setDuelWinnerId(winnerId);
      setPhase("duel_rejected_result"); phaseRef.current = "duel_rejected_result";
    });

    s.on("connect_error", (e) => console.error("[BattleGame] connect_error:", e.message));

    return () => {
      s.off("connect", onConnect);
      s.off("battle:game_questions");
      s.off("battle:rematch_questions");
      s.off("battle:game_start");
      s.off("battle:player_answered");
      s.off("battle:game_over", onGameOver);
      s.off("battle:player_done_ack");
      s.off("battle:player_left");
      s.off("battle:duel_fight_proposed");
      s.off("battle:duel_pact_proposed");
      s.off("battle:duel_accepted");
      s.off("battle:duel_rejected");
      s.off("connect_error");
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      s.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 3) playCountdownAudio();
    if (countdown === 0) {
      setShowGo(true);
      setTimeout(() => {
        stopCountdownAudio();
        setShowGo(false);
        setQIndex(0);         qIndexRef.current   = 0;
        setMyAnswer(null);
        setMyLastResult(null);
        setAnsweredSet(new Set());
        setMyScore(0);        myScoreRef.current  = 0;
        myFinalScoreRef.current = 0;
        setTime(TIEMPO_BASE); timeLeftRef.current = TIEMPO_BASE;
        setPhase("playing");  phaseRef.current    = "playing";
      }, 900);
      return;
    }
    const t = setTimeout(() => setCd(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, playCountdownAudio, stopCountdownAudio]);

  // ── Rematch ──────────────────────────────────────────────
  const doRematch = useCallback(() => {
    const newQs = generateQuestions(categoriasRef.current);
    questionsRef.current = newQs;
    setQuestions(newQs);
    socketRef.current?.emit("battle:set_questions_rematch", { roomId, questions: newQs });

    duelRoundRef.current += 1;
    donePlayersRef.current = new Set();

    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    setQIndex(0);         qIndexRef.current   = 0;
    setMyAnswer(null);
    setMyLastResult(null);
    setAnsweredSet(new Set());
    setMyScore(0);        myScoreRef.current  = 0;
    myFinalScoreRef.current = 0;
    setTime(TIEMPO_BASE); timeLeftRef.current = TIEMPO_BASE;
    setPowers({ A:true, B:true, C:true, D:true });
    setActivePower(null); activePowerRef.current = null;
    setHidden([]);
    setPendingPlayers([]);
    clearRivalTimeout();
    setCd(3);
    setPhase("countdown"); phaseRef.current = "countdown";
  }, [roomId, clearRivalTimeout]);

  // ── Enviar respuesta ─────────────────────────────────────
  const sendAnswer = useCallback((opt: number | null) => {
    if (phaseRef.current !== "playing") return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const q = questionsRef.current[qIndexRef.current];
    if (!q) return;

    const myTime   = TIEMPO_BASE - timeLeftRef.current + 1;
    const correcto = opt !== null && opt === q.correcta;
    const pts      = correcto ? (activePowerRef.current === "D" ? PTS_PIEDAD : PTS_CORRECTA) : 0;
    const newScore = myScoreRef.current + pts;

    setMyAnswer(opt);
    setMyScore(newScore);
    myScoreRef.current = newScore;
    myFinalScoreRef.current = newScore;

    setPlayers(prev => prev.map(p => p.userId === myUserId ? { ...p, score: newScore } : p));
    setMyLastResult({ userId: myUserId, correcto, pts, tiempo: myTime, opcion: opt });

    socketRef.current?.emit("battle:answer", {
      roomId, qIndex: qIndexRef.current, userId: myUserId,
      opcion: opt, tiempo: myTime, correcto, pts,
    });

    setActivePower(null); activePowerRef.current = null;
    setHidden([]);
    setPhase("question_result"); phaseRef.current = "question_result";
  }, [myUserId, roomId]);

  // ── Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime(t => {
        timeLeftRef.current = t - 1;
        if (t <= 1) { clearInterval(timerRef.current!); timerRef.current = null; sendAnswer(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [phase, qIndex, sendAnswer]);

  const handleAnswer = (opt: number) => {
    if (myAnswer !== null || phaseRef.current !== "playing") return;
    sendAnswer(opt);
  };

  // ── Siguiente pregunta ───────────────────────────────────
  const nextQuestion = useCallback(() => {
    const nextIdx = qIndexRef.current + 1;
    if (nextIdx >= MAX_PREGUNTAS) {
      donePlayersRef.current.add(myUserId);
      myScoreAtDone.current = myScoreRef.current;

      socketRef.current?.emit("battle:player_done", {
        roomId, userId: myUserId,
        activeCount: activeTotalRef.current,
      });
      setPendingPlayers([]);
      setPhase("waiting_game_over"); phaseRef.current = "waiting_game_over";

      // ✅ NUEVO: arrancar el countdown de 30s para no esperar al rival eternamente
      startRivalTimeout();

      // Caso edge: yo soy el único activo
      if (donePlayersRef.current.size >= activeTotalRef.current) {
        clearRivalTimeout();
        setTimeout(() => {
          if (phaseRef.current !== "waiting_game_over") return;
          const currentPlayers = [...playersRef.current].map(p =>
            p.userId === myUserId ? { ...p, score: myScoreAtDone.current } : p
          );
          resolveResult(currentPlayers);
        }, 1000);
      }
      return;
    }
    setQIndex(nextIdx);    qIndexRef.current   = nextIdx;
    setMyAnswer(null);
    setMyLastResult(null);
    setAnsweredSet(new Set());
    setTime(TIEMPO_BASE);  timeLeftRef.current = TIEMPO_BASE;
    setPhase("playing");   phaseRef.current    = "playing";
  }, [roomId, myUserId, startRivalTimeout, clearRivalTimeout, resolveResult]);

  // ── Poderes ──────────────────────────────────────────────
  const usePower = useCallback((key: "A"|"B"|"C"|"D") => {
    if (phaseRef.current !== "playing" || myAnswer !== null) return;
    setPowers(prev => { if (!prev[key]) return prev; return { ...prev, [key]: false }; });
    setActivePower(key); activePowerRef.current = key;
    if (key === "A") { setTime(t => { timeLeftRef.current = t + 15; return t + 15; }); }
    else if (key === "B") {
      const q = questionsRef.current[qIndexRef.current];
      if (!q) return;
      const toHide = [0,1,2,3].filter(i => i !== q.correcta).sort(() => Math.random()-0.5).slice(0,2);
      setHidden(toHide);
    } else if (key === "C") { sendAnswer(null); }
  }, [myAnswer, sendAnswer]);

  // ── Creador inicia ───────────────────────────────────────
  const handleCreatorStart = useCallback(() => {
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; setAutoSeg(null); }
    socketRef.current?.emit("battle:creator_start", { roomId, questions: questionsRef.current });
    const fallback = setTimeout(() => {
      if (phaseRef.current === "waiting_start") { setCd(3); setPhase("countdown"); phaseRef.current = "countdown"; }
    }, 2000);
    socketRef.current?.once("battle:game_start", () => clearTimeout(fallback));
  }, [roomId]);

  // ── DUEL: acciones del creador ───────────────────────────
  const handleProposeFight = useCallback(() => {
    socketRef.current?.emit("battle:duel_propose_fight", { roomId });
    setPhase("duel_waiting_response"); phaseRef.current = "duel_waiting_response";
  }, [roomId]);

  const handleProposePact = useCallback(() => {
    socketRef.current?.emit("battle:duel_propose_pact", { roomId });
    const t = setTimeout(() => {
      if (phaseRef.current === "duel_creator") { setPhase("pact"); phaseRef.current = "pact"; }
    }, 1500);
    socketRef.current?.once("battle:duel_pact_proposed", () => clearTimeout(t));
  }, [roomId]);

  // ── DUEL: acciones del invitado ──────────────────────────
  const handleAcceptFight = useCallback(() => {
    socketRef.current?.emit("battle:duel_accept", { roomId });
  }, [roomId]);

  const handleRejectFight = useCallback(() => {
    socketRef.current?.emit("battle:duel_reject", { roomId, loserId: myUserId });
  }, [roomId, myUserId]);

  const handleFinalize = () => onFinish(players);

  const currentQ = questions[qIndex] ?? null;

  // ✅ Solo los jugadores NO eliminados y NO declined para mostrar en pantalla
  const visiblePlayers = players.filter(p => !p.eliminated && p.status !== "declined");

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  if (phase === "waiting_start") return (
    <WaitingStartScreen players={visiblePlayers} isCreator={isCreator} myUserId={myUserId} autoSeg={autoSeg} onStart={handleCreatorStart}/>
  );

  if (phase === "countdown") return (
    <CountdownScreen countdown={countdown} showGo={showGo}/>
  );

  if ((phase === "playing" || phase === "question_result") && currentQ) return (
    <QuestionScreen
      question={currentQ} qIndex={qIndex} total={MAX_PREGUNTAS}
      timeLeft={timeLeft} players={visiblePlayers} myUserId={myUserId}
      myAnswer={myAnswer} myLastResult={myLastResult} answeredSet={answeredSet}
      powers={powers} activePower={activePower} hiddenOpts={hiddenOpts}
      phase={phase} onAnswer={handleAnswer} onPower={usePower} onNext={nextQuestion}
    />
  );

  if (phase === "waiting_game_over") return (
    <WaitingGameOverScreen
      players={visiblePlayers}
      myUserId={myUserId}
      pendingPlayers={pendingPlayers}
      rivalCountdown={rivalCountdown}
    />
  );

  if (phase === "duel_creator") return (
    <DuelCreatorScreen
      players={visiblePlayers.filter(p => duelPair.includes(p.userId))}
      onFight={handleProposeFight}
      onPact={handleProposePact}
    />
  );

  if (phase === "duel_waiting_decision") return (
    <DuelWaitingDecisionScreen
      players={visiblePlayers.filter(p => duelPair.includes(p.userId))}
    />
  );

  if (phase === "duel_waiting_response") return (
    <DuelWaitingResponseScreen
      players={visiblePlayers.filter(p => duelPair.includes(p.userId))}
    />
  );

  if (phase === "duel_response") return (
    <DuelResponseScreen
      players={visiblePlayers.filter(p => duelPair.includes(p.userId))}
      onAccept={handleAcceptFight}
      onReject={handleRejectFight}
    />
  );

  if (phase === "duel_rejected_result") return (
    <DuelRejectedResultScreen
      players={visiblePlayers.filter(p => duelPair.includes(p.userId))}
      winnerId={duelWinnerId}
      myUserId={myUserId}
      onFinalize={handleFinalize}
    />
  );

  if (phase === "pact") return (
    <PactScreen
      players={visiblePlayers.filter(p => duelPair.includes(p.userId))}
      onFinalize={handleFinalize}
    />
  );

  if (phase === "final_result") return (
    <FinalResultScreen players={visiblePlayers} winnerId={finalWinner} myUserId={myUserId} onFinalize={handleFinalize}/>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Spinner size={40}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// WAITING START
// ═══════════════════════════════════════════════════════════
function WaitingStartScreen({ players, isCreator, myUserId, autoSeg, onStart }: {
  players: BattlePlayer[]; isCreator: boolean; myUserId: string; autoSeg: number | null; onStart: () => void;
}) {
  const hasRival = players.some(p => p.userId !== myUserId);
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28, padding:24, fontFamily:"'Arial Black', Impact, sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at 50% 40%, rgba(249,115,22,0.07) 0%, transparent 65%)" }}/>
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#f97316", zIndex:1 }}>NAKAMA BATTLE — SALA LISTA</div>
      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.6rem,5vw,2.4rem)", textAlign:"center", zIndex:1 }}>
        {isCreator ? "¡Todo listo!" : "Esperando al creador..."}
      </h2>
      <div style={{ display:"flex", flexWrap:"wrap", gap:16, justifyContent:"center", maxWidth:480, zIndex:1 }}>
        {players.map(p => (
          <div key={p.userId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"16px 20px", borderRadius:14, background: p.userId === myUserId ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.04)", border:`1.5px solid ${p.userId === myUserId ? "#f97316" : "rgba(255,255,255,0.08)"}` }}>
            <AvatarMed url={p.avatarUrl} name={p.username} size={52}/>
            <div style={{ color: p.userId === myUserId ? "#f97316" : "#fff", fontFamily:"'Segoe UI',sans-serif", fontWeight:700, fontSize:"0.85rem" }}>
              {p.username}{p.userId === myUserId && <span style={{ color:"#f97316", marginLeft:5, fontSize:"0.65rem" }}>TÚ</span>}
            </div>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 8px #22c55e" }}/>
          </div>
        ))}
      </div>
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"14px 20px", maxWidth:360, zIndex:1, fontFamily:"'Segoe UI',sans-serif" }}>
        <div style={{ fontSize:"0.65rem", letterSpacing:"0.2em", color:"#f97316", marginBottom:10 }}>CÓMO FUNCIONA</div>
        <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.5)", lineHeight:1.9 }}>
          • Cada uno responde a su <strong style={{color:"#fff"}}>propio ritmo</strong><br/>
          • Tu tiempo corre <strong style={{color:"#fff"}}>independientemente</strong> del rival<br/>
          • Al terminar todos se comparan los puntajes reales<br/>
          • En empate: el creador decide revancha o pacto<br/>
          • Solo se permite <strong style={{color:"#f97316"}}>1 revancha</strong> — si empatan de nuevo, pacto automático<br/>
          • {MAX_PREGUNTAS} preguntas · {TIEMPO_BASE} segundos cada una
        </div>
      </div>
      {isCreator && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, zIndex:1 }}>
          <button onClick={onStart} style={{ background:"linear-gradient(135deg,#f97316,#e05000)", border:"none", color:"#fff", fontWeight:900, padding:"16px 52px", borderRadius:14, cursor:"pointer", fontSize:"1.05rem", letterSpacing:"0.08em", boxShadow:"0 4px 28px rgba(249,115,22,0.5)", fontFamily:"'Arial Black',sans-serif", animation:"startPulse 1.8s ease infinite" }}>
            🚀 INICIAR BATALLA
          </button>
          {autoSeg !== null && hasRival && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, fontFamily:"'Segoe UI',sans-serif" }}>
              <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)" }}>Auto-inicio en</div>
              <div style={{ fontSize:"2rem", fontWeight:900, color:"#f97316", textShadow:"0 0 16px rgba(249,115,22,0.6)", lineHeight:1 }}>{autoSeg}s</div>
              <div style={{ width:160, height:4, borderRadius:2, background:"rgba(255,255,255,0.08)" }}>
                <div style={{ height:"100%", borderRadius:2, width:`${(autoSeg / AUTO_START_SEG) * 100}%`, background:"linear-gradient(90deg,#f97316,#fbbf24)", transition:"width 1s linear" }}/>
              </div>
            </div>
          )}
        </div>
      )}
      {!isCreator && (
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"#9ca3af", fontSize:"0.88rem", fontFamily:"'Segoe UI',sans-serif", zIndex:1 }}>
          <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:"#f59e0b", animation:"waitPulse 1.4s ease infinite" }}/>
          El creador iniciará la batalla...
        </div>
      )}
      <style>{`
        @keyframes startPulse { 0%,100%{box-shadow:0 4px 28px rgba(249,115,22,0.5)} 50%{box-shadow:0 6px 44px rgba(249,115,22,0.85)} }
        @keyframes waitPulse  { 0%,100%{opacity:1} 50%{opacity:0.25} }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COUNTDOWN
// ═══════════════════════════════════════════════════════════
function CountdownScreen({ countdown, showGo }: { countdown: number; showGo: boolean }) {
  const kofColors: Record<number, string> = { 3:"#ff0000", 2:"#ff8800", 1:"#ffff00" };
  const color = showGo ? "#00ff44" : (kofColors[countdown] ?? "#ffffff");
  const cornerStyle = (pos: string): React.CSSProperties => ({
    position:"absolute",
    top:    pos.includes("top")    ? 20 : undefined,
    bottom: pos.includes("bottom") ? 20 : undefined,
    left:   pos.includes("left")   ? 20 : undefined,
    right:  pos.includes("right")  ? 20 : undefined,
    width:48, height:48,
    borderTopWidth:    pos.includes("top")    ? 3 : 0,
    borderBottomWidth: pos.includes("bottom") ? 3 : 0,
    borderLeftWidth:   pos.includes("left")   ? 3 : 0,
    borderRightWidth:  pos.includes("right")  ? 3 : 0,
    borderStyle:"solid", borderColor:color, opacity:0.6, transition:"all 0.3s",
  });
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, background:"#000", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", backgroundImage:"repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 3px)" }}/>
      {(["top-left","top-right","bottom-left","bottom-right"] as const).map(pos => <div key={pos} style={cornerStyle(pos)}/>)}
      <div style={{ fontFamily:"'Arial Black',Impact,sans-serif", fontSize:"0.75rem", letterSpacing:"0.4em", color:"rgba(255,255,255,0.4)", marginBottom:32, textTransform:"uppercase" }}>NAKAMA BATTLE SYSTEM</div>
      <div key={showGo ? "go" : countdown} style={{ fontFamily:"'Arial Black',Impact,sans-serif", fontSize: showGo ? "clamp(80px,18vw,160px)" : "clamp(100px,22vw,220px)", fontWeight:900, lineHeight:1, color, textShadow:`0 0 20px ${color}, 0 0 60px ${color}88, 4px 4px 0px #000, -4px -4px 0px #000`, letterSpacing: showGo ? "0.12em" : "-0.04em", animation:"kofPop 0.25s cubic-bezier(0.17,0.67,0.83,0.67)", userSelect:"none" }}>
        {showGo ? "GO!" : countdown}
      </div>
      {!showGo && <div style={{ marginTop:20, fontFamily:"'Arial Black',Impact,sans-serif", fontSize:"0.8rem", letterSpacing:"0.3em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase" }}>{countdown === 3 ? "ROUND 1" : countdown === 2 ? "FIGHT!" : "READY?"}</div>}
      <div style={{ position:"absolute", bottom:120, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${color}, transparent)`, opacity:0.5, boxShadow:`0 0 20px ${color}` }}/>
      <style>{`@keyframes kofPop { 0%{transform:scale(1.8);opacity:0} 60%{transform:scale(0.92)} 100%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUESTION SCREEN
// ═══════════════════════════════════════════════════════════
function QuestionScreen({ question, qIndex, total, timeLeft, players, myUserId, myAnswer, myLastResult, answeredSet, powers, activePower, hiddenOpts, phase, onAnswer, onPower, onNext }: {
  question: Question; qIndex: number; total: number; timeLeft: number; players: BattlePlayer[]; myUserId: string; myAnswer: number | null; myLastResult: PlayerRoundResult | null; answeredSet: Set<string>; powers: PowerState; activePower: string | null; hiddenOpts: number[]; phase: GamePhase; onAnswer: (opt: number) => void; onPower: (key: "A"|"B"|"C"|"D") => void; onNext: () => void;
}) {
  const isResult  = phase === "question_result";
  const canAnswer = phase === "playing" && myAnswer === null;
  const maxTime   = activePower === "A" ? 30 : TIEMPO_BASE;
  const pct       = (timeLeft / maxTime) * 100;
  const danger    = timeLeft <= 5 && phase === "playing";

  return (
    <div style={{ minHeight:"100vh", background:"#080810", fontFamily:"'Arial Black', Impact, sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:"0.6rem", letterSpacing:"0.25em", color:"#f97316" }}>NAKAMA BATTLE</div>
        <div style={{ fontSize:"0.72rem", color:"#fff", opacity:0.6, fontFamily:"'Segoe UI',sans-serif" }}>Pregunta {qIndex+1}/{total} · {CATEGORIAS_MAP[question.categoria] ?? question.categoria}</div>
        {phase === "playing"
          ? <div style={{ display:"flex", alignItems:"center", gap:6, color: danger ? "#ef4444" : "#fff", animation: danger ? "dangerPulse 0.5s ease infinite" : "none" }}><span style={{ fontSize:"1.4rem", fontWeight:900 }}>{timeLeft}</span><span style={{ fontSize:"0.6rem", opacity:0.5 }}>SEG</span></div>
          : <div style={{ fontSize:"0.65rem", color:"#f59e0b", fontFamily:"'Segoe UI',sans-serif" }}>{answeredSet.size + 1}/{players.length} respondieron</div>
        }
      </div>
      <div style={{ height:4, background:"rgba(255,255,255,0.06)" }}>
        <div style={{ height:"100%", width: phase === "playing" ? `${pct}%` : (isResult ? "100%" : "0%"), background: danger ? "linear-gradient(90deg,#ef4444,#ff0000)" : isResult ? "linear-gradient(90deg,#22c55e,#16a34a)" : "linear-gradient(90deg,#f97316,#fbbf24)", boxShadow: danger ? "0 0 12px #ef4444" : isResult ? "0 0 12px #22c55e" : "0 0 12px #f97316", transition: phase === "playing" ? "width 1s linear" : "none" }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(players.length, 4)}, 1fr)`, gap:8, padding:"10px 12px" }}>
        {players.map(p => {
          const isMe = p.userId === myUserId;
          const hasAnswered = isMe ? (myAnswer !== null) : answeredSet.has(p.userId);
          return (
            <div key={p.userId} style={{ background: isMe ? "linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.06))" : "rgba(255,255,255,0.03)", border:`1.5px solid ${isMe ? "#f97316" : "rgba(255,255,255,0.07)"}`, borderRadius:10, padding:"10px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ position:"relative" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", overflow:"hidden", border:`2px solid ${isMe ? "#f97316" : "rgba(255,255,255,0.12)"}` }}>
                  {p.avatarUrl ? <img src={p.avatarUrl} alt={p.username} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <div style={{ width:"100%",height:"100%", background:"linear-gradient(135deg,#f97316,#e05000)", display:"flex",alignItems:"center",justifyContent:"center", fontSize:"1.1rem",fontWeight:900,color:"#fff" }}>{p.username[0].toUpperCase()}</div>}
                </div>
                <div style={{ position:"absolute", bottom:-2, right:-2, width:14, height:14, borderRadius:"50%", border:"2px solid #080810", background: isResult && isMe ? (myLastResult?.correcto ? "#22c55e" : "#ef4444") : hasAnswered ? "#22c55e" : "#6b7280", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.5rem" }}>
                  {isResult && isMe ? (myLastResult?.correcto ? "✓" : "✗") : (hasAnswered ? "✓" : "")}
                </div>
              </div>
              <div style={{ fontSize:"0.62rem", fontWeight:700, color: isMe ? "#f97316" : "#fff", opacity: isMe ? 1 : 0.7, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:80, fontFamily:"'Segoe UI',sans-serif" }}>{isMe ? "TÚ" : p.username}</div>
              <div style={{ fontSize:"1rem", fontWeight:900, color:"#00c8ff", letterSpacing:"-0.02em" }}>{p.score.toLocaleString()}<span style={{fontSize:"0.5rem",color:"#6b7280",marginLeft:2}}>pts</span></div>
              {isResult && isMe && myLastResult && (
                <div style={{ fontSize:"0.6rem", color: myLastResult.correcto ? "#22c55e" : "#ef4444", fontFamily:"'Segoe UI',sans-serif", textAlign:"center" }}>
                  {myLastResult.correcto ? `+${myLastResult.pts} pts` : "Sin puntos"}<br/><span style={{color:"rgba(255,255,255,0.3)"}}>en {myLastResult.tiempo}s</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"8px 16px 0" }}>
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
          <p style={{ margin:0, fontSize:"clamp(0.85rem,2.5vw,1rem)", color:"#fff", lineHeight:1.5, fontFamily:"'Segoe UI',sans-serif", fontWeight:700 }}>{question.texto}</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, flex:1 }}>
          {question.opciones.map((opt, i) => {
            const hidden = hiddenOpts.includes(i), selected = myAnswer === i, correct = question.correcta === i;
            const wrong = isResult && selected && !correct, showRight = isResult && correct && myAnswer !== null;
            let bg = "rgba(255,255,255,0.04)", bdColor = "rgba(255,255,255,0.1)", color = "#fff", bdStyle = "solid" as "solid"|"dashed";
            if (hidden && canAnswer)        { bg="rgba(0,0,0,0.3)";        bdColor="rgba(255,255,255,0.08)"; color="#3a3a4a"; bdStyle="dashed"; }
            else if (showRight)             { bg="rgba(34,197,94,0.15)";    bdColor="#22c55e"; color="#22c55e"; }
            else if (wrong)                 { bg="rgba(239,68,68,0.12)";    bdColor="#ef4444"; color="#ef4444"; }
            else if (selected && canAnswer) { bg="rgba(249,115,22,0.12)";   bdColor="#f97316"; color="#f97316"; }
            else if (selected)              { bg="rgba(249,115,22,0.06)";   bdColor="#f9731633"; color="#f9731699"; }
            const LETTERS = ["A","B","C","D"];
            return (
              <button key={i} disabled={hidden || !canAnswer} onClick={() => onAnswer(i)} style={{ background:bg, border:`1.5px ${bdStyle} ${bdColor}`, borderRadius:10, color, padding:"12px 14px", cursor: canAnswer && !hidden ? "pointer" : "default", textAlign:"left", display:"flex", alignItems:"center", gap:10, transition:"all 0.2s", fontFamily:"'Segoe UI',sans-serif", transform: selected ? "scale(1.01)" : "scale(1)", opacity: isResult && !selected && !correct ? 0.45 : 1 }}>
                <span style={{ width:24, height:24, borderRadius:6, flexShrink:0, background:"rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.7rem", fontWeight:900, color:"rgba(255,255,255,0.4)", fontFamily:"'Arial Black',sans-serif" }}>{LETTERS[i]}</span>
                <span style={{fontSize:"0.82rem", fontWeight:600, lineHeight:1.3}}>{hidden && canAnswer ? "••••" : opt}</span>
                {showRight && <span style={{marginLeft:"auto", fontSize:"0.8rem"}}>✓</span>}
                {wrong     && <span style={{marginLeft:"auto", fontSize:"0.8rem"}}>✗</span>}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:6, padding:"10px 0 6px", justifyContent:"center" }}>
          {PODERES_INFO.map(p => {
            const avail = powers[p.key] && canAnswer, used = !powers[p.key];
            return (
              <button key={p.key} onClick={() => onPower(p.key)} disabled={!avail} title={`${p.nombre}: ${p.desc}`} style={{ width:48, height:48, borderRadius:10, background: used ? "rgba(255,255,255,0.02)" : `rgba(${hexToRgb(p.color)},0.12)`, border:`1.5px solid ${used ? "rgba(255,255,255,0.05)" : (avail ? p.color : "rgba(255,255,255,0.05)")}`, cursor: avail ? "pointer" : "not-allowed", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, opacity: used ? 0.25 : (canAnswer ? 1 : 0.5), transition:"all 0.2s" }}>
                <span style={{fontSize:"1.1rem"}}>{used ? "✗" : p.icon}</span>
                <span style={{ fontSize:"0.42rem", color: used ? "rgba(255,255,255,0.2)" : p.color, fontFamily:"'Segoe UI',sans-serif", fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase" }}>{p.key}</span>
              </button>
            );
          })}
        </div>
      </div>
      {isResult && (
        <div style={{ padding:"10px 16px 20px", display:"flex", justifyContent:"center" }}>
          <button onClick={onNext} style={{ background:"linear-gradient(135deg,#f97316,#e05000)", border:"none", color:"#fff", fontWeight:900, padding:"12px 40px", borderRadius:12, cursor:"pointer", fontSize:"0.9rem", letterSpacing:"0.06em", boxShadow:"0 4px 20px rgba(249,115,22,0.4)", fontFamily:"'Arial Black',sans-serif", animation:"readyPulse 1s ease infinite" }}>
            {qIndex + 1 >= MAX_PREGUNTAS ? "¡TERMINAR!" : "SIGUIENTE ▶"}
          </button>
        </div>
      )}
      <style>{`
        @keyframes dangerPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes readyPulse  { 0%,100%{box-shadow:0 4px 20px rgba(249,115,22,0.4)} 50%{box-shadow:0 4px 40px rgba(249,115,22,0.7)} }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ✅ WAITING GAME OVER — con countdown de 30s al rival
// ═══════════════════════════════════════════════════════════
function WaitingGameOverScreen({ players, myUserId, pendingPlayers, rivalCountdown }: {
  players: BattlePlayer[];
  myUserId: string;
  pendingPlayers: string[];
  rivalCountdown: number | null;   // ✅ NUEVO: countdown de 30s
}) {
  const me = players.find(p => p.userId === myUserId);

  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, padding:24, fontFamily:"'Arial Black', Impact, sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at 50% 40%, rgba(0,200,255,0.05) 0%, transparent 65%)" }}/>

      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#00c8ff", zIndex:1 }}>NAKAMA BATTLE — RONDA COMPLETADA</div>

      <div style={{ zIndex:1 }}>
        <div style={{ fontSize:"3.5rem", animation:"iconBounce 1.6s ease infinite" }}>⏳</div>
      </div>

      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.4rem,4vw,2rem)", textAlign:"center", zIndex:1 }}>
        ¡Terminaste! Esperando al rival...
      </h2>

      {/* ✅ NUEVO: countdown visual de 30s */}
      {rivalCountdown !== null && (
        <div style={{ zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.3)", fontFamily:"'Segoe UI',sans-serif" }}>
            {rivalCountdown > 0 ? "Resultado automático en" : "Calculando resultado..."}
          </div>
          <div style={{
            fontSize:"2.2rem", fontWeight:900, lineHeight:1,
            color: rivalCountdown <= 10 ? "#ef4444" : "#f59e0b",
            textShadow:`0 0 20px ${rivalCountdown <= 10 ? "rgba(239,68,68,0.6)" : "rgba(245,158,11,0.6)"}`,
          }}>
            {rivalCountdown}s
          </div>
          <div style={{ width:200, height:5, borderRadius:3, background:"rgba(255,255,255,0.07)" }}>
            <div style={{
              height:"100%", borderRadius:3,
              width:`${(rivalCountdown / WAITING_RIVAL_TIMEOUT_SEG) * 100}%`,
              background: rivalCountdown <= 10
                ? "linear-gradient(90deg,#ef4444,#dc2626)"
                : "linear-gradient(90deg,#f59e0b,#fbbf24)",
              transition:"width 1s linear",
              boxShadow: rivalCountdown <= 10 ? "0 0 8px rgba(239,68,68,0.5)" : "0 0 8px rgba(245,158,11,0.4)",
            }}/>
          </div>
          <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.2)", fontFamily:"'Segoe UI',sans-serif" }}>
            Si el rival no termina, se cuenta con los puntos que lleva
          </div>
        </div>
      )}

      {/* Score propio */}
      {me && (
        <div style={{ zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"20px 32px", borderRadius:16, background:"rgba(0,200,255,0.06)", border:"1.5px solid rgba(0,200,255,0.2)" }}>
          <AvatarMed url={me.avatarUrl} name={me.username} size={56}/>
          <div style={{ color:"#fff", fontFamily:"'Segoe UI',sans-serif", fontWeight:700 }}>{me.username}</div>
          <div style={{ fontSize:"2.2rem", fontWeight:900, color:"#00c8ff", letterSpacing:"-0.02em" }}>
            {me.score.toLocaleString()}
            <span style={{ fontSize:"0.7rem", color:"#6b7280", marginLeft:6 }}>pts</span>
          </div>
          <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)", fontFamily:"'Segoe UI',sans-serif" }}>Tu puntaje final</div>
        </div>
      )}

      {/* Estado del rival */}
      {players.filter(p => p.userId !== myUserId).map(rival => {
        const isPending = pendingPlayers.length === 0 || pendingPlayers.includes(rival.username);
        return (
          <div key={rival.userId} style={{ zIndex:1, display:"flex", alignItems:"center", gap:12, padding:"14px 20px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", fontFamily:"'Segoe UI',sans-serif", width:"100%", maxWidth:360 }}>
            <AvatarMed url={rival.avatarUrl} name={rival.username} size={36}/>
            <div style={{ flex:1 }}>
              <div style={{ color:"#fff", fontWeight:700, fontSize:"0.85rem" }}>{rival.username}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                {isPending ? (
                  <>
                    <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"#f59e0b", animation:"waitPulse 1.4s ease infinite" }}/>
                    <span style={{ fontSize:"0.72rem", color:"#f59e0b" }}>Respondiendo...</span>
                  </>
                ) : (
                  <>
                    <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"#22c55e" }}/>
                    <span style={{ fontSize:"0.72rem", color:"#22c55e" }}>¡Terminó!</span>
                  </>
                )}
              </div>
            </div>
            <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.15)", fontFamily:"'Segoe UI',sans-serif", fontStyle:"italic" }}>
              {isPending ? "???" : "✓"}
            </div>
          </div>
        );
      })}

      <div style={{ zIndex:1, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 16px", maxWidth:320, fontFamily:"'Segoe UI',sans-serif", textAlign:"center" }}>
        <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.25)", lineHeight:1.7 }}>
          Los resultados se mostrarán cuando todos hayan terminado<br/>
          o cuando se agote el tiempo de espera.<br/>
          <strong style={{color:"rgba(255,255,255,0.4)"}}>Los scores se comparan al final, no antes.</strong>
        </div>
      </div>

      <style>{`
        @keyframes waitPulse   { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes iconBounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DUEL CREATOR
// ═══════════════════════════════════════════════════════════
function DuelCreatorScreen({ players, onFight, onPact }: {
  players: BattlePlayer[]; onFight: () => void; onPact: () => void;
}) {
  const [p1, p2] = players;
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, gap:24, fontFamily:"'Arial Black',Impact,sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 70%)" }}/>
      <div style={{ zIndex:1, background:"rgba(249,115,22,0.15)", border:"1px solid rgba(249,115,22,0.4)", borderRadius:20, padding:"4px 14px", fontSize:"0.62rem", letterSpacing:"0.2em", color:"#f97316", fontFamily:"'Segoe UI',sans-serif" }}>
        👑 TÚ DECIDÍS — ERES EL CREADOR
      </div>
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#fff", opacity:0.4, zIndex:1 }}>¡EMPATE ÉPICO!</div>
      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.6rem,5vw,2.4rem)", textAlign:"center", zIndex:1 }}>MISMO PUNTAJE</h2>
      <div style={{ display:"flex", alignItems:"center", gap:24, zIndex:1 }}>
        {p1 && <PlayerMini player={p1}/>}
        <div style={{ fontSize:"clamp(1.8rem,6vw,3rem)", fontWeight:900, color:"#f97316", textShadow:"0 0 20px #f97316" }}>VS</div>
        {p2 && <PlayerMini player={p2}/>}
      </div>
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"14px 20px", maxWidth:340, zIndex:1, fontFamily:"'Segoe UI',sans-serif", textAlign:"center" }}>
        <div style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.5)", lineHeight:1.8 }}>
          Podés proponer una <strong style={{color:"#ef4444"}}>revancha</strong> con <strong style={{color:"#ef4444"}}>preguntas nuevas</strong><br/>
          (el rival debe aceptar o <strong style={{color:"#ef4444"}}>pierde automáticamente</strong>),<br/>
          o un <strong style={{color:"#f59e0b"}}>pacto de caballeros</strong>: ambos ganan <strong style={{color:"#f59e0b"}}>{PRIZE_PACT.toLocaleString()} pts</strong>.<br/>
          <span style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)", marginTop:6, display:"block" }}>
            Si vuelven a empatar en la revancha → pacto automático.
          </span>
        </div>
      </div>
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", zIndex:1 }}>
        <button onClick={onFight} style={{ background:"linear-gradient(135deg,#ef4444,#b91c1c)", border:"none", color:"#fff", fontWeight:900, padding:"16px 36px", borderRadius:14, cursor:"pointer", fontSize:"1rem", letterSpacing:"0.06em", boxShadow:"0 4px 24px rgba(239,68,68,0.5)", fontFamily:"'Arial Black',sans-serif", animation:"fightPulse 1.8s ease infinite" }}>
          ⚔️ PROPONER REVANCHA
        </button>
        <button onClick={onPact} style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", color:"#000", fontWeight:900, padding:"16px 36px", borderRadius:14, cursor:"pointer", fontSize:"1rem", letterSpacing:"0.06em", boxShadow:"0 4px 24px rgba(245,158,11,0.4)", fontFamily:"'Arial Black',sans-serif" }}>
          🤝 PACTO DE CABALLEROS
        </button>
      </div>
      <style>{`@keyframes fightPulse { 0%,100%{box-shadow:0 4px 24px rgba(239,68,68,0.5)} 50%{box-shadow:0 4px 48px rgba(239,68,68,0.9)} }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DUEL WAITING DECISION
// ═══════════════════════════════════════════════════════════
function DuelWaitingDecisionScreen({ players }: { players: BattlePlayer[] }) {
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, padding:24, fontFamily:"'Arial Black',Impact,sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 70%)" }}/>
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#f97316", opacity:0.7, zIndex:1 }}>¡EMPATE ÉPICO!</div>
      <div style={{ fontSize:"3rem", zIndex:1 }}>⚔️</div>
      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.4rem,4vw,2rem)", textAlign:"center", zIndex:1 }}>Esperando la decisión del creador...</h2>
      <div style={{ display:"flex", alignItems:"center", gap:10, zIndex:1, fontFamily:"'Segoe UI',sans-serif" }}>
        <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:"#f97316", animation:"waitPulse 1.4s ease infinite" }}/>
        <span style={{ fontSize:"0.85rem", color:"#9ca3af" }}>El creador elige: revancha con preguntas nuevas o pacto</span>
      </div>
      <div style={{ display:"flex", gap:16, zIndex:1 }}>
        {players.map(p => (
          <div key={p.userId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"14px 18px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", fontFamily:"'Segoe UI',sans-serif" }}>
            <AvatarMed url={p.avatarUrl} name={p.username} size={44}/>
            <div style={{ color:"#fff", fontWeight:700, fontSize:"0.82rem" }}>{p.username}</div>
            <div style={{ color:"#00c8ff", fontWeight:900, fontSize:"1rem" }}>{p.score.toLocaleString()} pts</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes waitPulse { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DUEL WAITING RESPONSE
// ═══════════════════════════════════════════════════════════
function DuelWaitingResponseScreen({ players }: { players: BattlePlayer[] }) {
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, padding:24, fontFamily:"'Arial Black',Impact,sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 70%)" }}/>
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#ef4444", opacity:0.8, zIndex:1 }}>REVANCHA PROPUESTA</div>
      <div style={{ fontSize:"3rem", zIndex:1 }}>⏳</div>
      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.4rem,4vw,2rem)", textAlign:"center", zIndex:1 }}>Esperando respuesta del rival...</h2>
      <div style={{ display:"flex", alignItems:"center", gap:10, zIndex:1, fontFamily:"'Segoe UI',sans-serif" }}>
        <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:"#ef4444", animation:"waitPulse 1.4s ease infinite" }}/>
        <span style={{ fontSize:"0.85rem", color:"#9ca3af" }}>El rival debe aceptar o rechazar la revancha</span>
      </div>
      <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, padding:"12px 20px", maxWidth:300, zIndex:1, fontFamily:"'Segoe UI',sans-serif", textAlign:"center" }}>
        <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.4)", lineHeight:1.7 }}>
          Si el rival rechaza, <strong style={{color:"#ef4444"}}>pierde automáticamente</strong> y vos ganás.
        </div>
      </div>
      <div style={{ display:"flex", gap:16, zIndex:1 }}>
        {players.map(p => (
          <div key={p.userId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"14px 18px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", fontFamily:"'Segoe UI',sans-serif" }}>
            <AvatarMed url={p.avatarUrl} name={p.username} size={44}/>
            <div style={{ color:"#fff", fontWeight:700, fontSize:"0.82rem" }}>{p.username}</div>
            <div style={{ color:"#00c8ff", fontWeight:900, fontSize:"1rem" }}>{p.score.toLocaleString()} pts</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes waitPulse { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DUEL RESPONSE
// ═══════════════════════════════════════════════════════════
function DuelResponseScreen({ players, onAccept, onReject }: {
  players: BattlePlayer[]; onAccept: () => void; onReject: () => void;
}) {
  const [p1, p2] = players;
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, gap:24, fontFamily:"'Arial Black',Impact,sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at center, rgba(239,68,68,0.08) 0%, transparent 65%)" }}/>
      <div style={{ zIndex:1, background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:20, padding:"4px 14px", fontSize:"0.62rem", letterSpacing:"0.2em", color:"#ef4444", fontFamily:"'Segoe UI',sans-serif" }}>
        ¡EL CREADOR TE DESAFÍA!
      </div>
      <div style={{ fontSize:"3rem", zIndex:1 }}>⚔️</div>
      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.4rem,4vw,2rem)", textAlign:"center", zIndex:1 }}>Revancha propuesta</h2>
      <div style={{ display:"flex", alignItems:"center", gap:24, zIndex:1 }}>
        {p1 && <PlayerMini player={p1}/>}
        <div style={{ fontSize:"clamp(1.6rem,5vw,2.5rem)", fontWeight:900, color:"#ef4444", textShadow:"0 0 20px #ef4444" }}>VS</div>
        {p2 && <PlayerMini player={p2}/>}
      </div>
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"14px 20px", maxWidth:320, zIndex:1, fontFamily:"'Segoe UI',sans-serif", textAlign:"center" }}>
        <div style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.5)", lineHeight:1.8 }}>
          ¿Aceptás la revancha con <strong style={{color:"#fff"}}>preguntas completamente nuevas</strong>?<br/>
          Si rechazás, <strong style={{color:"#ef4444"}}>perdés automáticamente</strong>.<br/>
          <span style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)", display:"block", marginTop:4 }}>
            Solo hay 1 oportunidad de revancha.
          </span>
        </div>
      </div>
      <div style={{ display:"flex", gap:14, zIndex:1 }}>
        <button onClick={onReject} style={{ background:"rgba(239,68,68,0.08)", border:"1.5px solid rgba(239,68,68,0.3)", color:"#ef4444", fontWeight:900, padding:"14px 28px", borderRadius:12, cursor:"pointer", fontSize:"0.9rem", letterSpacing:"0.04em", fontFamily:"'Arial Black',sans-serif" }}>
          ✗ RECHAZAR (y perder)
        </button>
        <button onClick={onAccept} style={{ background:"linear-gradient(135deg,#ef4444,#b91c1c)", border:"none", color:"#fff", fontWeight:900, padding:"14px 32px", borderRadius:12, cursor:"pointer", fontSize:"0.9rem", letterSpacing:"0.06em", boxShadow:"0 4px 24px rgba(239,68,68,0.5)", fontFamily:"'Arial Black',sans-serif", animation:"fightPulse 1.5s ease infinite" }}>
          ⚔️ ¡ACEPTAR REVANCHA!
        </button>
      </div>
      <style>{`@keyframes fightPulse { 0%,100%{box-shadow:0 4px 24px rgba(239,68,68,0.5)} 50%{box-shadow:0 4px 48px rgba(239,68,68,0.9)} }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DUEL REJECTED RESULT
// ═══════════════════════════════════════════════════════════
function DuelRejectedResultScreen({ players, winnerId, myUserId, onFinalize }: {
  players: BattlePlayer[]; winnerId: string | null; myUserId: string; onFinalize: () => void;
}) {
  const amWinner = winnerId === myUserId;
  const winner   = players.find(p => p.userId === winnerId);
  const loser    = players.find(p => p.userId !== winnerId);
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, padding:24, fontFamily:"'Arial Black',Impact,sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(ellipse at 50% 30%, ${amWinner ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)"} 0%, transparent 65%)` }}/>
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color: amWinner ? "#22c55e" : "#ef4444", zIndex:1 }}>REVANCHA RECHAZADA</div>
      <div style={{ fontSize:"4rem", zIndex:1 }}>{amWinner ? "🏆" : "💀"}</div>
      <h2 style={{ color: amWinner ? "#22c55e" : "#ef4444", margin:0, fontSize:"clamp(1.6rem,5vw,2.4rem)", textAlign:"center", zIndex:1, textShadow:`0 0 30px ${amWinner ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}` }}>
        {amWinner ? "¡GANASTE!" : "PERDISTE"}
      </h2>
      <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"0.85rem", fontFamily:"'Segoe UI',sans-serif", textAlign:"center", maxWidth:290, lineHeight:1.7, zIndex:1, margin:0 }}>
        {loser?.username} rechazó la revancha y pierde automáticamente.
        {amWinner && ` ¡${PRIZE_WIN.toLocaleString()} pts para vos!`}
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:360, zIndex:1 }}>
        {[winner, loser].filter(Boolean).map((p, i) => p && (
          <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:12, background: i === 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)", border:`1px solid ${i === 0 ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.15)"}` }}>
            <span style={{ fontSize:"1.4rem" }}>{i === 0 ? "🏆" : "💀"}</span>
            <AvatarMed url={p.avatarUrl} name={p.username} size={40} style={{ filter: i === 1 ? "grayscale(80%) brightness(0.5)" : "none" }}/>
            <div style={{ flex:1 }}>
              <div style={{ color: i === 0 ? "#22c55e" : "#6b7280", fontFamily:"'Segoe UI',sans-serif", fontWeight:700, fontSize:"0.85rem" }}>
                {p.username}{p.userId === myUserId && " (tú)"}
              </div>
              <div style={{ fontSize:"0.65rem", color: i === 0 ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.2)", fontFamily:"'Segoe UI',sans-serif" }}>
                {i === 0 ? `Gana ${PRIZE_WIN.toLocaleString()} pts` : "Rechazó la revancha"}
              </div>
            </div>
            <div style={{ fontSize:"1rem", fontWeight:900, color: i === 0 ? "#22c55e" : "#4b5563" }}>{p.score.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <button onClick={onFinalize} style={{ background:"linear-gradient(135deg,#f97316,#e05000)", border:"none", color:"#fff", fontWeight:900, padding:"14px 48px", borderRadius:12, cursor:"pointer", fontSize:"0.95rem", letterSpacing:"0.08em", boxShadow:"0 4px 24px rgba(249,115,22,0.4)", zIndex:1, fontFamily:"'Arial Black',sans-serif" }}>
        FINALIZAR BATALLA
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PACT
// ═══════════════════════════════════════════════════════════
function PactScreen({ players, onFinalize }: { players: BattlePlayer[]; onFinalize: () => void }) {
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, gap:24, fontFamily:"'Arial Black',Impact,sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at center, rgba(245,158,11,0.08) 0%, transparent 65%)" }}/>
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#f59e0b", opacity:0.8, zIndex:1 }}>ACUERDO SELLADO</div>
      <span style={{ fontSize:"4rem", zIndex:1 }}>🤝</span>
      <h2 style={{ color:"#fff", margin:0, fontSize:"clamp(1.6rem,5vw,2.2rem)", textAlign:"center", zIndex:1 }}>PACTO DE CABALLEROS</h2>
      <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"0.85rem", fontFamily:"'Segoe UI',sans-serif", textAlign:"center", maxWidth:290, lineHeight:1.7, zIndex:1, margin:0 }}>
        Ambos guerreros se respetan. El empate es honorable y cada uno se lleva <strong style={{color:"#f59e0b"}}>{PRIZE_PACT.toLocaleString()} pts</strong>.
      </p>
      <div style={{ display:"flex", gap:20, alignItems:"center", zIndex:1 }}>
        {players.map(p => (
          <div key={p.userId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"20px 24px", borderRadius:14, background:"rgba(245,158,11,0.07)", border:"1.5px solid rgba(245,158,11,0.3)" }}>
            <AvatarMed url={p.avatarUrl} name={p.username} size={52}/>
            <div style={{ color:"#fff", fontFamily:"'Segoe UI',sans-serif", fontWeight:700 }}>{p.username}</div>
            <div style={{ color:"#f59e0b", fontSize:"1.8rem", fontWeight:900 }}>{PRIZE_PACT.toLocaleString()}<span style={{ fontSize:"0.6rem", color:"#6b7280", marginLeft:4 }}>pts</span></div>
            <div style={{ fontSize:"0.65rem", color:"rgba(245,158,11,0.6)", fontFamily:"'Segoe UI',sans-serif", letterSpacing:"0.1em" }}>¡EMPATE HONORABLE!</div>
          </div>
        ))}
      </div>
      <button onClick={onFinalize} style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", color:"#000", fontWeight:900, padding:"14px 48px", borderRadius:12, cursor:"pointer", fontSize:"0.95rem", letterSpacing:"0.06em", boxShadow:"0 4px 20px rgba(245,158,11,0.4)", zIndex:1, fontFamily:"'Arial Black',sans-serif" }}>
        CONFIRMAR Y FINALIZAR
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FINAL RESULT
// ═══════════════════════════════════════════════════════════
function FinalResultScreen({ players, winnerId, myUserId, onFinalize }: { players: BattlePlayer[]; winnerId: string | null; myUserId: string; onFinalize: () => void }) {
  const sorted   = [...players].sort((a,b) => b.score - a.score);
  const winner   = players.find(p => p.userId === winnerId);
  const perfect  = winner && winner.score >= PTS_CORRECTA * MAX_PREGUNTAS;
  const prize    = perfect ? PRIZE_PERFECT : PRIZE_WIN;
  const amWinner = winnerId === myUserId;
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 16px 32px", gap:20, fontFamily:"'Arial Black',Impact,sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.12) 0%, transparent 65%)" }}/>
      {[...Array(20)].map((_,i) => (
        <div key={i} style={{ position:"absolute", left:`${Math.random()*100}%`, top:`${Math.random()*60}%`, width:Math.random()*6+2, height:Math.random()*6+2, borderRadius:"50%", background:["#f97316","#fbbf24","#22c55e","#00c8ff","#a855f7"][i%5], opacity:0.6, animation:`confettiFall ${1.5+Math.random()*2}s ease ${Math.random()*2}s infinite` }}/>
      ))}
      <div style={{ fontSize:"0.65rem", letterSpacing:"0.4em", color:"#f97316", zIndex:1 }}>FIN DE LA BATALLA</div>
      {winner && (
        <>
          <div style={{ fontSize:"clamp(2rem,8vw,4rem)" }}>{amWinner ? "🏆" : "👑"}</div>
          <h2 style={{ color: amWinner ? "#fbbf24" : "#fff", margin:0, fontSize:"clamp(1.4rem,5vw,2.2rem)", textAlign:"center", zIndex:1, textShadow: amWinner ? "0 0 30px rgba(251,191,36,0.6)" : "none" }}>
            {amWinner ? "¡GANASTE!" : `${winner.username} ganó`}
          </h2>
          <div style={{ fontSize:"2rem", fontWeight:900, color:"#fbbf24", zIndex:1, textShadow:"0 0 20px rgba(251,191,36,0.5)" }}>
            {prize.toLocaleString()} pts{perfect && <span style={{ fontSize:"0.8rem", color:"#a855f7", marginLeft:8 }}>¡PERFECTO!</span>}
          </div>
        </>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%", maxWidth:400, zIndex:1 }}>
        {sorted.map((p, i) => {
          const isWin = p.userId === winnerId;
          return (
            <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:12, position:"relative", overflow:"hidden", border:`${isWin ? 1.5 : 1}px solid ${isWin ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.06)"}` }}>
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", background: isWin ? "linear-gradient(135deg,rgba(251,191,36,0.1),rgba(249,115,22,0.06))" : "rgba(0,0,0,0.5)" }}/>
              <span style={{ fontSize:"1.4rem", zIndex:1 }}>{isWin ? "🏆" : i===1 ? "🥈" : i===2 ? "🥉" : "💀"}</span>
              <AvatarMed url={p.avatarUrl} name={p.username} size={36} style={{ zIndex:1, filter: isWin ? "none" : "grayscale(80%) brightness(0.4)" }}/>
              <div style={{ flex:1, zIndex:1 }}>
                <div style={{ color: isWin ? "#fbbf24" : "#6b7280", fontFamily:"'Segoe UI',sans-serif", fontWeight:700, fontSize:"0.85rem" }}>{p.username}{p.userId === myUserId && " (tú)"}</div>
                <div style={{ fontSize:"0.65rem", color: isWin ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.15)", fontFamily:"'Segoe UI',sans-serif" }}>{isWin ? `Gana ${prize.toLocaleString()} pts` : `Obtuvo ${p.score.toLocaleString()} pts`}</div>
              </div>
              <div style={{ fontSize:"1rem", fontWeight:900, zIndex:1, color: isWin ? "#fbbf24" : "#4b5563" }}>{p.score.toLocaleString()}</div>
            </div>
          );
        })}
      </div>
      <button onClick={onFinalize} style={{ background:"linear-gradient(135deg,#f97316,#e05000)", border:"none", color:"#fff", fontWeight:900, padding:"14px 48px", borderRadius:12, cursor:"pointer", fontSize:"0.95rem", letterSpacing:"0.08em", boxShadow:"0 4px 24px rgba(249,115,22,0.4)", zIndex:1, marginTop:8, fontFamily:"'Arial Black',sans-serif" }}>
        FINALIZAR BATALLA
      </button>
      <style>{`@keyframes confettiFall { 0%{transform:translateY(-10px) rotate(0deg);opacity:0.6} 100%{transform:translateY(60px) rotate(180deg);opacity:0} }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function Spinner({ size=32 }: { size?: number }) {
  return (
    <>
      <div style={{ width:size, height:size, borderRadius:"50%", border:`${Math.max(2,Math.floor(size/12))}px solid rgba(249,115,22,0.3)`, borderTopColor:"#f97316", animation:"spinA 0.75s linear infinite", flexShrink:0 }}/>
      <style>{`@keyframes spinA { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function AvatarMed({ url, name, size=44, style:extraStyle }: { url?: string|null; name:string; size?:number; style?: React.CSSProperties }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", overflow:"hidden", flexShrink:0, border:"2px solid rgba(255,255,255,0.12)", ...extraStyle }}>
      {url
        ? <img src={url} alt={name} style={{width:"100%", height:"100%", objectFit:"cover"}}/>
        : <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#f97316,#e05000)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, fontWeight:900, color:"#fff" }}>{name[0].toUpperCase()}</div>
      }
    </div>
  );
}

function PlayerMini({ player }: { player: BattlePlayer }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <AvatarMed url={player.avatarUrl} name={player.username} size={52}/>
      <div style={{ color:"#fff", fontSize:"0.75rem", fontFamily:"'Segoe UI',sans-serif", fontWeight:700 }}>{player.username}</div>
      <div style={{ color:"#00c8ff", fontSize:"0.9rem", fontWeight:900 }}>{player.score.toLocaleString()}</div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}