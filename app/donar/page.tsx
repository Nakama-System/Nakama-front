"use client";

import { useState, useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  Zap,
  Heart,
  CreditCard,
  AtSign,
  Hash,
  Link,
  ExternalLink,
} from "lucide-react";

// ════════════════════════════════════
//  ⚙️  CONFIGURÁ TUS DATOS AQUÍ
// ════════════════════════════════════
const DATOS = {
  mpAlias: "TU.ALIAS.MP",
  mpCvu:   "0000003100000000000000",
  ppEmail: "tu@email.com",
  ppLink:  "paypal.me/TuUsuario",
};
// ════════════════════════════════════

type RevealKey = "mpAlias" | "mpCvu" | "ppEmail" | "ppLink";

// ── Tipos de los sub-componentes ──────────────────────────────────────────────

interface BadgeProps {
  label: string;
  variant?: "ars" | "usd" | "default";
}

interface DataRowProps {
  label: string;
  value: string;
  icon: ReactNode;
  revealed: boolean;
  copied: boolean;
  onReveal: () => void;
  onCopy: () => void;
}

interface DividerProps {
  idx: number;
  addRef: (el: HTMLDivElement | null, idx: number) => void;
  revealStyle: (idx: number) => CSSProperties;
}

interface CardProps {
  idx: number;
  addRef: (el: HTMLDivElement | null, idx: number) => void;
  revealStyle: (idx: number) => CSSProperties;
  accentColor: string;
  hoverBorder: string;
  hoverShadow: string;
  children: ReactNode;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DonarPage() {
  const [revealed, setRevealed] = useState<Record<RevealKey, boolean>>({
    mpAlias: false,
    mpCvu:   false,
    ppEmail: false,
    ppLink:  false,
  });
  const [copied, setCopied]   = useState<RevealKey | null>(null);
  const [toast, setToast]     = useState(false);
  const [visible, setVisible] = useState<number[]>([]);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const idx = parseInt(el.dataset.idx ?? "0", 10);
            setVisible((prev) => [...new Set([...prev, idx])]);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.08 }
    );
    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = (el: HTMLElement | null, idx: number) => {
    if (el) {
      el.dataset.idx = String(idx);
      itemRefs.current[idx] = el;
    }
  };

  const addDivRef = (el: HTMLDivElement | null, idx: number) => addRef(el, idx);

  const isVisible = (idx: number) => visible.includes(idx);

  const revealStyle = (idx: number): CSSProperties => ({
    opacity:    isVisible(idx) ? 1 : 0,
    transform:  isVisible(idx) ? "translateY(0)" : "translateY(22px)",
    transition: `opacity 0.5s ease ${idx * 0.08}s, transform 0.5s ease ${idx * 0.08}s`,
  });

  const toggleReveal = (key: RevealKey) =>
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));

  const copiar = (key: RevealKey, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setToast(true);
      setTimeout(() => setCopied(null), 2000);
      setTimeout(() => setToast(false), 2400);
    });
  };

  const abrirApp = (appUrl: string, webUrl: string) => {
    const now = Date.now();
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    try { iframe.src = appUrl; } catch (_) {}
    setTimeout(() => {
      document.body.removeChild(iframe);
      if (Date.now() - now < 1500) window.open(webUrl, "_blank");
    }, 1400);
  };

  const ppUser = DATOS.ppLink.replace("paypal.me/", "");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;600;700;900&display=swap');

        :root {
          --black:   #0d0d0d;
          --card:    #16161f;
          --border:  #2a2a3a;
          --red:     #e63946;
          --red2:    #ff6b6b;
          --gold:    #ffd166;
          --white:   #f0eff4;
          --muted:   #8888aa;
          --mp:      #009ee3;
          --pp-blue: #003087;
          --pp-gold: #ffc439;
          --green:   #4ade80;
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: var(--black);
          color: var(--white);
          font-family: 'Nunito', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .bg-layer {
          position: relative;
          min-height: 100vh;
        }
        .bg-layer::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(230,57,70,.08) 0%, transparent 45%),
            radial-gradient(circle at 85% 80%, rgba(76,201,240,.06) 0%, transparent 45%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232a2a3a' fill-opacity='0.22'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .wrapper {
          position: relative; z-index: 1;
          max-width: 680px; margin: 0 auto;
          padding: 40px 20px 80px;
        }

        .logo-kanji {
          font-family: 'Bangers', cursive;
          font-size: 50px; line-height: 1;
          color: var(--red);
          text-shadow: 3px 3px 0 rgba(230,57,70,.3), 0 0 30px rgba(230,57,70,.4);
          letter-spacing: 2px;
        }

        .logo-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--gold); box-shadow: 0 0 12px var(--gold);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.5); opacity: .7; }
        }

        .totoro-gif {
          width: 128px; height: 128px; object-fit: contain;
          border-radius: 50%; border: 3px solid var(--border);
          background: rgba(255,255,255,.03);
          box-shadow: 0 0 32px rgba(76,201,240,.14), 0 0 0 6px rgba(230,57,70,.06);
          padding: 4px;
          animation: floatUp 3s ease-in-out infinite;
        }

        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }

        .hero-title {
          font-family: 'Bangers', cursive;
          font-size: clamp(32px, 7vw, 50px);
          letter-spacing: 2px; line-height: 1.1;
          background: linear-gradient(135deg, var(--white) 0%, var(--gold) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .card-title {
          font-family: 'Bangers', cursive;
          font-size: 26px; letter-spacing: 1px; line-height: 1;
        }

        .blurred   { filter: blur(5px); cursor: pointer; user-select: none; transition: filter .3s; }
        .unblurred { filter: none; transition: filter .3s; }

        .cta-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 15px 24px; border-radius: 14px;
          font-family: 'Bangers', cursive; font-size: 19px; letter-spacing: 2px;
          cursor: pointer; text-decoration: none; border: none;
          transition: transform .2s, opacity .2s;
        }
        .cta-btn:hover  { transform: scale(1.02); opacity: .9; }
        .cta-btn:active { transform: scale(.98); }

        .btn-mp { background: linear-gradient(135deg,#009ee3,#0077b6); color:#fff; box-shadow: 0 8px 24px rgba(0,158,227,.28); }
        .btn-pp { background: linear-gradient(135deg,#ffc439,#f0a500); color: var(--pp-blue); box-shadow: 0 8px 24px rgba(255,196,57,.22); }

        .icon-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          background: none; cursor: pointer;
          border-radius: 8px; padding: 4px 9px; font-size: 10px;
          font-family: 'Nunito', sans-serif; font-weight: 700;
          transition: border-color .2s, color .2s; flex-shrink: 0; white-space: nowrap;
        }

        .toast-bar {
          position: fixed; bottom: 28px; left: 50%;
          transform: translateX(-50%) translateY(80px);
          background: #1a1a2e; border: 1px solid var(--green); color: var(--green);
          padding: 11px 22px; border-radius: 50px;
          font-size: 13px; font-weight: 700; z-index: 999;
          transition: transform .35s cubic-bezier(.34,1.56,.64,1);
          white-space: nowrap; pointer-events: none;
          display: flex; align-items: center; gap: 6px;
        }
        .toast-bar.show { transform: translateX(-50%) translateY(0); }

        @media (max-width: 480px) {
          .data-row-inner { flex-wrap: wrap; }
        }
      `}</style>

      <div className="bg-layer">
        <div className="wrapper">

          {/* ── HEADER ── */}
          <div
            ref={(el) => addRef(el, 0)}
            style={{ textAlign: "center", marginBottom: 44, ...revealStyle(0) }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span className="logo-kanji">仲間</span>
              <div className="logo-dot" />
              <span className="logo-kanji" style={{ color: "var(--gold)", fontSize: 36, letterSpacing: 4 }}>
                NAKAMA
              </span>
            </div>

            <div style={{
              fontFamily: "'Bangers', cursive", fontSize: 12,
              letterSpacing: 6, color: "var(--muted)", textTransform: "uppercase",
              marginBottom: 22, display: "block",
            }}>
              Comunidad · Anime · Cultura
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
              <img
                className="totoro-gif"
                src="https://media.giphy.com/media/IwTWTsUzmIicM/giphy.gif"
                alt="Totoro saludando"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://media1.giphy.com/media/IwTWTsUzmIicM/200.gif";
                }}
              />
            </div>

            <h1 className="hero-title" style={{ marginBottom: 14 }}>
              Apoyá el proyecto
            </h1>
            <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.8, maxWidth: 500, margin: "0 auto" }}>
              Nakama es una comunidad hecha con pasión, tiempo y amor por el anime.
              <br />
              Si disfrutás lo que hacemos,{" "}
              <span style={{ color: "var(--red2)", fontWeight: 800 }}>una donación — desde $1</span>
              {" "}— nos ayuda a seguir creciendo para vos.
            </p>
          </div>

          {/* ── DIVIDER ── */}
          <Divider idx={1} addRef={addDivRef} revealStyle={revealStyle} />

          <p
            ref={(el) => addRef(el, 2)}
            style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 4,
              textTransform: "uppercase", color: "var(--muted)",
              textAlign: "center", marginBottom: 18,
              ...revealStyle(2),
            }}
          >
            Elegí cómo donar
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

            {/* ══ MERCADO PAGO ══ */}
            <Card
              idx={3}
              addRef={addDivRef}
              revealStyle={revealStyle}
              accentColor="var(--mp)"
              hoverBorder="rgba(0,158,227,.5)"
              hoverShadow="0 16px 40px rgba(0,158,227,.12)"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 14, flexShrink: 0,
                  background: "rgba(0,158,227,.13)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <MpLogo />
                </div>
                <div>
                  <div className="card-title" style={{ color: "var(--mp)" }}>Mercado Pago</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    Argentina · Pesos y Dólares
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
                <Badge label="Pesos ARS" variant="ars" />
                <Badge label="USD" variant="usd" />
                <Badge label="Desde $1" />
                <Badge label="Al instante" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <DataRow
                  label="Alias"
                  value={DATOS.mpAlias}
                  icon={<AtSign size={13} />}
                  revealed={revealed.mpAlias}
                  copied={copied === "mpAlias"}
                  onReveal={() => toggleReveal("mpAlias")}
                  onCopy={() => copiar("mpAlias", DATOS.mpAlias)}
                />
                <DataRow
                  label="CVU"
                  value={DATOS.mpCvu}
                  icon={<Hash size={13} />}
                  revealed={revealed.mpCvu}
                  copied={copied === "mpCvu"}
                  onReveal={() => toggleReveal("mpCvu")}
                  onCopy={() => copiar("mpCvu", DATOS.mpCvu)}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  className="cta-btn btn-mp"
                  onClick={() => abrirApp(
                    `mercadopago://send?alias=${encodeURIComponent(DATOS.mpAlias)}`,
                    "https://www.mercadopago.com.ar/cobros"
                  )}
                >
                  <CreditCard size={20} />
                  Abrir Mercado Pago
                  <ExternalLink size={15} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 11, lineHeight: 1.6 }}>
                Sin comisión para quien recibe · En celular abre la app automáticamente
              </p>
            </Card>

            {/* ══ PAYPAL ══ */}
            <Card
              idx={4}
              addRef={addDivRef}
              revealStyle={revealStyle}
              accentColor="var(--pp-gold)"
              hoverBorder="rgba(255,196,57,.5)"
              hoverShadow="0 16px 40px rgba(255,196,57,.12)"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 14, flexShrink: 0,
                  background: "rgba(0,48,135,.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <PpLogo />
                </div>
                <div>
                  <div className="card-title" style={{ color: "var(--pp-gold)" }}>PayPal</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    Internacional · Desde cualquier país
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
                <Badge label="USD" variant="usd" />
                <Badge label="Internacional" />
                <Badge label="Desde $1 USD" />
                <Badge label="Sin cuenta PayPal" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <DataRow
                  label="Email"
                  value={DATOS.ppEmail}
                  icon={<AtSign size={13} />}
                  revealed={revealed.ppEmail}
                  copied={copied === "ppEmail"}
                  onReveal={() => toggleReveal("ppEmail")}
                  onCopy={() => copiar("ppEmail", DATOS.ppEmail)}
                />
                <DataRow
                  label="Link"
                  value={DATOS.ppLink}
                  icon={<Link size={13} />}
                  revealed={revealed.ppLink}
                  copied={copied === "ppLink"}
                  onReveal={() => toggleReveal("ppLink")}
                  onCopy={() => copiar("ppLink", DATOS.ppLink)}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  className="cta-btn btn-pp"
                  onClick={() => abrirApp(
                    `paypal://paypalme/${ppUser}`,
                    `https://www.paypal.me/${ppUser}`
                  )}
                >
                  <Globe size={20} />
                  Abrir PayPal
                  <ExternalLink size={15} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 11, lineHeight: 1.6 }}>
                Acepta tarjetas sin cuenta · ~5% comisión al donante · Recibo dólares de cualquier país
              </p>
            </Card>
          </div>

          {/* ── FOOTER ── */}
          <div
            ref={(el) => addRef(el, 5)}
            style={{
              textAlign: "center", marginTop: 48, padding: "30px 24px",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 24, position: "relative", overflow: "hidden",
              ...revealStyle(5),
            }}
          >
            <div style={{
              position: "absolute", fontSize: 180, right: -30, top: -30,
              opacity: 0.03, color: "var(--red)", pointerEvents: "none", lineHeight: 1,
            }}>♥</div>
            <h3 style={{
              fontFamily: "'Bangers', cursive", fontSize: 28,
              letterSpacing: 1, color: "var(--gold)", marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Heart size={24} color="var(--gold)" fill="var(--gold)" />
              ¿Por qué donar?
            </h3>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.85, maxWidth: 460, margin: "0 auto" }}>
              Nakama no tiene publicidad ni muros de pago.
              <br />
              Todo va directo a{" "}
              <strong style={{ color: "var(--white)" }}>servidores, herramientas y tiempo</strong>
              {" "}para hacer la comunidad mejor.
              <br /><br />
              No es obligación — es un{" "}
              <strong style={{ color: "var(--white)" }}>reconocimiento al trabajo</strong>
              {" "}hecho con amor por el anime. Cada peso o dólar importa. ありがとう
            </p>
          </div>

        </div>
      </div>

      {/* ── TOAST ── */}
      <div className={`toast-bar${toast ? " show" : ""}`}>
        <Check size={14} />
        ¡Copiado al portapapeles!
      </div>
    </>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Divider({ idx, addRef, revealStyle }: DividerProps) {
  return (
    <div
      ref={(el) => addRef(el, idx)}
      style={{ display: "flex", alignItems: "center", gap: 16, margin: "30px 0", ...revealStyle(idx) }}
    >
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,var(--border),transparent)" }} />
      <Zap size={16} color="var(--gold)" style={{ filter: "drop-shadow(0 0 6px rgba(255,209,102,.6))" }} />
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,var(--border),transparent)" }} />
    </div>
  );
}

function Card({ idx, addRef, revealStyle, accentColor, hoverBorder, hoverShadow, children }: CardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={(el) => addRef(el, idx)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--card)",
        border: `1px solid ${hovered ? hoverBorder : "var(--border)"}`,
        borderRadius: 22,
        padding: 26,
        position: "relative",
        overflow: "hidden",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? hoverShadow : "none",
        transition: "transform .25s, border-color .25s, box-shadow .25s",
        ...revealStyle(idx),
      }}
    >
      {/* accent top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: accentColor, borderRadius: "22px 22px 0 0",
      }} />
      {children}
    </div>
  );
}

function Badge({ label, variant = "default" }: BadgeProps) {
  const styles: Record<string, CSSProperties> = {
    ars:     { borderColor: "rgba(0,158,227,.4)",   color: "var(--mp)",   background: "rgba(0,158,227,.08)" },
    usd:     { borderColor: "rgba(255,209,102,.4)", color: "var(--gold)", background: "rgba(255,209,102,.08)" },
    default: { borderColor: "var(--border)",        color: "var(--muted)" },
  };
  const s = styles[variant];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "4px 10px",
      borderRadius: 20, border: `1px solid ${s.borderColor}`,
      color: s.color, background: (s.background as string) ?? "transparent",
    }}>
      {label}
    </span>
  );
}

function DataRow({ label, value, icon, revealed, copied, onReveal, onCopy }: DataRowProps) {
  return (
    <div
      className="data-row-inner"
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,.04)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "10px 14px",
      }}
    >
      {/* label + icon */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, minWidth: 62 }}>
        <span style={{ color: "var(--muted)", display: "flex" }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)" }}>
          {label}
        </span>
      </div>

      {/* value */}
      <span
        className={revealed ? "unblurred" : "blurred"}
        style={{ fontSize: 13, fontWeight: 700, color: "var(--white)", flex: 1, wordBreak: "break-all" }}
        onClick={revealed ? undefined : onReveal}
      >
        {value}
      </span>

      {/* reveal button */}
      <button
        onClick={onReveal}
        className="icon-btn"
        style={{
          border: `1px solid ${revealed ? "var(--green)" : "var(--border)"}`,
          color: revealed ? "var(--green)" : "var(--muted)",
        }}
        aria-label={revealed ? "Ocultar" : "Ver"}
      >
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
        {revealed ? "Ocultar" : "Ver"}
      </button>

      {/* copy button */}
      <button
        onClick={onCopy}
        className="icon-btn"
        style={{
          border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`,
          color: copied ? "var(--green)" : "var(--muted)",
        }}
        aria-label="Copiar"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "OK" : "Copiar"}
      </button>
    </div>
  );
}

// ── Logos SVG de marca ─────────────────────────────────────────────────────────

function MpLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" aria-label="Mercado Pago">
      <path d="M24 8C14.06 8 6 16.06 6 26" stroke="#009ee3" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M24 8C33.94 8 42 16.06 42 26" stroke="#009ee3" strokeWidth="4.5" strokeLinecap="round" strokeOpacity="0.4" />
      <circle cx="24" cy="26" r="6.5" fill="#009ee3" />
      <path d="M15 37c2.4 2.6 5.8 4.2 9.5 4.2s7.1-1.6 9.5-4.2" stroke="#009ee3" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function PpLogo() {
  return (
    <svg width="40" height="26" viewBox="0 0 124 33" fill="none" aria-label="PayPal">
      <path d="M46.2 6.7H39.4a.95.95 0 0 0-.94.8L35.7 25a.57.57 0 0 0 .56.66h3.27a.95.95 0 0 0 .94-.8l.75-4.73a.95.95 0 0 1 .94-.8h2.16c4.5 0 7.1-2.18 7.78-6.5.31-1.89.01-3.37-.87-4.41C50.2 7.3 48.49 6.7 46.2 6.7zm.79 6.4c-.37 2.45-2.25 2.45-4.06 2.45h-1.03l.72-4.58a.57.57 0 0 1 .56-.48h.47c1.24 0 2.4 0 3 .7.36.42.47 1.04.34 1.91z" fill="#253B80"/>
      <path d="M66.65 13.07h-3.27a.57.57 0 0 0-.56.48l-.15.92-.23-.33c-.71-1.03-2.29-1.37-3.87-1.37-3.62 0-6.71 2.74-7.31 6.59-.31 1.92.13 3.75 1.22 5.03 1 1.18 2.43 1.67 4.12 1.67 2.92 0 4.54-1.88 4.54-1.88l-.15.91a.57.57 0 0 0 .56.66h2.95a.95.95 0 0 0 .94-.8l1.77-11.21a.57.57 0 0 0-.56-.67zm-4.57 6.37c-.31 1.87-1.8 3.13-3.69 3.13-.95 0-1.71-.3-2.2-.88-.48-.57-.67-1.39-.51-2.3.3-1.86 1.8-3.15 3.67-3.15.93 0 1.69.31 2.18.89.5.59.7 1.41.55 2.31z" fill="#253B80"/>
      <path d="M84.1 13.07h-3.29a.95.95 0 0 0-.79.42l-4.54 6.69-1.92-6.43a.95.95 0 0 0-.91-.68h-3.23a.57.57 0 0 0-.54.75l3.62 10.64-3.41 4.81a.57.57 0 0 0 .47.9h3.29a.95.95 0 0 0 .78-.41l10.95-15.8a.57.57 0 0 0-.47-.9z" fill="#253B80"/>
      <path d="M95 6.7h-6.84a.95.95 0 0 0-.94.8L84.45 25a.57.57 0 0 0 .56.66h3.5a.67.67 0 0 0 .66-.56l.78-4.97a.95.95 0 0 1 .94-.8h2.16c4.5 0 7.1-2.18 7.78-6.5.31-1.89.01-3.37-.87-4.41C98.98 7.3 97.27 6.7 95 6.7zm.79 6.4c-.37 2.45-2.25 2.45-4.06 2.45h-1.03l.72-4.58a.57.57 0 0 1 .56-.48h.47c1.24 0 2.4 0 3 .7.36.42.47 1.04.34 1.91z" fill="#179BD7"/>
      <path d="M115.44 13.07h-3.28a.57.57 0 0 0-.56.48l-.15.92-.23-.33c-.71-1.03-2.29-1.37-3.87-1.37-3.62 0-6.71 2.74-7.31 6.59-.31 1.92.13 3.75 1.22 5.03 1 1.18 2.43 1.67 4.12 1.67 2.92 0 4.54-1.88 4.54-1.88l-.15.91a.57.57 0 0 0 .56.66h2.95a.95.95 0 0 0 .94-.8l1.77-11.21a.57.57 0 0 0-.56-.67zm-4.57 6.37c-.31 1.87-1.8 3.13-3.69 3.13-.95 0-1.71-.3-2.2-.88-.48-.57-.67-1.39-.51-2.3.3-1.86 1.8-3.15 3.67-3.15.93 0 1.69.31 2.18.89.5.59.7 1.41.55 2.31z" fill="#179BD7"/>
      <path d="M119.3 7.23l-2.81 17.86a.57.57 0 0 0 .56.66h2.82c.47 0 .87-.34.94-.8l2.77-17.54a.57.57 0 0 0-.56-.66h-3.16a.57.57 0 0 0-.56.48z" fill="#179BD7"/>
      <path d="M7.27 29.15l.52-3.32-1.16-.03H1.06L4.93 1.29a.32.32 0 0 1 .31-.27h9.38c3.11 0 5.26.65 6.38 1.93.53.6.86 1.23 1.02 1.92.17.72.17 1.59.01 2.64l-.01.08v.68l.53.3c.44.24.8.53 1.06.81.45.51.74 1.16.86 1.94.13.79.09 1.74-.12 2.81-.24 1.23-.63 2.3-1.15 3.18a6.55 6.55 0 0 1-1.83 2.05 7.4 7.4 0 0 1-2.46 1.11c-.9.24-1.94.35-3.07.35h-.73c-.52 0-1.03.19-1.43.53a2.21 2.21 0 0 0-.74 1.33l-.06.3-.92 5.85-.04.22c-.01.07-.03.1-.06.12a.16.16 0 0 1-.1.04H7.27z" fill="#253B80"/>
      <path d="M23.05 7.67c-.03.18-.06.36-.1.55-1.24 6.35-5.47 8.54-10.87 8.54H9.33c-.66 0-1.22.48-1.32 1.13L6.6 26.83l-.4 2.53a.7.7 0 0 0 .69.81h4.88c.58 0 1.07-.42 1.16-.99l.05-.25.92-5.83.06-.32c.09-.57.58-.99 1.16-.99h.73c4.73 0 8.43-1.92 9.51-7.48.45-2.32.22-4.26-.98-5.62a4.67 4.67 0 0 0-1.33-1.02z" fill="#179BD7"/>
      <path d="M21.75 7.15a9.8 9.8 0 0 0-1.2-.27 15.3 15.3 0 0 0-2.43-.18H10.79a1.17 1.17 0 0 0-1.16.99L8.05 17.6l-.04.29a1.34 1.34 0 0 1 1.32-1.13h2.75c5.4 0 9.63-2.19 10.87-8.54.04-.19.07-.37.1-.55a6.6 6.6 0 0 0-1.02-.44 9.1 9.1 0 0 0-.28-.08z" fill="#222D65"/>
    </svg>
  );
}