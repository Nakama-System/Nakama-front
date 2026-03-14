"use client";

// ═══════════════════════════════════════════════════════════
// app/comunidad/page.tsx
// ═══════════════════════════════════════════════════════════

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import "../styles/comunidad-page.css";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/authContext";

const API = "http://localhost:5000";

// ── Types ──────────────────────────────────────────────────
interface Community {
  _id:         string;
  name:        string;
  description: string;
  avatarUrl:   string | null;
  coverUrl:    string | null;
  memberCount: number;
  likeCount:   number;
  theme:       string;
  isMember:    boolean;
  isAdmin:     boolean;
  createdAt:   string;
}

interface Pagination {
  page:  number;
  limit: number;
  total: number;
  pages: number;
}

type SortKey = "newest" | "popular" | "members";

const THEME_EMOJI: Record<string, string> = {
  dark:    "🌑", light:  "☀️", ocean:  "🌊",
  forest:  "🌲", sunset: "🌅", sakura: "🌸",
  neon:    "⚡",  gold:   "✨", galaxy: "🌌",
};

// ── Skeleton ───────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="com-skeleton">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="com-skeleton__card" style={{ animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );
}

// ── Community Card ─────────────────────────────────────────
function ComunidadCard({ c, index }: { c: Community; index: number }) {
  return (
    <article
      className="com-card"
      style={{ animationDelay: `${index * 0.06}s` }}
      aria-label={`Comunidad: ${c.name}`}
    >
      {/* Cover */}
      <div className="com-card__cover">
        {c.coverUrl ? (
          <img src={c.coverUrl} alt="" loading="lazy" />
        ) : (
          <div className="com-card__cover-placeholder">
            {THEME_EMOJI[c.theme] || "⚔"}
          </div>
        )}
        <span className="com-card__theme">{c.theme}</span>
        {c.isMember && (
          <span className="com-card__member-badge">✦ Miembro</span>
        )}
      </div>

      {/* Avatar */}
      <div className="com-card__avatar-wrap">
        {c.avatarUrl ? (
          <img className="com-card__avatar" src={c.avatarUrl} alt={c.name} />
        ) : (
          <div className="com-card__avatar-placeholder">
            {c.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="com-card__body">
        <h3 className="com-card__name" title={c.name}>{c.name}</h3>
        <p className="com-card__desc">
          {c.description || "Sin descripción aún."}
        </p>

        {/* Stats */}
        <div className="com-card__stats">
          <span className="com-card__stat">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {c.memberCount.toLocaleString()}
          </span>
          <span className="com-card__stat">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {c.likeCount.toLocaleString()}
          </span>
        </div>

        {/* CTA */}
        {c.isMember ? (
          <Link
            href={`/chat?comunidad=${c._id}`}
            className="com-card__btn com-card__btn--enter"
            aria-label={`Entrar a ${c.name}`}
          >
            Entrar
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <Link
            href={`/comunidad/${c._id}`}
            className="com-card__btn com-card__btn--explore"
            aria-label={`Explorar ${c.name}`}
          >
            Explorar
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
        )}
      </div>
    </article>
  );
}

// ── Pagination ─────────────────────────────────────────────
function Pagination({
  pagination,
  onPage,
}: {
  pagination: Pagination;
  onPage: (p: number) => void;
}) {
  const { page, pages } = pagination;
  if (pages <= 1) return null;

  const range: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      range.push(i);
    } else if (range[range.length - 1] !== "…") {
      range.push("…");
    }
  }

  return (
    <nav className="com-pagination" aria-label="Paginación">
      <button
        className="com-page-btn"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      {range.map((r, i) =>
        r === "…" ? (
          <span key={`ellipsis-${i}`} className="com-page-btn" style={{ cursor: "default" }}>…</span>
        ) : (
          <button
            key={r}
            className={`com-page-btn ${r === page ? "com-page-btn--active" : ""}`}
            onClick={() => onPage(r as number)}
            aria-current={r === page ? "page" : undefined}
          >
            {r}
          </button>
        ),
      )}
      <button
        className="com-page-btn"
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        aria-label="Página siguiente"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </nav>
  );
}

// ── Page ───────────────────────────────────────────────────
export default function ComunidadPage() {
  const { token } = useAuth();

  const [communities,  setCommunities]  = useState<Community[]>([]);
  const [pagination,   setPagination]   = useState<Pagination | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [debouncedQ,   setDebouncedQ]   = useState("");
  const [sort,         setSort]         = useState<SortKey>("newest");
  const [page,         setPage]         = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch
  const fetchComunidades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: "20",
        sort,
        ...(debouncedQ ? { search: debouncedQ } : {}),
      });

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/comunidadinicial?${params}`, { headers });
      if (!res.ok) throw new Error("Error al cargar comunidades");

      const json = await res.json();
      setCommunities(json.data || []);
      setPagination(json.pagination || null);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedQ, token]);

  useEffect(() => { fetchComunidades(); }, [fetchComunidades]);

  // Reset page on sort change
  const handleSort = (s: SortKey) => {
    setSort(s);
    setPage(1);
  };

  const SORT_LABELS: { key: SortKey; label: string }[] = [
    { key: "newest",  label: "Nuevas"   },
    { key: "popular", label: "Populares"},
    { key: "members", label: "Miembros" },
  ];

  return (
    <main className="com-page">
      <Navbar />

      {/* Hero */}
      <div className="com-hero">
        <div className="com-hero__bg" aria-hidden="true">
          <div className="com-hero__grid" />
        </div>
        <div className="com-hero__content">
          <div className="com-hero__eyebrow">
            <span className="com-hero__line" />
            <span className="com-hero__tag">Explorar</span>
            <span className="com-hero__line" />
          </div>
          <h1 className="com-hero__titulo">
            Comunidades <span>Nakama</span>
          </h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="com-toolbar">
        <div className="com-toolbar__inner">
          <div className="com-search">
            <svg className="com-search__icon" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="com-search__input"
              type="search"
              placeholder="Buscar comunidad…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar comunidad"
            />
          </div>
          <div className="com-sort" role="group" aria-label="Ordenar por">
            {SORT_LABELS.map(({ key, label }) => (
              <button
                key={key}
                className={`com-sort__btn ${sort === key ? "com-sort__btn--active" : ""}`}
                onClick={() => handleSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="com-state" role="alert">
          <span className="com-state__icon">⚠</span>
          <p className="com-state__title">Error</p>
          <p className="com-state__desc">{error}</p>
          <button className="com-sort__btn" onClick={fetchComunidades}>
            Reintentar
          </button>
        </div>
      ) : communities.length === 0 ? (
        <div className="com-state">
          <span className="com-state__icon">🔍</span>
          <p className="com-state__title">Sin resultados</p>
          <p className="com-state__desc">
            {debouncedQ
              ? `No hay comunidades que coincidan con "${debouncedQ}".`
              : "Aún no hay comunidades creadas."}
          </p>
        </div>
      ) : (
        <section className="com-grid-section" aria-label="Lista de comunidades">
          <p className="com-count">
            <strong>{pagination?.total ?? communities.length}</strong> comunidades encontradas
          </p>
          <div className="com-grid">
            {communities.map((c, i) => (
              <ComunidadCard key={c._id} c={c} index={i} />
            ))}
          </div>
          {pagination && (
            <Pagination pagination={pagination} onPage={setPage} />
          )}
        </section>
      )}
    </main>
  );
}