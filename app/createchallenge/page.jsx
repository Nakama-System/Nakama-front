"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/authContext";
import {
  Swords, BookOpen, Users, Rocket,
  ChevronRight, ChevronLeft, Check,
  Star, Clock, Scissors, RefreshCw, Heart, Zap,
  Bot, Film, Music, User
} from "lucide-react";
import "../styles/createchallenge.css";

// ─────────────────────────────────────────────────────────────
// DATOS Y CONSTANTES
// ─────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { id: "shonen",     icon: Swords,   nombre: "Shonen" },
  { id: "seinen",     icon: BookOpen, nombre: "Seinen" },
  { id: "isekai",     icon: Rocket,   nombre: "Isekai" },
  { id: "romance",    icon: Heart,    nombre: "Romance" },
  { id: "mecha",      icon: Bot,      nombre: "Mecha" },
  { id: "clasico",    icon: Clock,    nombre: "Anime Clásico" },
  { id: "actual",     icon: Star,     nombre: "Anime Actual" },
  { id: "peliculas",  icon: Film,     nombre: "Películas Anime" },
  { id: "personajes", icon: User,     nombre: "Personajes" },
  { id: "opening",    icon: Music,    nombre: "Opening y Ending" },
];
const MAX_JUGADORES = 3;

const STEPS = [
  { label: "Desafío",       icon: Swords   },
  { label: "Categorías",    icon: BookOpen },
  { label: "Participantes", icon: Users    },
  { label: "Confirmar",     icon: Rocket   },
];

// Colores de fondo para el fallback de inicial
const INITIAL_COLORS = [
  ["#f97316","#e05000"], // naranja
  ["#3b82f6","#1d4ed8"], // azul
  ["#8b5cf6","#6d28d9"], // violeta
  ["#22c55e","#15803d"], // verde
  ["#ec4899","#be185d"], // rosa
  ["#f59e0b","#d97706"], // amarillo
  ["#06b6d4","#0e7490"], // cian
  ["#ef4444","#b91c1c"], // rojo
];

function colorForName(name = "") {
  const idx = name.charCodeAt(0) % INITIAL_COLORS.length;
  return INITIAL_COLORS[idx];
}

// ─────────────────────────────────────────────────────────────
// AVATAR — real (img/video) o inicial del nombre
// ─────────────────────────────────────────────────────────────
function UserAvatar({ user, size = "md", variant = "blue", style: extraStyle }) {
  if (!user) return null;
  const [imgError, setImgError] = useState(false);

  const sizeMap = { sm: 32, md: 44, lg: 56, xl: 72 };
  const px      = sizeMap[size] ?? 44;
  const initial = (user.nombre || user.username || "?")[0].toUpperCase();
  const [c1, c2] = colorForName(user.nombre || user.username || "");

  const isVideo = user?.avatar?.endsWith?.(".mp4") || user?.avatar?.endsWith?.(".webm");
  const hasMedia = !imgError && user?.avatar && !user.avatar.includes("dicebear");

  const baseStyle = {
    width: px, height: px, borderRadius: "50%",
    flexShrink: 0, overflow: "hidden",
    border: `2px solid ${variant === "orange" ? "rgba(249,115,22,0.5)" : "rgba(59,130,246,0.4)"}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    ...extraStyle,
  };

  if (hasMedia) {
    if (isVideo) {
      return (
        <div className={`nk-avatar nk-avatar--${size} nk-avatar--${variant}`} style={extraStyle}>
          <video src={user.avatar} autoPlay loop muted playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgError(true)}
          />
        </div>
      );
    }
    return (
      <div className={`nk-avatar nk-avatar--${size} nk-avatar--${variant}`} style={extraStyle}>
        <img
          src={user.avatar}
          alt={user.nombre || user.username || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: inicial con gradiente de color según el nombre
  return (
    <div style={{
      ...baseStyle,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      fontSize: px * 0.38,
      fontWeight: 900,
      color: "#fff",
      fontFamily: "'Arial Black', sans-serif",
      userSelect: "none",
    }}>
      {initial}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
export function getMedalla(victorias) {
  if (victorias >= 1000) return { icon: "🏆", label: "Trofeo Legendario" };
  if (victorias >= 800)  return { icon: "🏆", label: "Trofeo VI" };
  if (victorias >= 500)  return { icon: "🏆", label: "Trofeo V" };
  if (victorias >= 300)  return { icon: "🏆", label: "Trofeo III" };
  if (victorias >= 200)  return { icon: "🏆", label: "Trofeo II" };
  if (victorias >= 150)  return { icon: "🏆", label: "Trofeo I" };
  if (victorias >= 100)  return { icon: "🥇", label: "Medalla de Oro" };
  if (victorias >= 50)   return { icon: "🥈", label: "Medalla de Plata" };
  if (victorias >= 10)   return { icon: "🥉", label: "Medalla de Bronce" };
  return                        { icon: "⚡", label: "Novato" };
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────
function PlayerRow({ user, selected, isCreator, onToggle }) {
  if (!user) return null;
  const medalla = getMedalla(user.victorias || 0);
  const total   = (user.victorias || 0) + (user.derrotas || 0);
  const pctWin  = total > 0 ? Math.round(((user.victorias || 0) / total) * 100) : 0;
  return (
    <div
      className={[
        "nk-player-row",
        selected  ? "nk-player-row--selected" : "",
        isCreator ? "nk-player-row--creator"  : "",
      ].join(" ")}
      onClick={() => !isCreator && onToggle(user)}
    >
      <UserAvatar user={user} size="md" variant={isCreator ? "orange" : "blue"} />
      <div className="nk-player-row__info">
        <div className="nk-player-row__name">
          {user.nombre}
          {isCreator && <span style={{ color: "var(--nk-gold)", marginLeft: 8, fontSize: "0.72rem" }}>★ Creador</span>}
        </div>
        <div className="nk-player-row__meta">{medalla.icon} {medalla.label} · WR {pctWin}%</div>
      </div>
      <div className="nk-player-row__stats">
        {[
          { v: user.victorias ?? 0, l: "G", c: "var(--nk-green)" },
          { v: user.derrotas  ?? 0, l: "P", c: "var(--nk-red)"   },
          { v: user.empates   ?? 0, l: "E", c: "var(--nk-gold)"  },
        ].map(s => (
          <div key={s.l} className="nk-stat">
            <span className="nk-stat__val" style={{ color: s.c }}>{s.v}</span>
            <span className="nk-stat__lbl">{s.l}</span>
          </div>
        ))}
      </div>
      {!isCreator && (
        <div className="nk-player-row__slot--check">{selected && <Check size={12} />}</div>
      )}
    </div>
  );
}

export function FighterCard({ user, score = 0, status = "ESPERANDO", isRival = false }) {
  if (!user) return null;
  return (
    <div className={`nk-fighter ${isRival ? "nk-fighter--blue" : ""}`}>
      <div className="nk-fighter__bg" />
      <div className="nk-fighter__inner">
        <span className="nk-fighter__score">{score.toLocaleString()}</span>
        <div className="nk-fighter__avatar-wrap">
          <div className="nk-fighter__avatar-ring" />
          {/* Avatar real o inicial — sin dicebear */}
          <AvatarFighter user={user} />
        </div>
        <span className="nk-fighter__name">{user?.nombre}</span>
        <div className="nk-fighter__status-bar">
          <span className="nk-fighter__status-dot" />
          <span className="nk-fighter__status-txt">{status}</span>
        </div>
        <div className="nk-fighter__stats">
          {[
            { v: user?.victorias ?? 0, l: "Ganadas",  c: "var(--nk-green)" },
            { v: user?.derrotas  ?? 0, l: "Perdidas", c: "var(--nk-red)"   },
            { v: user?.empates   ?? 0, l: "Empates",  c: "var(--nk-gold)"  },
          ].map(s => (
            <div key={s.l} className="nk-stat">
              <span className="nk-stat__val" style={{ color: s.c, fontSize: "0.85rem" }}>{s.v}</span>
              <span className="nk-stat__lbl">{s.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Avatar específico para FighterCard (cuadrado redondeado, más grande)
function AvatarFighter({ user }) {
  const [imgError, setImgError] = useState(false);
  const initial  = (user?.nombre || "?")[0].toUpperCase();
  const [c1, c2] = colorForName(user?.nombre || "");
  const isVideo  = user?.avatar?.endsWith?.(".mp4") || user?.avatar?.endsWith?.(".webm");
  const hasMedia = !imgError && user?.avatar && !user.avatar.includes("dicebear");

  if (hasMedia) {
    if (isVideo) return (
      <video className="nk-fighter__avatar" src={user.avatar} autoPlay loop muted playsInline
        onError={() => setImgError(true)} />
    );
    return (
      <img className="nk-fighter__avatar" src={user.avatar} alt={user?.nombre || ""}
        onError={() => setImgError(true)} />
    );
  }

  return (
    <div className="nk-fighter__avatar" style={{
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "2rem", fontWeight: 900, color: "#fff",
      fontFamily: "'Arial Black', sans-serif", userSelect: "none",
    }}>
      {initial}
    </div>
  );
}

function RoomPreview({ creatorUser, invitados, categorias, nombreSala }) {
  const izquierda = [creatorUser, invitados[1]].filter(Boolean);
  const derecha   = [invitados[0], invitados[2]].filter(Boolean);
  const STATUSES  = ["LISTO", "RESPONDIENDO", "ESPERANDO", "RECARGANDO"];
  const PODERES_INFO = [
    { icon: <Clock size={18} />,     key: "A", nombre: "+Tiempo",    desc: "15→30 seg"        },
    { icon: <Scissors size={18} />,  key: "B", nombre: "Eliminar 2", desc: "Quita 2 opciones" },
    { icon: <RefreshCw size={18} />, key: "C", nombre: "Cambiar",    desc: "Nueva pregunta"   },
    { icon: <Heart size={18} />,     key: "D", nombre: "Piedad",     desc: "Solo 50 pts"      },
  ];
  return (
    <div style={{ marginTop: 8 }}>
      <div className="nk-battle-header__cats" style={{ marginBottom: 20, justifyContent: "flex-start" }}>
        {categorias.includes("todas")
          ? <span className="nk-badge nk-badge--gold"><Star size={10} /> Todas las categorías</span>
          : categorias.map(id => {
              const cat = CATEGORIAS.find(c => c.id === id);
              if (!cat) return null;
              const Icon = cat.icon;
              return (
                <span key={id} className="nk-badge nk-badge--orange">
                  <Icon size={14} style={{ marginRight: 4 }} />
                  {cat.nombre}
                </span>
              );
            })
        }
      </div>
      <div className="nk-arena">
        <div className="nk-team nk-team--left">
          {izquierda.map((u, i) => <FighterCard key={u.id} user={u} score={0} status={STATUSES[i]} isRival={false} />)}
        </div>
        <div className="nk-arena__vs"><div className="nk-arena__vs-circle" /></div>
        <div className="nk-team nk-team--right">
          {derecha.length > 0
            ? derecha.map(u => <FighterCard key={u.id} user={u} score={0} status="LISTO" isRival={true} />)
            : <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--nk-muted)", fontSize: "0.8rem" }}>Esperando rivales...</div>
          }
        </div>
      </div>
      <div className="nk-powers-row" style={{ marginTop: 24 }}>
        {PODERES_INFO.map(p => (
          <div key={p.key} className="nk-power">
            <span className="nk-power__key">{p.key}</span>
            <span className="nk-power__icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{p.icon}</span>
            <span className="nk-power__name">{p.nombre}</span>
            <span style={{ fontSize: "0.65rem", color: "var(--nk-muted)" }}>{p.desc}</span>
          </div>
        ))}
      </div>
      <div className="nk-panel" style={{ padding: "16px 20px", marginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {[
            { lbl: "Nombre",        val: nombreSala || "—"    },
            { lbl: "Preguntas",     val: "10"                  },
            { lbl: "Tiempo/preg.",  val: "15 seg"              },
            { lbl: "Pts. victoria", val: "1000"                },
            { lbl: "Pts. 2do",      val: "lo acumulado"        },
            { lbl: "Pacto de cab.", val: "750 c/u (empate 2x)" },
          ].map(d => (
            <div key={d.lbl} className="nk-stat" style={{ alignItems: "flex-start" }}>
              <span className="nk-stat__lbl">{d.lbl}</span>
              <span className="nk-stat__val" style={{ fontSize: "0.9rem", marginTop: 2 }}>{d.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function CreateChallengePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const communityId  = searchParams.get("communityId");
  const { user, loading: authLoading, token } = useAuth();

  const [communityUsers, setCommunityUsers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(!!communityId);

  // Convertir user del contexto al shape del wizard
  const creatorUser = user ? {
    id:        user.id,
    nombre:    user.username,
    // avatarUrl real, sin dicebear
    avatar:    user.avatarUrl ?? null,
    victorias: user.victorias ?? 0,
    derrotas:  user.derrotas  ?? 0,
    empates:   user.empates   ?? 0,
  } : null;

  // Cargar miembros de la comunidad
  useEffect(() => {
    if (!communityId || !token) { setMembersLoading(false); return; }
    fetch(`https://nakama-backend-render.onrender.com/comunidades/${communityId}/members`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: "include",
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCommunityUsers(data.map(m => ({
            id:        m._id,
            nombre:    m.username,
            // avatarUrl real, sin dicebear
            avatar:    m.avatarUrl ?? null,
            victorias: m.victorias ?? 0,
            derrotas:  m.derrotas  ?? 0,
            empates:   m.empates   ?? 0,
          })));
        }
      })
      .catch(err => console.error("[CreateChallenge] miembros:", err))
      .finally(() => setMembersLoading(false));
  }, [communityId, token]);

  const [step,             setStep]     = useState(0);
  const [nombreSala,  setNombreSala]    = useState("");
  const [catsSeleccionadas, setCats]    = useState([]);
  const [invitados,    setInvitados]    = useState([]);
  const [loading,        setLoading]    = useState(false);
  const [error,            setError]    = useState("");

  const listaParaInvitar = useMemo(
    () => communityUsers.filter(u => u.id !== creatorUser?.id),
    [communityUsers, creatorUser],
  );

  const puedeAvanzar = useMemo(() => {
    if (step === 0) return nombreSala.trim().length >= 3;
    if (step === 1) return catsSeleccionadas.length > 0;
    if (step === 2) return invitados.length >= 1;
    return true;
  }, [step, nombreSala, catsSeleccionadas, invitados]);

  function toggleCategoria(id) {
    if (id === "todas") { setCats(prev => prev.includes("todas") ? [] : ["todas"]); return; }
    setCats(prev => {
      const sinTodas = prev.filter(c => c !== "todas");
      return sinTodas.includes(id) ? sinTodas.filter(c => c !== id) : [...sinTodas, id];
    });
  }

  function toggleInvitado(user) {
    setInvitados(prev => {
      if (prev.some(u => u.id === user.id)) return prev.filter(u => u.id !== user.id);
      if (prev.length >= MAX_JUGADORES) return prev;
      return [...prev, user];
    });
  }

  function siguienteStep() { if (puedeAvanzar) setStep(s => Math.min(s + 1, STEPS.length - 1)); }
  function anteriorStep()  { setStep(s => Math.max(s - 1, 0)); }

  async function crearSala() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://nakama-backend-render.onrender.com/battles/create", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          roomId:        `sala_${Date.now()}`,
          nombre:        nombreSala.trim(),
          categorias:    catsSeleccionadas,
          invitados:     invitados.map(u => u.id),
          communityId,
          configuracion: { totalPreguntas: 10, tiempoPorPregunta: 15, puntosVictoria: 1000 },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Error al crear la sala."); return; }
      sessionStorage.setItem("nakama_room", JSON.stringify({ ...data, nombre: nombreSala.trim() }));
      router.push(`/batalla/${data.roomId}`);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || membersLoading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        height:"100vh", background:"#0a0a0f", color:"#fff", fontFamily:"sans-serif" }}>
        Cargando desafío...
      </div>
    );
  }

  if (!creatorUser) { router.push("/login"); return null; }

  return (
    <div className="nk-root">
      <div className="nk-content">
        <div className="nk-create-page">

          <div className="nk-create-header">
            <div className="nk-create-header__left">
              <a className="nk-logo" href="/">NAKAMA</a>
              <div className="nk-create-header__title">Crear Desafío</div>
              <span className="nk-label">Invitá rivales de la comunidad</span>
            </div>
            <UserAvatar user={creatorUser} size="lg" variant="orange" />
          </div>

          <div className="nk-steps">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.label} style={{ display: "contents" }}>
                  <div className={`nk-step ${i === step ? "nk-step--active" : ""} ${i < step ? "nk-step--done" : ""}`}>
                    <div className="nk-step__num">{i < step ? <Check size={14} /> : <Icon size={14} />}</div>
                    <span className="nk-step__name">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="nk-step__line" />}
                </div>
              );
            })}
          </div>

          {/* STEP 0 */}
          {step === 0 && (
            <div className="nk-panel nk-panel--glow-blue nk-section">
              <div className="nk-section__head">
                <div className="nk-section__icon"><Swords size={18} /></div>
                <span className="nk-section__title">Nombre del Desafío</span>
              </div>
              <div className="nk-field" style={{ marginBottom: 24 }}>
                <label>Nombre de la sala</label>
                <input className="nk-input" placeholder="Ej: Torneo Shonen 2025, El duelo final..."
                  value={nombreSala} onChange={e => setNombreSala(e.target.value)} maxLength={50} />
                <span style={{ fontSize:"0.72rem", color:"var(--nk-muted)", textAlign:"right" }}>
                  {nombreSala.length}/50
                </span>
              </div>
              <div className="nk-panel" style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <UserAvatar user={creatorUser} size="md" variant="orange" />
                  <div>
                    <div style={{ fontWeight:700 }}>{creatorUser.nombre}</div>
                    <span className="nk-badge nk-badge--gold"><Star size={9} /> Creador de la sala</span>
                  </div>
                  <div style={{ marginLeft:"auto", display:"flex", gap:12 }}>
                    {[
                      { v: creatorUser.victorias ?? 0, l:"G", c:"var(--nk-green)" },
                      { v: creatorUser.derrotas  ?? 0, l:"P", c:"var(--nk-red)"   },
                      { v: creatorUser.empates   ?? 0, l:"E", c:"var(--nk-gold)"  },
                    ].map(s => (
                      <div key={s.l} className="nk-stat">
                        <span className="nk-stat__val" style={{ color:s.c }}>{s.v}</span>
                        <span className="nk-stat__lbl">{s.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop:20, padding:"14px 16px", borderRadius:8,
                background:"rgba(0,200,255,0.04)", border:"1px solid rgba(0,200,255,0.1)" }}>
                <div className="nk-label" style={{ marginBottom:10 }}>Reglas de la batalla</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["10 preguntas","por ronda"],["15 segundos","por pregunta"],
                    ["1000 pts","al ganador"],["4 poderes","por jugador"],
                    ["Hasta 4","jugadores"],["Desempate","hasta x2"],
                  ].map(([a, b]) => (
                    <div key={a} style={{ display:"flex", gap:6, alignItems:"center", fontSize:"0.8rem" }}>
                      <Zap size={12} color="var(--nk-blue)" />
                      <span><strong>{a}</strong> <span style={{ color:"var(--nk-muted)" }}>{b}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="nk-panel nk-panel--glow-blue nk-section">
              <div className="nk-section__head">
                <div className="nk-section__icon"><BookOpen size={18} /></div>
                <span className="nk-section__title">Categorías del desafío</span>
              </div>
              <div style={{ marginBottom:14, color:"var(--nk-muted)", fontSize:"0.85rem" }}>
                Elegí una, varias o todas las categorías.
              </div>
              <div className="nk-cat-grid">
                <div
                  className={`nk-cat-card nk-cat-card--all ${catsSeleccionadas.includes("todas") ? "nk-cat-card--selected" : ""}`}
                  onClick={() => toggleCategoria("todas")}
                >
                  <span className="nk-cat-card__emoji">🌟</span>
                  <span className="nk-cat-card__name">Todas las categorías</span>
                  <span className="nk-cat-card__check"><Check size={10} /></span>
                </div>
                {CATEGORIAS.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id}
                      className={`nk-cat-card ${(catsSeleccionadas.includes(cat.id) || catsSeleccionadas.includes("todas")) ? "nk-cat-card--selected" : ""}`}
                      onClick={() => toggleCategoria(cat.id)}
                    >
                      <span className="nk-cat-card__emoji"><Icon size={18} /></span>
                      <span className="nk-cat-card__name">{cat.nombre}</span>
                      <span className="nk-cat-card__check"><Check size={10} /></span>
                    </div>
                  );
                })}
              </div>
              {catsSeleccionadas.length > 0 && (
                <div className="nk-selected-tags">
                  <span className="nk-label" style={{ alignSelf:"center" }}>Elegidas:</span>
                  {catsSeleccionadas.includes("todas")
                    ? <span className="nk-badge nk-badge--gold"><Star size={9} /> Todas</span>
                    : catsSeleccionadas.map(id => {
                        const c = CATEGORIAS.find(x => x.id === id);
                        return c ? <span key={id} className="nk-badge nk-badge--orange">{c.nombre}</span> : null;
                      })
                  }
                </div>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="nk-panel nk-panel--glow-blue nk-section">
              <div className="nk-section__head">
                <div className="nk-section__icon"><Users size={18} /></div>
                <span className="nk-section__title">Participantes</span>
              </div>
              <div className="nk-slot-info">
                <div className="nk-slot-dots">
                  {[creatorUser, ...invitados, null, null, null].slice(0, 4).map((u, i) => (
                    <div key={i} className={`nk-slot-dot ${u ? `nk-slot-dot--filled--${i}` : ""}`} title={u?.nombre || "Vacío"} />
                  ))}
                </div>
                <span className="nk-slot-info__txt">
                  {1 + invitados.length}/4 jugadores — seleccioná hasta {MAX_JUGADORES} rivales
                </span>
              </div>
              <PlayerRow user={creatorUser} isCreator selected onToggle={() => {}} />
              <div className="nk-divider" />
              <div className="nk-label" style={{ marginBottom:10 }}>
                Miembros de la comunidad ({listaParaInvitar.length})
              </div>
              {listaParaInvitar.length === 0 ? (
                <div style={{ textAlign:"center", color:"var(--nk-muted)", padding:"30px 0", fontSize:"0.85rem" }}>
                  No hay otros miembros disponibles.
                </div>
              ) : (
                <div className="nk-player-list">
                  {listaParaInvitar.map(user => (
                    <PlayerRow key={user.id} user={user}
                      selected={invitados.some(u => u.id === user.id)}
                      isCreator={false} onToggle={toggleInvitado}
                    />
                  ))}
                </div>
              )}
              {invitados.length >= MAX_JUGADORES && (
                <div className="nk-badge nk-badge--orange" style={{ marginTop:12 }}>
                  ⚠️ Máximo de {MAX_JUGADORES} rivales alcanzado
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="nk-panel nk-panel--glow-orange nk-section">
              <div className="nk-section__head">
                <div className="nk-section__icon"><Rocket size={18} /></div>
                <span className="nk-section__title">Confirmar Batalla</span>
              </div>
              <div style={{ color:"var(--nk-muted)", fontSize:"0.85rem", marginBottom:8 }}>
                Al confirmar se enviará la invitación. Tendrán{" "}
                <strong style={{ color:"var(--nk-blue)" }}>2 minutos</strong> para aceptar.
              </div>
              <RoomPreview
                creatorUser={creatorUser} invitados={invitados}
                categorias={catsSeleccionadas} nombreSala={nombreSala}
              />
              {error && (
                <div style={{ marginTop:14, padding:"10px 14px", borderRadius:8,
                  background:"rgba(255,45,85,0.1)", border:"1px solid var(--nk-red)",
                  color:"var(--nk-red)", fontSize:"0.85rem" }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          <div className="nk-create-footer">
            {step > 0 && (
              <button className="nk-btn nk-btn--ghost" onClick={anteriorStep} disabled={loading}>
                <ChevronLeft size={16} /> Atrás
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button className="nk-btn nk-btn--primary nk-btn--lg" onClick={siguienteStep} disabled={!puedeAvanzar}>
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button className="nk-btn nk-btn--primary nk-btn--lg" onClick={crearSala} disabled={loading} style={{ minWidth:180 }}>
                {loading ? "⏳ Creando sala..." : <><Rocket size={16} /> ¡Crear Desafío!</>}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
