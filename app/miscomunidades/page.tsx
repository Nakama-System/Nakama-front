"use client";

// ═══════════════════════════════════════════════════════════
// components/MisComunidades.tsx — v4 FIXED
// • Deduplicación por _id (evita aparecer 2 veces como creador+miembro)
// • Badge: "Creador" si la creaste, "Miembro" si entraste a una ajena
// • Slider embebido, flechas dentro del card-area, paginación de 2 en 2
// • Última página puede mostrar 1 sola card
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Crown, ArrowRight, Globe,
  Plus, RefreshCw, Lock, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/authContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface MiComunidad {
  _id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  memberCount: number;
  messagingOpen: boolean;
  theme?: string;
  createdAt: string;
  creatorId?: string;
  creator?: string;
  isMember?: boolean;
}

const THEME_ACCENT: Record<string, string> = {
  dark: "#e63946", light: "#e63946", ocean: "#0ea5e9",
  forest: "#22c55e", sunset: "#f97316", sakura: "#f472b6",
  neon: "#8b5cf6", gold: "#eab308", galaxy: "#6366f1",
};
const THEME_BG: Record<string, string> = {
  dark: "#070714", light: "#f4f4f8", ocean: "#071525",
  forest: "#0a1a0e", sunset: "#1a0800", sakura: "#1a0d14",
  neon: "#050510", gold: "#120e00", galaxy: "#04001a",
};

function isVideoOrGif(url?: string) {
  return !!url && /\.(mp4|webm|mov|gif)(\?|$)/i.test(url);
}

// ─── Card ─────────────────────────────────────────────────
function ComunidadCard({
  com, userId, onEnter,
}: {
  com: MiComunidad; userId: string; onEnter: () => void;
}) {
  const theme   = com.theme ?? "dark";
  const accent  = THEME_ACCENT[theme] ?? "#e63946";
  const bgTheme = THEME_BG[theme]     ?? "#070714";
  const isVid   = isVideoOrGif(com.avatarUrl);
  const isOwner = String(com.creatorId ?? com.creator ?? "") === userId;
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        width: "100%", height: 200,
        position: "relative", borderRadius: 14,
        overflow: "hidden",
        background: `linear-gradient(155deg, ${bgTheme} 0%, rgba(0,0,0,0.88) 100%)`,
        border: `1px solid ${hovered ? accent + "55" : accent + "22"}`,
        display: "flex", flexDirection: "column",
        cursor: "pointer",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 10px 28px rgba(0,0,0,0.55), 0 0 0 1px ${accent}44` : "none",
        transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEnter}
    >
      {/* Cover difuso */}
      {com.coverUrl && !isVideoOrGif(com.coverUrl) && (
        <img src={com.coverUrl} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.12, filter: "blur(2px) saturate(1.3)", zIndex: 0,
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `linear-gradient(155deg, ${bgTheme}dd 0%, rgba(0,0,0,0.93) 100%)`,
      }} />

      {/* Dot temático */}
      <div style={{
        position: "absolute", top: 8, left: 8, zIndex: 3,
        width: 6, height: 6, borderRadius: "50%",
        background: accent, boxShadow: `0 0 8px ${accent}`,
      }} />

      {/* Badge rol */}
      <div style={{
        position: "absolute", top: 7, right: 7, zIndex: 3,
        display: "flex", alignItems: "center", gap: 3,
        padding: "2px 6px", borderRadius: 20,
        background: isOwner ? "rgba(251,191,36,0.12)" : "rgba(96,165,250,0.1)",
        border: `1px solid ${isOwner ? "rgba(251,191,36,0.25)" : "rgba(96,165,250,0.2)"}`,
        backdropFilter: "blur(6px)",
      }}>
        {isOwner ? <Crown size={7} color="#fbbf24" /> : <Users size={7} color="#60a5fa" />}
        <span style={{
          fontSize: ".5rem", fontWeight: 800,
          color: isOwner ? "#fbbf24" : "#60a5fa",
        }}>
          {isOwner ? "Creador" : "Miembro"}
        </span>
      </div>

      {/* Centro */}
      <div style={{
        position: "relative", zIndex: 2,
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 10px 6px", gap: 6,
        overflow: "hidden",
      }}>
        <div style={{
          width: 50, height: 50, flexShrink: 0,
          borderRadius: 12, overflow: "hidden",
          border: `2px solid ${accent}44`,
          background: `linear-gradient(135deg, ${accent}28, ${bgTheme})`,
          boxShadow: `0 3px 14px rgba(0,0,0,0.6), 0 0 0 1px ${accent}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {com.avatarUrl && !imgErr && !isVid ? (
            <img src={com.avatarUrl} alt={com.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={() => setImgErr(true)}
            />
          ) : com.avatarUrl && isVid ? (
            <video src={com.avatarUrl} autoPlay muted loop playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "white" }}>
              {com.name[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <span style={{
          fontWeight: 800, fontSize: ".78rem", color: "#f0f0fc",
          width: "100%", textAlign: "center",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {com.name}
        </span>

        <p style={{
          margin: 0, fontSize: ".6rem", color: "rgba(240,240,252,0.32)",
          textAlign: "center", lineHeight: 1.3, width: "100%",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const, overflow: "hidden",
        }}>
          {com.description || " "}
        </p>
      </div>

      {/* Footer */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 9px 9px", gap: 4, flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 3, flexWrap: "nowrap", overflow: "hidden" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            padding: "2px 5px", borderRadius: 20,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            fontSize: ".52rem", fontWeight: 700, color: "rgba(240,240,252,0.42)",
            whiteSpace: "nowrap",
          }}>
            <Users size={7} /> {com.memberCount.toLocaleString()}
          </span>
          {!com.messagingOpen && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 2,
              padding: "2px 5px", borderRadius: 20,
              background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.16)",
              fontSize: ".52rem", fontWeight: 700, color: "#e63946", whiteSpace: "nowrap",
            }}>
              <Lock size={6} /> Cerrado
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onEnter(); }}
          style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "3px 8px", borderRadius: 6,
            border: `1px solid ${accent}44`,
            background: `${accent}18`,
            color: accent, fontSize: ".6rem", fontWeight: 800,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = `${accent}35`)}
          onMouseLeave={e => (e.currentTarget.style.background = `${accent}18`)}
        >
          Entrar <ArrowRight size={9} />
        </button>
      </div>
    </div>
  );
}

// ─── Slider embebido — paginación de 2 en 2 ───────────────
function ComunidadesSlider({
  comunidades, userId, onEnter,
}: {
  comunidades: MiComunidad[]; userId: string; onEnter: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideDir, setSlideDir] = useState<"l" | "r">("r");

  const PAGE_SIZE = 2;
  const totalPages = Math.ceil(comunidades.length / PAGE_SIZE);
  const showArrows = totalPages > 1;

  // Items de la página actual
  const pageItems = comunidades.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function goTo(newPage: number, dir: "l" | "r") {
    if (animating) return;
    setSlideDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setPage(newPage);
      setAnimating(false);
    }, 220);
  }

  function prev() {
    goTo(page > 0 ? page - 1 : totalPages - 1, "l");
  }
  function next() {
    goTo(page < totalPages - 1 ? page + 1 : 0, "r");
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>

      {/* ── Contenedor con flechas embebidas ── */}
      <div style={{ position: "relative" }}>

        {/* Flecha izquierda — embebida */}
        {showArrows && (
          <button
            onClick={prev}
            style={{
              position: "absolute",
              left: 0, top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 26, height: 26, borderRadius: "50%",
              background: "rgba(20,20,35,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(240,240,252,0.75)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
              backdropFilter: "blur(6px)",
              transition: "background 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(230,57,70,0.22)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(20,20,35,0.85)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <ChevronLeft size={14} />
          </button>
        )}

        {/* Flecha derecha — embebida */}
        {showArrows && (
          <button
            onClick={next}
            style={{
              position: "absolute",
              right: 0, top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 26, height: 26, borderRadius: "50%",
              background: "rgba(20,20,35,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(240,240,252,0.75)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
              backdropFilter: "blur(6px)",
              transition: "background 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(230,57,70,0.22)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(20,20,35,0.85)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Grid con padding para las flechas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: pageItems.length === 1 ? "1fr" : "1fr 1fr",
            gap: 8,
            padding: showArrows ? "0 32px" : "0",
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${slideDir === "r" ? "-8px" : "8px"})`
              : "translateX(0)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
          }}
        >
          {pageItems.map(com => (
            <ComunidadCard
              key={com._id}
              com={com}
              userId={userId}
              onEnter={() => onEnter(com._id)}
            />
          ))}
        </div>
      </div>

      {/* Dots indicadores */}
      {showArrows && (
        <div style={{
          display: "flex", justifyContent: "center",
          gap: 5, marginTop: 8,
        }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > page ? "r" : "l")}
              style={{
                height: 4, borderRadius: 2,
                width: i === page ? 18 : 4,
                background: i === page ? "#e63946" : "rgba(255,255,255,0.15)",
                border: "none", padding: 0, cursor: "pointer",
                transition: "width 0.25s, background 0.25s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────
export default function MisComunidades() {
  const { user } = useAuth();
  const router   = useRouter();

  const [comunidades, setComunidades] = useState<MiComunidad[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  const userId = String((user as any)?.id ?? (user as any)?._id ?? "");

  async function fetchMisComunidades() {
    if (!user) return;
    setLoading(true);
    setError("");
    const token = localStorage.getItem("nakama_token") ?? "";
    try {
      const res = await fetch(`${API}/comunidades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const raw: MiComunidad[] = Array.isArray(data)
        ? data : Array.isArray(data.comunidades) ? data.comunidades : [];

      // ── DEDUPLICAR por _id ──────────────────────────────
      // Filtramos isMember=true y eliminamos duplicados
      const seen = new Set<string>();
      const unique = raw.filter(c => {
        if (!c.isMember) return false;
        if (seen.has(c._id)) return false;
        seen.add(c._id);
        return true;
      });

      setComunidades(unique);
    } catch {
      setError("No se pudieron cargar tus comunidades.");
    }
    setLoading(false);
  }

  useEffect(() => { if (user) fetchMisComunidades(); }, [user]); // eslint-disable-line

  useEffect(() => {
    const handler = () => fetchMisComunidades();
    window.addEventListener("nakama:community_added", handler);
    return () => window.removeEventListener("nakama:community_added", handler);
  }, [user]); // eslint-disable-line

  // ── Loading ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: "0 0 14px" }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <Globe size={12} color="#60a5fa" />
        <span style={{ fontWeight: 800, fontSize: ".78rem", color: "#f0f0fc" }}>Mis comunidades</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            height: 200, borderRadius: 14,
            backgroundImage: "linear-gradient(90deg,rgba(255,255,255,0.02) 0%,rgba(255,255,255,0.055) 50%,rgba(255,255,255,0.02) 100%)",
            backgroundSize: "800px 100%",
            animation: `shimmer 1.4s ${i * 0.12}s infinite linear`,
            border: "1px solid rgba(255,255,255,0.05)",
          }} />
        ))}
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────
  if (error) return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
        padding: "16px 12px", borderRadius: 12,
        background: "rgba(230,57,70,0.05)", border: "1px solid rgba(230,57,70,0.12)",
        textAlign: "center",
      }}>
        <Globe size={18} style={{ color: "rgba(240,240,252,0.14)" }} />
        <span style={{ fontSize: ".7rem", color: "rgba(240,240,252,0.32)" }}>{error}</span>
        <button onClick={fetchMisComunidades} style={{
          padding: "4px 11px", borderRadius: 7,
          background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.2)",
          color: "#e63946", fontSize: ".67rem", fontWeight: 700, cursor: "pointer",
        }}>Reintentar</button>
      </div>
    </div>
  );

  // ── Empty ────────────────────────────────────────────────
  if (comunidades.length === 0) return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "22px 12px", borderRadius: 12,
        background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.07)",
        textAlign: "center",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: "linear-gradient(135deg,rgba(96,165,250,0.09),rgba(168,85,247,0.09))",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Users size={15} style={{ color: "rgba(240,240,252,0.16)" }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: ".75rem", color: "rgba(240,240,252,0.38)", marginBottom: 2 }}>
            No pertenecés a ninguna comunidad
          </div>
          <div style={{ fontSize: ".63rem", color: "rgba(240,240,252,0.18)" }}>
            Creá una o esperá que te inviten
          </div>
        </div>
        <button onClick={() => router.push("/crearComunidad")} style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "5px 13px", borderRadius: 7,
          background: "linear-gradient(135deg,#e63946,#a855f7)",
          border: "none", color: "white", fontSize: ".68rem", fontWeight: 800, cursor: "pointer",
        }}>
          <Plus size={10} /> Crear comunidad
        </button>
      </div>
    </div>
  );

  // ── Slider ───────────────────────────────────────────────
  return (
    <div style={{ padding: "0 0 14px" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8, padding: "0 2px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Globe size={12} color="#60a5fa" />
          <span style={{ fontWeight: 800, fontSize: ".78rem", color: "#f0f0fc" }}>
            Mis comunidades
          </span>
          <span style={{
            fontSize: ".56rem", fontWeight: 700,
            padding: "1px 5px", borderRadius: 10,
            background: "rgba(96,165,250,0.09)", border: "1px solid rgba(96,165,250,0.17)",
            color: "#60a5fa",
          }}>
            {comunidades.length}
          </span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={fetchMisComunidades} title="Recargar" style={{
            width: 23, height: 23, borderRadius: 6,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(240,240,252,0.3)",
          }}>
            <RefreshCw size={9} />
          </button>
          <button onClick={() => router.push("/crearComunidad")} style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "0 8px", height: 23, borderRadius: 6,
            background: "linear-gradient(135deg,#e63946,#a855f7)",
            border: "none", color: "white", fontSize: ".6rem", fontWeight: 800, cursor: "pointer",
          }}>
            <Plus size={8} /> Nueva
          </button>
        </div>
      </div>

      {/* Slider */}
      <div style={{ animation: "fadeUp 0.28s ease both" }}>
        <ComunidadesSlider
          comunidades={comunidades}
          userId={userId}
          onEnter={id => router.push(`/comunidad/${id}`)}
        />
      </div>
    </div>
  );
}