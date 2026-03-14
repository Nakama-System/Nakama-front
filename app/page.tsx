"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import "./styles/home.css";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/authContext";

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const personajes = [
  {
    id: 1,
    nombre: "Itachi Uchiha",
    descripcion:
      "Shinobi del clan Uchiha. Su poder trasciende el tiempo y la lealtad.",
    rol: "Estratega Oscuro",
    imagenUrl: "/assets/friends.jpg",
  },
  {
    id: 2,
    nombre: "Levi Ackerman",
    descripcion:
      "El soldado más fuerte de la humanidad. Frío, preciso, imparable.",
    rol: "Capitán de élite",
    imagenUrl: "/assets/samurai2.jpg",
  },
  {
    id: 3,
    nombre: "Gojo Satoru",
    descripcion:
      "El hechicero más poderoso. El infinito en su mirada lo dice todo.",
    rol: "Maestro Hechicero",
    imagenUrl: "/assets/samurai3.jpg",
  },
];

const SAMURAI_IMAGES = [
  "/assets/friends.jpg",
  "/assets/samurai2.jpg",
  "/assets/samurai.jpg",
];
const FADE_MS = 1000;
const INTERVAL_MS = 15000;

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────
function HeroSection() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const indexRef = useRef(0);
  const { isAuthenticated } = useAuth();

  // Stats reales desde el backend
  const [stats, setStats] = useState({ otakus: 0, series: 0, comunidades: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("https://nakama-vercel-backend.vercel.app/homestats");
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setStats({
          otakus: data.otakus ?? 0,
          series: data.series ?? 0,
          comunidades: data.comunidades ?? 0,
        });
      } catch {
        setStats({ otakus: 0, series: 0, comunidades: 0 });
      }
    };

    fetchStats();
  }, []);

  // Slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        indexRef.current = (indexRef.current + 1) % SAMURAI_IMAGES.length;
        setIndex(indexRef.current);
        setVisible(true);
      }, FADE_MS);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Formatea números: 12000 → "12K+"
  const fmt = (n: number): string => {
    if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
    return n.toString();
  };

  return (
    <section className="hero" aria-labelledby="hero-titulo">
      <div className="hero__bg">
        <div className="hero__overlay" />
        <div className="hero__samurai-wrapper" aria-hidden="true">
          <Image
            src={SAMURAI_IMAGES[index]}
            alt=""
            fill
            className="hero__samurai-img"
            priority
            style={{
              opacity: visible ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease`,
            }}
          />
        </div>
        <div className="hero__nakama-reveal" aria-hidden="true">
          <span className="hero__nakama-text">NAKAMA</span>
        </div>
        <div className="hero__particles" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={`hero__particle hero__particle--${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="hero__content">
        <div className="hero__eyebrow">
          <span className="hero__line" />
          <span className="hero__tag">Plataforma Social Otaku</span>
          <span className="hero__line" />
        </div>
        <h1 id="hero-titulo" className="hero__titulo">
          Bienvenido al
          <br />
          <span className="hero__titulo-accent">Mundo Otaku</span>
        </h1>
        <p className="hero__subtitulo">
          Conectá con tu tribu.
          <br />
          <em>Anime. Gamer. Cultura Geek.</em>
        </p>
        <div className="hero__acciones">
          <Link
            href={isAuthenticated ? "/chat" : "/login"}
            className="btn btn--primary"
          >
            <span>Entrar ahora</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href={"/comunidad-page"} className="btn btn--secondary">
            Explorar comunidad
          </Link>
        </div>
        <div className="hero__stats" aria-label="Estadísticas de la comunidad">
          <div className="hero__stat">
            <strong>{fmt(stats.otakus)}</strong>
            <span>Otakus</span>
          </div>
          <div className="hero__stat-divider" aria-hidden="true" />
          <div className="hero__stat">
            <strong>{fmt(stats.series)}</strong>
            <span>Series</span>
          </div>
          <div className="hero__stat-divider" aria-hidden="true" />
          <div className="hero__stat">
            <strong>{fmt(stats.comunidades)}</strong>
            <span>Comunidades</span>
          </div>
        </div>
        <div className="hero__dots" aria-hidden="true">
          {SAMURAI_IMAGES.map((_, i) => (
            <span
              key={i}
              className={`hero__dot ${i === index ? "hero__dot--active" : ""}`}
            />
          ))}
        </div>
      </div>
      <div className="hero__scroll-hint" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Personajes
// ─────────────────────────────────────────────
function PersonajesSection() {
  return (
    <section className="personajes" aria-labelledby="personajes-titulo">
      <div className="personajes__header">
        <span className="section-tag">Personajes Legendarios</span>
        <h2 id="personajes-titulo" className="section-titulo">
          Los iconos del anime
        </h2>
        <p className="section-desc">
          Elegí tu personaje favorito y conectá con fans que comparten tu
          pasión.
        </p>
      </div>
      <div className="personajes__grid">
        {personajes.map((p, i) => (
          <article
            key={p.id}
            className="card"
            style={{ animationDelay: `${i * 0.15}s` }}
            aria-label={`Personaje: ${p.nombre}`}
          >
            <div className="card__image-wrapper">
              <Image
                src={p.imagenUrl}
                alt={p.nombre}
                fill
                className="card__image"
                style={{ objectFit: "cover", objectPosition: "top" }}
              />
              <div className="card__glow" aria-hidden="true" />
            </div>
            <div className="card__body">
              <span className="card__rol">{p.rol}</span>
              <h3 className="card__nombre">{p.nombre}</h3>
              <p className="card__descripcion">{p.descripcion}</p>
              <button
                className="card__btn"
                aria-label={`Ver más sobre ${p.nombre}`}
              >
                Ver perfil
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────
function CTASection() {
  return (
    <section className="cta" aria-labelledby="cta-titulo">
      <div className="cta__bg" aria-hidden="true">
        <div className="cta__orb cta__orb--1" />
        <div className="cta__orb cta__orb--2" />
        <div className="cta__grid" />
      </div>
      <div className="cta__content">
        <span className="section-tag">Plan Premium</span>
        <h2 id="cta-titulo" className="cta__titulo">
          Tu historia
          <br />
          <span className="cta__titulo-accent">comienza ahora.</span>
        </h2>
        <p className="cta__desc">
          Accedé a contenido exclusivo, comunidades privadas, roles especiales y
          mucho más.
        </p>
        <div className="cta__features" role="list">
          {[
            "Comunidades exclusivas",
            "Contenido premium",
            "Rol verificado",
            "Sin publicidad",
          ].map((f) => (
            <div key={f} className="cta__feature" role="listitem">
              <span className="cta__check" aria-hidden="true">
                ✦
              </span>
              <span>{f}</span>
            </div>
          ))}
        </div>
        <Link href="/premium" className="btn btn--glow">
          <span>Suscribirme</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="footer__logo">NAKAMA</span>
          <p>La plataforma social para la cultura anime y gamer.</p>
        </div>
        <nav className="footer__nav" aria-label="Navegación del pie de página">
          <Link href="/about" className="footer__link">
            Nosotros
          </Link>
          <Link href="/terminos" className="footer__link">
            Términos
          </Link>
          <Link href="/privacidad" className="footer__link">
            Privacidad
          </Link>
          <Link href="/contacto" className="footer__link">
            Contacto
          </Link>
        </nav>
        <p className="footer__copy">
          © {new Date().getFullYear()} Nakama. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// Page — único export default
// ─────────────────────────────────────────────
export default function Home() {
  return (
    <main className="main">
      <Navbar />
      <HeroSection />
      <PersonajesSection />
      <CTASection />
      <Footer />
    </main>
  );
}
