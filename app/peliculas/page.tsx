"use client";

/**
 * app/peliculas/page.tsx — Nakama · Catálogo de Películas
 */
import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/authContext";
import type { MovieItem, MoviesResponse, ShareMeta } from "../types/movie";
import "../styles/movies.css";

import {
  Play, Share2, Download, Search, Star,
  ChevronLeft, ChevronRight, X, Copy, Check,
  Film, Flame, Compass, Laugh, Heart, Home,
  Layers, AlertCircle, CheckCircle2, Info,
  MessageCircle, Send, Twitter, Facebook, Eye, House,
  Swords, BookOpen, Ghost, Rocket, Clapperboard, FileVideo,
} from "lucide-react";


/* ══════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════ */
const API_BASE  = "https://nakama-vercel-backend.vercel.app";
const PAGE_SIZE = 9;
const NEXT_PUBLIC_SITE_URL = "https://nakama-front.vercel.app"


// ── URL base para compartir ───────────────────────────────
const SHARE_BASE =

  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== "undefined" && window.location.origin !== "https://nakama-front.vercel.app"
    ? window.location.origin
    : "https://nakama-front.vercel.app");

// ── Categorías unificadas ─────────────────────────────────
const CATEGORIES = [
  { key: "all",        label: "Todas",       Icon: Layers      },
  { key: "accion",     label: "Acción",      Icon: Flame       },
  { key: "aventura",   label: "Aventura",    Icon: Compass     },
  { key: "comedia",    label: "Comedia",     Icon: Laugh       },
  { key: "drama",      label: "Drama",       Icon: BookOpen    },
  { key: "terror",     label: "Terror",      Icon: Ghost       },
  { key: "romance",    label: "Romance",     Icon: Heart       },
  { key: "sci-fi",     label: "Sci-Fi",      Icon: Rocket      },
  { key: "animacion",  label: "Animación",   Icon: Clapperboard},
  { key: "documental", label: "Documental",  Icon: FileVideo   },
  { key: "diversion",  label: "Diversión",   Icon: Laugh       },
  { key: "amor",       label: "Amor",        Icon: Heart       },
  { key: "familia",    label: "Familia",     Icon: Home        },
  { key: "otro",       label: "Otro",        Icon: Layers      },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

const CAT_PALETTE: Record<string, { accent: string; glow: string; bg: string }> = {
  accion:     { accent: "#e63946", glow: "rgba(230,57,70,.18)",   bg: "rgba(230,57,70,.07)"   },
  aventura:   { accent: "#ff9f43", glow: "rgba(255,159,67,.18)",  bg: "rgba(255,159,67,.07)"  },
  comedia:    { accent: "#26de81", glow: "rgba(38,222,129,.18)",  bg: "rgba(38,222,129,.07)"  },
  drama:      { accent: "#a29bfe", glow: "rgba(162,155,254,.18)", bg: "rgba(162,155,254,.07)" },
  terror:     { accent: "#636e72", glow: "rgba(99,110,114,.18)",  bg: "rgba(99,110,114,.07)"  },
  romance:    { accent: "#fd79a8", glow: "rgba(253,121,168,.18)", bg: "rgba(253,121,168,.07)" },
  "sci-fi":   { accent: "#00cec9", glow: "rgba(0,206,201,.18)",   bg: "rgba(0,206,201,.07)"   },
  animacion:  { accent: "#fdcb6e", glow: "rgba(253,203,110,.18)", bg: "rgba(253,203,110,.07)" },
  documental: { accent: "#b2bec3", glow: "rgba(178,190,195,.18)", bg: "rgba(178,190,195,.07)" },
  diversion:  { accent: "#55efc4", glow: "rgba(85,239,196,.18)",  bg: "rgba(85,239,196,.07)"  },
  amor:       { accent: "#e84393", glow: "rgba(232,67,147,.18)",  bg: "rgba(232,67,147,.07)"  },
  familia:    { accent: "#74b9ff", glow: "rgba(116,185,255,.18)", bg: "rgba(116,185,255,.07)" },
  otro:       { accent: "#dfe6e9", glow: "rgba(223,230,233,.18)", bg: "rgba(223,230,233,.07)" },
};

// ── Clasificación por edad ────────────────────────────────
type AgeRating = "all" | "+10" | "+13" | "+18";

const AGE_RATING_META: Record<AgeRating, { label: string; color: string; short: string }> = {
  all:   { label: "Todo público",  color: "#22c55e", short: "ATP" },
  "+10": { label: "Mayores de 10", color: "#f59e0b", short: "+10" },
  "+13": { label: "Mayores de 13", color: "#f97316", short: "+13" },
  "+18": { label: "Mayores de 18", color: "#ef4444", short: "+18" },
};

const AGE_RATING_FILTERS: { key: AgeRating; label: string }[] = [
  { key: "all",  label: "Todas las edades" },
  { key: "+10",  label: "+10" },
  { key: "+13",  label: "+13" },
  { key: "+18",  label: "+18" },
];

/* ══════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════ */
interface ToastItem {
  id: number; msg: string; type: "success" | "error" | "info";
}

/* ══════════════════════════════════════════════════
   API HELPERS
   ══════════════════════════════════════════════════ */
function bearerHeader(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetchMovies(
  params: { category: string; ageRating: AgeRating; search: string; page: number; sort: string },
  token: string | null,
): Promise<MoviesResponse> {
  const q = new URLSearchParams({
    category:  params.category === "all" ? "" : params.category,
    ageRating: params.ageRating === "all" ? "" : params.ageRating,
    search:    params.search,
    page:      String(params.page),
    limit:     String(PAGE_SIZE),
    sort:      params.sort,
  });
  const res = await fetch(`${API_BASE}/moviesup?${q}`, {
    headers: bearerHeader(token), credentials: "include",
  });
  if (!res.ok) throw new Error("Error al cargar películas");
  return res.json() as Promise<MoviesResponse>;
}

async function apiShareMeta(id: string): Promise<ShareMeta> {
  const res = await fetch(`${API_BASE}/moviesup/${id}/share`);
  if (!res.ok) throw new Error("Error al obtener metadatos");
  return res.json() as Promise<ShareMeta>;
}

async function apiVote(id: string, rating: number, token: string | null) {
  const res = await fetch(`${API_BASE}/moviesup/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearerHeader(token) },
    credentials: "include",
    body: JSON.stringify({ rating }),
  });
  return res.json() as Promise<{ ok: boolean; newRating: number; votesCount: number; error?: string }>;
}

async function apiDownload(id: string, token: string | null) {
  const res = await fetch(`${API_BASE}/moviesup/${id}/download`, {
    method: "POST", headers: bearerHeader(token), credentials: "include",
  });
  return res.json() as Promise<{ ok: boolean; downloadUrl: string; filename?: string; error?: string }>;
}

/* ══════════════════════════════════════════════════
   AgeRatingBadge
   ══════════════════════════════════════════════════ */
function AgeRatingBadge({ value }: { value: AgeRating }) {
  if (!value || value === "all") return null;
  const meta = AGE_RATING_META[value];
  return (
    <span
      title={meta.label}
      style={{
        position:       "absolute",
        top:            8,
        left:           8,
        display:        "inline-flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "2px 6px",
        borderRadius:   5,
        background:     meta.color,
        color:          "#fff",
        fontSize:       10,
        fontWeight:     700,
        letterSpacing:  "0.3px",
        lineHeight:     1.6,
        zIndex:         4,
        pointerEvents:  "none",
        boxShadow:      `0 1px 6px ${meta.color}55`,
      }}
    >
      {meta.short}
    </span>
  );
}

/* ══════════════════════════════════════════════════
   HERO
   ══════════════════════════════════════════════════ */
function HeroSection({ total, onExplore }: { total: number; onExplore: () => void }) {
  return (
    <div className="nk-hero">
      <div className="nk-hero__bg-grid" />
      <div className="nk-hero__scanline" />
      <div className="nk-hero__orb nk-hero__orb--1" />
      <div className="nk-hero__orb nk-hero__orb--2" />
      <div className="nk-hero__orb nk-hero__orb--3" />

      {[
        { x: "62%", y: "22%", c: "#e63946", d: ".4s",  t: "2.4s" },
        { x: "75%", y: "38%", c: "#74b9ff", d: "1.1s", t: "2.9s" },
        { x: "82%", y: "18%", c: "#ff9f43", d: ".8s",  t: "2.1s" },
        { x: "70%", y: "60%", c: "#26de81", d: "1.6s", t: "3.2s" },
        { x: "88%", y: "45%", c: "#e63946", d: ".3s",  t: "2.6s" },
        { x: "58%", y: "70%", c: "#fd79a8", d: "2s",   t: "2.3s" },
      ].map((p, i) => (
        <span key={i} className="nk-hero__spark" style={{
          left: p.x, top: p.y, background: p.c,
          animationDelay: p.d, animationDuration: p.t,
        }} />
      ))}

      <div className="nk-hero__img-wrap">
        <img src="/assets/portadas.jpg" alt="Nakama" onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }} />
        <div className="nk-hero__img-vignette" />
      </div>

      <div className="nk-hero__content">
        <div className="nk-hero__eyebrow">
          <span className="nk-hero__pill nk-hero__pill--live">
            <span className="nk-hero__dot" /> En vivo
          </span>
          <span className="nk-hero__pill">HD · 4K</span>
          <span className="nk-hero__pill">{total > 0 ? `${total}+ títulos` : "500+ títulos"}</span>
        </div>

        <h1 className="nk-hero__title">
          <span className="nk-hero__title-naka">NAKAMA</span>
         
          <span className="nk-hero__title-universe">UNIVERSE</span>
        </h1>

        <p className="nk-hero__tagline">
          Tu universo de películas — sin límites, sin censura, sin esperas.
        </p>

        <div className="nk-hero__stats">
          {[
            { val: total > 0 ? `${total}+` : "0+", lbl: "Películas"  },
            { val: "0K",                             lbl: "Episodios"  },
            { val: "HD",                              lbl: "Calidad"    },
            { val: "0",                               lbl: "Anuncios"   },
          ].map((s, i) => (
            <div key={i} className="nk-hero__stat">
              <span className="nk-hero__stat-val">{s.val}</span>
              <span className="nk-hero__stat-lbl">{s.lbl}</span>
            </div>
          ))}
        </div>

        <div className="nk-hero__cats">
          {CATEGORIES.filter(c => c.key !== "all").map(({ key, label, Icon }) => {
            const p = CAT_PALETTE[key];
            return (
              <span key={key} className="nk-hero__cat-pill" style={{
                borderColor: p?.accent + "44",
                color:       p?.accent,
                background:  p?.bg,
              }}>
                <Icon size={10} /> {label}
              </span>
            );
          })}
        </div>

        <div className="nk-hero__actions">
          <button className="nk-hero__cta-main" onClick={onExplore}>
            <Play size={15} fill="currentColor" />
            Explorar catálogo
          </button>
          <button className="nk-hero__cta-sec">
            <Film size={15} />
            Lo más visto
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   StarRating
   ══════════════════════════════════════════════════ */
function StarRating({ value, onVote, voted }: {
  value: number; onVote: (n: number) => void; voted: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="nk-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={["nk-star", n <= Math.round(hover || value) ? "on" : "", voted ? "locked" : ""].filter(Boolean).join(" ")}
          onMouseEnter={() => !voted && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => !voted && onVote(n)}
          title={voted ? "Ya votaste" : `${n} estrella${n > 1 ? "s" : ""}`}
        >
          <Star size={12} fill={n <= Math.round(hover || value) ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Toast
   ══════════════════════════════════════════════════ */
function ToastContainer({ items }: { items: ToastItem[] }) {
  return (
    <div className="nk-toasts">
      {items.map((t) => (
        <div key={t.id} className={`nk-toast nk-toast--${t.type}`}>
          {t.type === "success" && <CheckCircle2 size={13} />}
          {t.type === "error"   && <AlertCircle  size={13} />}
          {t.type === "info"    && <Info          size={13} />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ShareModal
   ══════════════════════════════════════════════════ */
function ShareModal({ movie, onClose }: { movie: MovieItem; onClose: () => void }) {
  const [meta, setMeta]     = useState<ShareMeta | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiShareMeta(movie.id).then(setMeta).catch(console.error);
  }, [movie.id]);

  const copy = () => {
    if (!meta) return;
    navigator.clipboard.writeText(meta.url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const nets = meta ? [
    { label: "WhatsApp", href: meta.whatsapp, Icon: MessageCircle, color: "#25d366" },
    { label: "Telegram", href: meta.telegram, Icon: Send,          color: "#2aabee" },
    { label: "Twitter",  href: meta.twitter,  Icon: Twitter,       color: "#74b9ff" },
    { label: "Facebook", href: meta.facebook, Icon: Facebook,      color: "#1877f2" },
  ] : [];

  return (
    <div className="nk-overlay" onClick={onClose}>
      <div className="nk-modal nk-share-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="nk-modal__close" onClick={onClose}><X size={15} /></button>

        <div className="nk-share-modal__thumb">
          <img src={movie.thumbnail} alt={movie.title} />
          <div className="nk-share-modal__thumb-fade" />
        </div>

        <div className="nk-share-modal__body">
          <p className="nk-share-modal__title">{movie.title}</p>
          <p className="nk-share-modal__desc">{movie.description.slice(0, 90)}…</p>

          {!meta ? <div className="nk-spinner" /> : (
            <>
              <div className="nk-share-modal__url">
                <span className="nk-share-modal__url-text">{meta.url}</span>
                <button type="button" className={`nk-share-modal__copy ${copied ? "done" : ""}`} onClick={copy}>
                  {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                </button>
              </div>
              <div className="nk-share-modal__nets">
                {nets.map((n) => (
                  <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer"
                    className="nk-share-modal__net" style={{ color: n.color, borderColor: n.color + "44" }}>
                    <n.Icon size={13} />
                    <span>{n.label}</span>
                  </a>
                ))}
              </div>
            </>
          )}
          <button type="button" className="nk-modal__cancel" onClick={onClose}><X size={11} /> Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MovieCard
   ══════════════════════════════════════════════════ */
function MovieCard({ movie, token, isAuthenticated, onShare, onToast }: {
  movie: MovieItem; token: string | null; isAuthenticated: boolean;
  onShare: (m: MovieItem) => void;
  onToast: (msg: string, type: ToastItem["type"]) => void;
}) {
  const router = useRouter();

  const [rating,      setRating]      = useState(movie.rating);
  const [votes,       setVotes]       = useState(movie.votesCount);
  const [voted,       setVoted]       = useState(movie.userVoted);
  const [downloading, setDownloading] = useState(false);
  const [imgError,    setImgError]    = useState(false);

  const pal     = CAT_PALETTE[movie.category] ?? { accent: "#e63946", glow: "rgba(230,57,70,.18)", bg: "rgba(230,57,70,.07)" };
  const CatIcon = CATEGORIES.find((c) => c.key === movie.category)?.Icon ?? Film;
  const catLbl  = CATEGORIES.find((c) => c.key === movie.category)?.label ?? movie.category;

  const snapshot = useRef({ rating: movie.rating, votes: movie.votesCount });

  const handleVote = async (n: number) => {
    if (!isAuthenticated) { onToast("Inicia sesión para votar", "info"); return; }
    if (voted) return;

    snapshot.current = { rating, votes };
    setRating(parseFloat(((rating * votes + n) / (votes + 1)).toFixed(1)));
    setVotes((v) => v + 1);
    setVoted(true);

    try {
      const res = await apiVote(movie.id, n, token);
      if (res.ok) {
        setRating(res.newRating); setVotes(res.votesCount);
        onToast(`Voto registrado ★${n}`, "success");
      } else {
        setRating(snapshot.current.rating); setVotes(snapshot.current.votes); setVoted(false);
        onToast(res.error ?? "Error al votar", "error");
      }
    } catch {
      setRating(snapshot.current.rating); setVotes(snapshot.current.votes); setVoted(false);
      onToast("Error de conexión", "error");
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await apiDownload(movie.id, token);
      if (res.ok) {
        const a = document.createElement("a");
        a.href = res.downloadUrl; a.download = res.filename ?? movie.title; a.click();
        onToast("Descarga iniciada", "success");
      } else {
        onToast(res.error ?? "Sin permiso de descarga", "error");
      }
    } catch {
      onToast("Error al descargar", "error");
    } finally {
      setDownloading(false);
    }
  };

  const goToPlayer = () => router.push(`/reproductor/${movie.id}`);

  const ageRating = (movie.ageRating ?? "all") as AgeRating;

  return (
    <article
      className="nk-card"
      style={{ "--cat-accent": pal.accent, "--cat-glow": pal.glow, "--cat-bg": pal.bg } as React.CSSProperties}
    >
      {/* Thumbnail */}
      <div className="nk-card__img" onClick={goToPlayer}>
        {!imgError ? (
          <img src={movie.thumbnail} alt={movie.title} loading="lazy"
            onError={() => setImgError(true)} />
        ) : (
          <div className="nk-card__img-fallback"><Film size={32} /></div>
        )}
        <div className="nk-card__img-overlay" />

        <AgeRatingBadge value={ageRating} />

        <span className="nk-card__cat-badge"
          style={{ color: pal.accent, borderColor: pal.accent + "55", background: pal.bg }}>
          <CatIcon size={9} /> {catLbl}
        </span>

        <span className="nk-card__meta-badge">
          {movie.year} · {movie.duration}
        </span>

        {movie.canDownload && (
          <span className="nk-card__dl-badge"><Download size={9} /> DL</span>
        )}

        <div className="nk-card__play-btn">
          <Play size={20} fill="currentColor" />
        </div>

        <span className="nk-card__views">
          <Eye size={9} /> {movie.views > 999 ? `${(movie.views / 1000).toFixed(1)}K` : movie.views}
        </span>
      </div>

      {/* Body */}
      <div className="nk-card__body">
        <h3 className="nk-card__title">{movie.title}</h3>
        <p className="nk-card__desc">{movie.description}</p>

        <div className="nk-card__rating">
          <StarRating value={rating} onVote={(n) => { void handleVote(n); }} voted={voted} />
          <span className="nk-card__score" style={{ color: pal.accent }}>{rating.toFixed(1)}</span>
          <span className="nk-card__votes">({votes.toLocaleString("es")})</span>
          {voted && <span className="nk-card__voted"><Check size={9} /> Votado</span>}
          {!isAuthenticated && <span className="nk-card__hint">Inicia sesión para votar</span>}
        </div>

        <div className="nk-card__actions">
          <button
            type="button"
            className="nk-card__action-main"
            onClick={goToPlayer}
            style={{ background: pal.bg, borderColor: pal.accent + "66", color: pal.accent }}
          >
            <Play size={12} fill="currentColor" /> Ver
          </button>

          <button type="button" className="nk-card__action-sec" onClick={() => onShare(movie)}>
            <Share2 size={12} />
          </button>

          {movie.canDownload && (
            <button
              type="button"
              className="nk-card__action-sec"
              onClick={() => { void handleDownload(); }}
              disabled={downloading}
            >
              <Download size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="nk-card__accent-line" style={{ background: pal.accent }} />
    </article>
  );
}

/* ══════════════════════════════════════════════════
   Pagination
   ══════════════════════════════════════════════════ */
function Pagination({ page, totalPages, total, limit, onPageChange }: {
  page: number; totalPages: number; total: number; limit: number;
  onPageChange: (p: number) => void;
}) {
  const [gotoVal, setGotoVal] = useState("");

  const pages = (): (number | "…")[] => {
    const out: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) out.push(i);
      else if (out[out.length - 1] !== "…") out.push("…");
    }
    return out;
  };

  const handleGoto = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const n = parseInt(gotoVal, 10);
    if (n >= 1 && n <= totalPages) { onPageChange(n); setGotoVal(""); }
  };

  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="nk-pager">
      <span className="nk-pager__info">
        <strong>{from}–{to}</strong> / <strong>{total}</strong>
      </span>
      <div className="nk-pager__nums">
        <button type="button" className="nk-pager__nav" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={14} />
        </button>
        {pages().map((p, i) =>
          p === "…" ? (
            <span key={`el-${i}`} className="nk-pager__ellipsis">…</span>
          ) : (
            <button type="button" key={p}
              className={`nk-pager__num ${p === page ? "active" : ""}`}
              onClick={() => p !== page && onPageChange(p as number)}
            >{p}</button>
          )
        )}
        <button type="button" className="nk-pager__nav" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="nk-pager__goto">
        <span>Ir a</span>
        <input type="number" min={1} max={totalPages} value={gotoVal} placeholder={String(page)}
          onChange={(e) => setGotoVal(e.target.value)} onKeyDown={handleGoto}
          aria-label="Ir a página" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PAGE PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function PeliculasPage() {
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();

  const [movies,     setMovies]     = useState<MovieItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [category,  setCategory]  = useState("all");
  const [ageRating, setAgeRating] = useState<AgeRating>("all");
  const [search,    setSearch]    = useState("");
  const [sort,      setSort]      = useState("newest");
  const [page,      setPage]      = useState(1);

  const [shareMovie, setShareMovie] = useState<MovieItem | null>(null);
  const [toasts,     setToasts]     = useState<ToastItem[]>([]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const catalogRef  = useRef<HTMLElement>(null);

  const load = useCallback(
    async (cat: string, age: AgeRating, srch: string, pg: number, srt: string) => {
      setLoading(true); setError(null);
      try {
        const data = await apiFetchMovies(
          { category: cat, ageRating: age, search: srch, page: pg, sort: srt },
          token,
        );
        setMovies(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (authLoading) return;
    void load(category, ageRating, search, page, sort);
  }, [category, ageRating, page, sort, authLoading]);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      void load(category, ageRating, v, 1, sort);
    }, 420);
  };

  const handleCategory  = (cat: string)    => { setCategory(cat);  setPage(1); };
  const handleAgeRating = (age: AgeRating) => { setAgeRating(age); setPage(1); };
  const handleSort      = (s: string)      => { setSort(s);        setPage(1); };

  const addToast = (msg: string, type: ToastItem["type"] = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  const scrollToCatalog = () =>
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const displayName = user?.displayName || user?.username || null;

  return (
    <main className="nk-page">

      {/* HERO */}
      <HeroSection total={total} onExplore={scrollToCatalog} />

      {/* WELCOME */}
      {isAuthenticated && user && (
        <div className="nk-welcome">
          {user.avatarUrl && <img src={user.avatarUrl} alt="" className="nk-welcome__av" />}
          <div className="nk-welcome__text">
            <span className="nk-welcome__name">{displayName}</span>
            <span className="nk-welcome__role">{user.role}</span>
            {user.subscription?.active && (
              <span className="nk-welcome__plan">{user.subscription.type.toUpperCase()}</span>
            )}
            <span className="nk-welcome__role">
              <a href="/" className="rp-topbar__back" title="Ir al inicio" aria-label="Inicio">
                <House size={15} />
              </a>
            </span>
          </div>
        </div>
      )}

      {/* CATALOG */}
      <section className="nk-catalog" ref={catalogRef}>
        <div className="nk-catalog__head">
          <div className="nk-catalog__heading">
            <h2 className="nk-catalog__h2">Catálogo</h2>
            <span className="nk-catalog__count">{loading ? "…" : total} películas</span>
          </div>
          <div className="nk-catalog__controls">
            <div className="nk-search">
              <Search size={13} className="nk-search__icon" />
              <input className="nk-search__input" placeholder="Buscar título…"
                value={search} onChange={(e) => handleSearch(e.target.value)}
                aria-label="Buscar película" />
            </div>
            <select className="nk-sort" value={sort} onChange={(e) => handleSort(e.target.value)}>
              <option value="newest">Más nuevas</option>
              <option value="popular">Más vistas</option>
              <option value="rating">Mejor rating</option>
            </select>
          </div>
        </div>

        {/* Filtros de categoría */}
        <div className="nk-filters">
          {CATEGORIES.map(({ key, label, Icon }) => {
            const pal    = CAT_PALETTE[key];
            const active = category === key;
            return (
              <button type="button" key={key}
                className={`nk-filter ${active ? "nk-filter--active" : ""}`}
                onClick={() => handleCategory(key)}
                style={active && pal ? {
                  borderColor: pal.accent, color: pal.accent,
                  background: pal.bg, boxShadow: `0 0 12px ${pal.glow}`,
                } : {}}
              >
                <Icon size={11} /> {label}
              </button>
            );
          })}
        </div>

        {/* Filtros de clasificación por edad */}
        <div className="nk-filters" style={{ marginTop: 6 }}>
          {AGE_RATING_FILTERS.map(({ key, label }) => {
            const meta   = AGE_RATING_META[key];
            const active = ageRating === key;
            return (
              <button
                type="button"
                key={key}
                className={`nk-filter ${active ? "nk-filter--active" : ""}`}
                onClick={() => handleAgeRating(key)}
                style={active ? {
                  borderColor: meta.color,
                  color:       meta.color,
                  background:  `${meta.color}14`,
                  boxShadow:   `0 0 12px ${meta.color}33`,
                } : {}}
              >
                {key !== "all" && (
                  <span style={{
                    display:        "inline-flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    width:          18,
                    height:         18,
                    borderRadius:   4,
                    background:     active ? meta.color : "currentColor",
                    color:          active ? "#fff" : "transparent",
                    fontSize:       9,
                    fontWeight:     700,
                    marginRight:    2,
                    outline:        active ? "none" : `1.5px solid currentColor`,
                  }}>
                    {meta.short}
                  </span>
                )}
                {label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className={`nk-grid ${loading ? "nk-grid--busy" : ""}`}>
          {error ? (
            <div className="nk-grid__empty">
              <AlertCircle size={32} /><span>{error}</span>
            </div>
          ) : (authLoading || (loading && movies.length === 0)) ? (
            <div className="nk-grid__spinner"><div className="nk-spinner" /></div>
          ) : movies.length === 0 ? (
            <div className="nk-grid__empty">
              <Film size={32} /><span>Sin resultados para esta búsqueda</span>
            </div>
          ) : (
            movies.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                token={token}
                isAuthenticated={isAuthenticated}
                onShare={setShareMovie}
                onToast={addToast}
              />
            ))
          )}
        </div>

        <Pagination
          page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE}
          onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      </section>

      {/* Modales */}
      {shareMovie && <ShareModal movie={shareMovie} onClose={() => setShareMovie(null)} />}

      <ToastContainer items={toasts} />
    </main>
  );
}
